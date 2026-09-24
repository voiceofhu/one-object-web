import { DialogActionButton } from "@/components/ui/dialog-action-button"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { objectColumns } from "./object-columns"
import { NameTooltip } from "./name-tooltip"
import { useLocalAtom } from "@/hooks/use-local-atom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { deleteStorageObjects } from "../api"
import { useEffect, useMemo, useRef } from "react"
import { atom, useAtom } from "jotai"
import { ImagePreviewDialog } from "./image-preview-dialog"
import { objectDownloadHref } from "../links"
import { useCurrentTime } from "@/hooks/use-current-time"
import { Trash2Icon, XIcon } from "lucide-react"
import { useObjectTranslation } from "@/local/object"
import { useTranslation } from "@/components/providers/language-context"
import { NoItems } from "@/components/async-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { type StorageObjectEntry } from "../api"

type ObjectDirectoryProps = {
  focusedKey?: string
  storageId: string
  canDelete: boolean
  items: StorageObjectEntry[]
  view: "folders" | "files"
  onOpenFolder: (prefix: string) => void
  onUpload?: () => void
}

const columnClasses: Record<string, string> = {
  selection: "w-8 pl-2 pr-0 text-left md:w-9 md:pl-3",
  name: "pl-1",
  kind: "w-20 text-muted-foreground md:w-24",
  size: "w-20 text-right tabular-nums md:w-24",
  modified: "w-36 text-xs text-muted-foreground md:w-44",
  actions: "sticky right-0 w-10 bg-background p-1 text-center md:w-12",
}

export function ObjectDirectory({
  items,
  focusedKey,
  storageId,
  canDelete,
  view,
  onOpenFolder,
  onUpload,
}: ObjectDirectoryProps) {
  const tx = useObjectTranslation()
  const { locale } = useTranslation()
  const now = useCurrentTime()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useLocalAtom<string[]>([])
  const [confirmKeys, setConfirmKeys] = useLocalAtom<string[] | null>(null)
  const [failures, setFailures] = useLocalAtom<
    { key: string; message: string }[]
  >([])
  const fileKeys = items
    .filter((item) => item.kind === "file")
    .map((item) => item.key)
  const selectedKeys = selected.filter((key) => fileKeys.includes(key))
  const deleting = useMutation({
    mutationFn: (keys: string[]) => deleteStorageObjects(storageId, keys),
    onSuccess: (result) => {
      setSelected(result.failed.map((item) => item.key))
      setFailures(result.failed)
      setConfirmKeys(null)
      if (result.failed.length) {
        toast.error(
          tx("已删除 {0} 个文件，{1} 个失败", {
            0: result.deleted.length,
            1: result.failed.length,
          }),
        )
      } else {
        toast.success(tx("已删除 {0} 个文件", { 0: result.deleted.length }))
      }
      void queryClient.invalidateQueries({
        queryKey: ["storage-objects", storageId],
      })
      void queryClient.invalidateQueries({ queryKey: ["files"] })
    },
    onError: (error) => toast.error(tx(error.message)),
  })
  const previewAtom = useMemo(() => atom<StorageObjectEntry | null>(null), [])
  const [preview, setPreview] = useAtom(previewAtom)
  const previewTrigger = useRef<HTMLAnchorElement | null>(null)
  const previewRequest = useRef(0)
  useEffect(
    () => () => {
      previewRequest.current += 1
    },
    [],
  )
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table owns row modeling.
  const table = useReactTable({
    data: items,
    columns: objectColumns({
      tx,
      canDelete,
      selectedKeys,
      fileKeys,
      pending: deleting.isPending,
      onSelect: setSelected,
      view,
      onOpenFolder,
      onPreview: (item, trigger) => {
        const request = ++previewRequest.current
        const image = new Image()
        image.src = objectDownloadHref(item.storage_id, item.key)
        void image.decode().then(
          () => {
            if (request !== previewRequest.current) return
            previewTrigger.current = trigger
            setPreview(item)
          },
          () => {
            if (request === previewRequest.current) {
              toast.error(tx("此图片暂时无法预览，请重试或下载查看。"))
            }
          },
        )
      },
      now,
      locale,
    }),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (item) => `${item.kind}:${item.key}`,
    manualPagination: true,
    manualFiltering: true,
  })
  if (!items.length)
    return (
      <NoItems
        title={tx(focusedKey ? "文件不存在或已被删除" : "暂无对象")}
        description={tx("此对象前缀下没有内容，请调整搜索或返回上级目录。")}
      >
        {!focusedKey && onUpload && (
          <Button size="sm" onClick={onUpload}>
            {tx("上传文件")}
          </Button>
        )}
      </NoItems>
    )

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {canDelete && selectedKeys.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-3">
          <div
            role="group"
            aria-label={tx("批量删除文件")}
            className="pointer-events-auto flex max-w-full items-center gap-2 rounded-xl border bg-background p-2 shadow-lg"
          >
            <span
              className="whitespace-nowrap rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-medium tabular-nums"
              aria-live="polite"
            >
              {tx("{0} 已选", { 0: selectedKeys.length })}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={tx("取消选择")}
              disabled={deleting.isPending}
              onClick={() => setSelected([])}
            >
              <XIcon className="size-4" />
            </Button>
            <span aria-hidden="true" className="h-5 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={deleting.isPending}
              onClick={() => setConfirmKeys([...selectedKeys])}
            >
              <Trash2Icon className="size-4" />
              {tx("删除")}
            </Button>
          </div>
        </div>
      )}
      {failures.length > 0 && (
        <ul
          className="max-h-32 overflow-auto px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {failures.map((item) => (
            <li key={item.key}>
              {item.key}: {tx(item.message)}
            </li>
          ))}
        </ul>
      )}
      <ResponsiveDialog
        open={confirmKeys !== null}
        onOpenChange={(open) => {
          if (!open && !deleting.isPending) setConfirmKeys(null)
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{tx("批量删除文件")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {tx("删除 {0} 个文件，此操作不可撤销。", {
                0: confirmKeys?.length ?? 0,
              })}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <ul className="max-h-48 overflow-auto text-sm">
              {confirmKeys?.map((key) => (
                <li key={key}>
                  <NameTooltip
                    name={key}
                    label={key.split("/").at(-1) || key}
                  />
                </li>
              ))}
            </ul>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <DialogActionButton
              action="cancel"
              type="button"
              variant="outline"
              disabled={deleting.isPending}
              onClick={() => setConfirmKeys(null)}
            >
              {tx("取消")}
            </DialogActionButton>
            <DialogActionButton
              variant="destructive"
              disabled={deleting.isPending || !confirmKeys?.length}
              onClick={() => {
                if (confirmKeys) deleting.mutate(confirmKeys)
              }}
            >
              {tx(deleting.isPending ? "正在删除…" : "确认删除")}
            </DialogActionButton>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      {preview && (
        <ImagePreviewDialog
          key={`${preview.storage_id}:${preview.key}`}
          item={preview}
          onClose={() => setPreview(null)}
          onRestoreFocus={() => previewTrigger.current?.focus()}
        />
      )}
      <div
        className={`min-h-0 flex-1 overflow-auto ${selectedKeys.length ? "pb-24" : ""}`}
      >
        <Table className="min-w-[36rem] table-fixed [&_th]:h-8 [&_td]:py-0.5 md:min-w-[40rem]">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow
                key={group.id}
                className="bg-muted/40 hover:bg-muted/40"
              >
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={columnClasses[header.column.id]}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={
                  row.original.key === focusedKey ? "bg-accent" : undefined
                }
                data-state={
                  selectedKeys.includes(row.original.key)
                    ? "selected"
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={columnClasses[cell.column.id]}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
