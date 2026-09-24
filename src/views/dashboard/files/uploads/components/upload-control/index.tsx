import { DialogActionButton } from "@/components/ui/dialog-action-button"
import {
  ResponsiveDialogClose,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { useLocalAtom } from "@/hooks/use-local-atom"
import { UploadTask } from "./upload-task"
import { SweepShine } from "@/components/sweep-shine"
import { type Entry } from "../../store/queue"
import { useObjectTranslation } from "@/local/object"
import { type ReactNode, useCallback, useEffect, useRef } from "react"
import { useSetAtom } from "jotai"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  PauseIcon,
  LoaderCircleIcon,
  XIcon,
  ListIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { AnimatedSegmentedTabs } from "@/components/ui/animated-segmented-tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog"
import { type StorageConnection } from "@/views/dashboard/storage/api"
import {
  abortUpload,
  listUploads,
  uploadFile,
  shouldUseSingleUpload,
  type Upload,
} from "../../api"
import { progressAtom } from "../../store"

type UploadControlProps = {
  connections: StorageConnection[]
  defaultStorageId?: string
  defaultPrefix: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadControl({
  connections,
  defaultStorageId,
  defaultPrefix,
  open,
  onOpenChange,
}: UploadControlProps) {
  const tx = useObjectTranslation()
  const isMobile = useIsMobile()

  const enabled = connections.filter((item) => item.enabled)
  const preferred = enabled.some((item) => item.id === defaultStorageId)
    ? defaultStorageId!
    : ""
  const storageId = preferred
  const picker = useRef<HTMLInputElement>(null)
  const destination = useRef({ storageId, prefix: defaultPrefix })
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const [entries, setEntries] = useLocalAtom<Entry[]>([])
  const [filter, setFilter] = useLocalAtom("all")
  const dismissed = useRef(new Set<string>())
  const taskIds = useRef(new Map<string, string>())
  const transfer = useRef<Promise<void> | null>(null)
  const clearingRef = useRef(false)
  const [clearing, setClearing] = useLocalAtom(false)
  const [cancelling, setCancelling] = useLocalAtom<string | null>(null)
  const running = useRef<{ key: string; controller: AbortController } | null>(
    null,
  )
  const mounted = useRef(true)
  const setProgress = useSetAtom(progressAtom)
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ["uploads"],
    queryFn: ({ signal }) => listUploads(signal),
    enabled: open,
  })
  const update = useCallback(
    (key: string, patch: Partial<Entry>) => {
      setEntries((current) =>
        current.map((item) =>
          item.key === key ? { ...item, ...patch } : item,
        ),
      )
    },
    [setEntries],
  )
  useEffect(() => {
    if (!query.data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reconcile durable server tasks into the local file queue.
    setEntries((current) => {
      const ids = new Set(current.map((item) => item.id))
      return [
        ...current,
        ...query.data.items
          .filter(
            (item) => !ids.has(item.id) && !dismissed.current.has(item.id),
          )
          .map((item: Upload): Entry => ({
            key: item.id,
            id: item.id,
            name: item.original_filename,
            size: item.file_size,
            storageId: item.storage_id,
            single: item.method === "single",
            status: "paused",
            percent: 0,
            label:
              item.method === "single" ? "选择原文件重试" : "选择原文件续传",
            expiresAt: item.expires_at,
          })),
      ]
    })
  }, [query.data, setEntries])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      running.current?.controller.abort()
      setProgress(null)
      clearTimeout(closeTimer.current)
    }
  }, [setProgress])
  useEffect(() => {
    if (running.current || clearingRef.current) return
    const entry = entries.find((item) => item.status === "queued" && item.file)
    if (!entry?.file) return
    const controller = new AbortController()
    running.current = { key: entry.key, controller }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Starting the next network transfer updates the queue state.
    update(entry.key, { status: "uploading", label: "准备上传" })
    let instant = false
    transfer.current = uploadFile(
      entry.file,
      entry.id,
      controller.signal,
      (id, percent) => {
        if (!mounted.current) return
        taskIds.current.set(entry.key, id)
        update(entry.key, { id, percent })
        setProgress({ id, percent })
      },
      entry.storageId,
      (label) => {
        if (mounted.current) update(entry.key, { label })
      },
      () => {
        instant = true
      },
      entry.prefix,
    )
      .then(() => {
        if (mounted.current) {
          update(entry.key, {
            status: "completed",
            percent: 100,
            label: instant ? "秒传完成" : "上传完成",
            file: undefined,
          })
          void client.invalidateQueries({ queryKey: ["files"] })
          void client.invalidateQueries({ queryKey: ["storage-objects"] })
        }
      })
      .catch((error: unknown) => {
        if (mounted.current)
          update(entry.key, {
            status: controller.signal.aborted ? "paused" : "error",
            label: controller.signal.aborted
              ? entry.single
                ? "已停止，重试将重新上传"
                : "已暂停"
              : error instanceof Error
                ? error.message
                : "上传失败",
          })
      })
      .finally(() => {
        running.current = null
        if (mounted.current) {
          // A new array wakes the queue after the active slot is released.
          setEntries((current) => [...current])
          setProgress(null)
          void client.invalidateQueries({ queryKey: ["uploads"] })
        }
      })
  }, [entries, client, setProgress, setEntries, update])
  function addFiles(files: FileList | null) {
    if (!files || !destination.current.storageId || clearingRef.current) return
    const added = Array.from(files)
      .filter((file) => {
        if (!file.size) {
          toast.error(tx("{0}：暂不支持空文件", { 0: file.name }))
          return false
        }
        return true
      })
      .map((file): Entry => ({
        key: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        storageId: destination.current.storageId,
        single: shouldUseSingleUpload(file.size),
        prefix: destination.current.prefix,
        status: "queued",
        percent: 0,
        label: "等待上传",
      }))
    setEntries((current) => [...current, ...added])
    if (added.length) onOpenChange(true)
  }
  function pauseAll() {
    setEntries((current) =>
      current.map((item) =>
        item.status === "queued"
          ? { ...item, status: "paused", label: "已暂停" }
          : item,
      ),
    )
    running.current?.controller.abort()
  }
  async function cancel(entry: Entry) {
    if (entry.status === "uploading") return
    setCancelling(entry.key)
    try {
      if (entry.id && !["completed", "cancelled"].includes(entry.status))
        await abortUpload(entry.id)
      if (entry.id) dismissed.current.add(entry.id)
      setEntries((current) => current.filter((item) => item.key !== entry.key))
      void client.invalidateQueries({ queryKey: ["uploads"] })
      void client.invalidateQueries({ queryKey: ["files"] })
      void client.invalidateQueries({ queryKey: ["storage-objects"] })
    } catch (error) {
      const label = error instanceof Error ? error.message : "取消失败"
      update(entry.key, { status: "error", label })
      toast.error(tx(label))
    } finally {
      setCancelling(null)
    }
  }
  async function clearAll() {
    clearingRef.current = true
    setClearing(true)
    running.current?.controller.abort()
    await transfer.current
    try {
      for (const entry of entries) {
        const id = taskIds.current.get(entry.key) ?? entry.id
        await cancel({
          ...entry,
          id,
          status: entry.status === "uploading" ? "paused" : entry.status,
        })
      }
      setFilter("all")
    } finally {
      clearingRef.current = false
      setClearing(false)
    }
  }
  const visible = entries.filter(
    (item) =>
      filter === "all" ||
      (filter === "completed"
        ? item.status === "completed"
        : item.status !== "completed" && item.status !== "cancelled"),
  )
  const active = entries.some(
    (item) => item.status === "uploading" || item.status === "queued",
  )
  const queueBody = (
    <>
      {entries.length > 0 && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <AnimatedSegmentedTabs
            label={tx("上传队列")}
            value={filter}
            onValueChange={setFilter}
            listClassName="h-8"
            triggerClassName="px-2 text-xs"
            options={[
              { value: "all", label: tx("全部") },
              { value: "pending", label: tx("未完成") },
              { value: "completed", label: tx("已完成") },
            ]}
          />
          <div className="flex items-center gap-0.5">
            {active && (
              <Button
                size="icon-sm"
                variant="ghost"
                title={tx("全部暂停")}
                aria-label={tx("全部暂停")}
                disabled={clearing}
                onClick={pauseAll}
              >
                <PauseIcon />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              aria-busy={clearing}
              disabled={clearing || cancelling !== null}
              onClick={() => void clearAll()}
            >
              <SweepShine active={clearing}>{tx("清空")}</SweepShine>
            </Button>
          </div>
        </div>
      )}
      {query.error && (
        <p role="alert" className="text-xs text-destructive">
          {tx("未完成任务读取失败：")}
          {tx(query.error.message)}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void query.refetch()}
          >
            {tx("重试")}
          </Button>
        </p>
      )}
      <ul className="max-h-[45svh] divide-y overflow-y-auto">
        {visible.map((entry) => (
          <UploadTask
            key={entry.key}
            entry={entry}
            clearing={clearing}
            cancelling={cancelling}
            update={update}
            onPause={() => running.current?.controller.abort()}
            cancel={cancel}
          />
        ))}
      </ul>
      {!visible.length && !query.error && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {query.isPending
            ? tx("正在读取上传任务…")
            : tx(entries.length ? "当前筛选下没有上传任务" : "没有上传的任务")}
        </p>
      )}
    </>
  )
  const queueTrigger = (
    <Button
      size="icon-sm"
      className="relative"
      aria-label={tx("上传队列")}
      onPointerEnter={
        isMobile
          ? undefined
          : (event) => {
              if (event.pointerType === "mouse" && entries.length > 0) {
                clearTimeout(closeTimer.current)
                onOpenChange(true)
              }
            }
      }
      onPointerLeave={
        isMobile
          ? undefined
          : () => {
              closeTimer.current = setTimeout(() => onOpenChange(false), 250)
            }
      }
    >
      {active ? (
        <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" />
      ) : (
        <ListIcon />
      )}
      {active && (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary-foreground" />
      )}
    </Button>
  )
  const controls = (trigger: ReactNode) => (
    <ButtonGroup aria-label={tx("上传")}>
      <Button
        size="sm"
        disabled={!storageId || clearing}
        onClick={() => {
          destination.current = { storageId, prefix: defaultPrefix }
          picker.current?.click()
        }}
      >
        <UploadIcon data-icon="inline-start" aria-hidden="true" />
        {tx("上传")}
      </Button>
      <ButtonGroupSeparator />
      {trigger}
    </ButtonGroup>
  )
  const pickerInput = (
    <input
      ref={picker}
      type="file"
      multiple
      className="hidden"
      aria-label={tx("添加文件到上传队列")}
      onChange={(event) => {
        addFiles(event.target.files)
        event.target.value = ""
      }}
    />
  )

  if (isMobile) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        {controls(
          <ResponsiveDialogTrigger asChild>
            {queueTrigger}
          </ResponsiveDialogTrigger>,
        )}
        {pickerInput}
        <ResponsiveDialogContent className="max-h-[85svh]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{tx("上传队列")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="sr-only">
              {tx("上传队列")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="flex min-h-0 flex-col gap-1 p-3">
            {queueBody}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <DialogActionButton action="cancel" type="button">
                关闭
              </DialogActionButton>
            </ResponsiveDialogClose>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {controls(<PopoverTrigger asChild>{queueTrigger}</PopoverTrigger>)}
      {pickerInput}
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label={tx("上传队列")}
        className="w-[min(28rem,calc(100vw-1.5rem))] max-h-[min(75svh,var(--radix-popover-content-available-height))] overflow-y-auto gap-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={() => clearTimeout(closeTimer.current)}
        onPointerLeave={() => {
          closeTimer.current = setTimeout(() => onOpenChange(false), 250)
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">{tx("上传队列")}</span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={tx("关闭")}
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
          </Button>
        </div>
        {queueBody}
      </PopoverContent>
    </Popover>
  )
}
