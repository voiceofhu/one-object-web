import { DialogActionButton } from "@/components/ui/dialog-action-button"
import {
  ResponsiveDialogClose,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog"
import { useObjectTranslation } from "@/local/object"
import { NameTooltip } from "./name-tooltip"
import { useMemo, useState } from "react"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DatabaseIcon,
  SearchIcon,
  RefreshCwIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  PROVIDERS,
  type StorageAccount,
  type StorageConnection,
} from "@/views/dashboard/storage/api"
import { cn } from "@/lib/utils"

type StorageTreeProps = {
  connections: StorageConnection[]
  accounts: StorageAccount[]
  selectedStorageId: string
  onSelectStorage: (id: string) => void
  onRefresh: () => void
  refreshing: boolean
  isFetching: boolean
}

function StorageTreeContent({
  connections,
  accounts,
  selectedStorageId,
  onSelectStorage,
  onRefresh,
  refreshing,
  isFetching,
}: StorageTreeProps) {
  const tx = useObjectTranslation()

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const groups = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const grouped = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      provider: account.provider,
      connections: connections.filter((item) => item.account_id === account.id),
    }))
    const unassigned = connections.filter((item) => !item.account_id)
    if (unassigned.length) {
      grouped.push({
        id: "unassigned",
        name: tx("未关联账户"),
        provider: unassigned[0].provider,
        connections: unassigned,
      })
    }
    return grouped
      .map((group) => ({
        ...group,
        connections: group.connections.filter(
          (connection) =>
            !keyword ||
            [
              group.name,
              tx(PROVIDERS[group.provider]),
              connection.bucket,
              connection.region,
            ].some((value) => value.toLowerCase().includes(keyword)),
        ),
      }))
      .filter(
        (group) =>
          !keyword ||
          group.connections.length ||
          [group.name, tx(PROVIDERS[group.provider])].some((value) =>
            value.toLowerCase().includes(keyword),
          ),
      )
  }, [tx, accounts, connections, search])

  const pages = Math.max(1, Math.ceil(groups.length / 12))
  const currentPage = Math.min(page, pages - 1)
  const visibleGroups = groups.slice(currentPage * 12, (currentPage + 1) * 12)

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-b bg-background md:h-auto md:w-60 md:border-r md:border-b-0 lg:w-64">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-2 py-0.5 md:h-10 md:px-3 md:py-1">
        <h1 className="truncate text-sm font-semibold">{tx("文件目录")}</h1>
        <span className="text-xs tabular-nums text-muted-foreground">
          {accounts.length}
          {tx("个账户")}
        </span>
      </div>
      <div className="flex h-10 shrink-0 items-center gap-1 border-b px-2 py-1 md:h-14 md:gap-2 md:px-3 md:py-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={tx("搜索账户或存储桶")}
            className="h-7 !min-h-0 pl-7 text-sm md:h-8 md:pl-8"
            placeholder={tx("搜索账户或存储桶")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
          />
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="md:size-8"
          aria-label={tx("刷新存储桶")}
          title={tx("刷新存储桶")}
          aria-busy={refreshing}
          disabled={refreshing || isFetching}
          onClick={onRefresh}
        >
          <RefreshCwIcon
            className={
              refreshing ? "animate-spin motion-reduce:animate-none" : undefined
            }
            style={{ animationDuration: "1s" }}
          />
        </Button>
      </div>
      <nav
        aria-label={tx("文件目录")}
        className="min-h-0 flex-1 overflow-y-auto p-1.5"
      >
        <div className="flex flex-col gap-0.5">
          {visibleGroups.map((group) => {
            const expanded = collapsed[group.id] !== true
            const groupKey = group.id
            return (
              <div key={groupKey}>
                <button
                  aria-expanded={expanded}
                  className="flex h-8 w-full items-center gap-1 rounded-md px-1.5 text-left text-[13px] font-medium hover:bg-muted md:h-7"
                  type="button"
                  onClick={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [groupKey]: expanded,
                    }))
                  }
                >
                  {expanded ? (
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="size-3.5 shrink-0"
                    />
                  ) : (
                    <ChevronRightIcon
                      aria-hidden="true"
                      className="size-3.5 shrink-0"
                    />
                  )}
                  <img
                    src={`/storage-providers/${group.provider}.svg`}
                    alt=""
                    aria-hidden="true"
                    className="size-3.5 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate">{group.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {group.connections.length}
                  </span>
                </button>
                {expanded && (
                  <div className="ml-4 border-l border-border/70 pl-1">
                    {group.connections.map((connection) => {
                      const selected = connection.id === selectedStorageId
                      return (
                        <button
                          aria-current={selected ? "page" : undefined}
                          className={cn(
                            "flex h-7 w-full items-center gap-1.5 rounded-md px-1.5 text-left hover:bg-muted md:h-6",
                            selected && "bg-accent text-accent-foreground",
                            !connection.enabled && "opacity-60",
                          )}
                          key={connection.id}
                          type="button"
                          onClick={() => onSelectStorage(connection.id)}
                        >
                          <DatabaseIcon
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-muted-foreground"
                          />
                          <NameTooltip
                            name={connection.bucket}
                            className="flex-1 text-[13px]"
                          />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!groups.length && (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            {tx("没有匹配的账户或存储桶")}
          </p>
        )}
      </nav>
      {pages > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t p-2 text-xs">
          <span className="text-muted-foreground">
            {tx("目录")}
            {currentPage + 1} / {pages}
            {tx("页")}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={!currentPage}
              onClick={() => setPage(currentPage - 1)}
            >
              {tx("上一页")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={currentPage + 1 >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              {tx("下一页")}
            </Button>
          </div>
        </div>
      )}
    </aside>
  )
}

export function StorageTree(props: StorageTreeProps) {
  const tx = useObjectTranslation()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  if (!isMobile) return <StorageTreeContent {...props} />
  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <div className="shrink-0 border-b px-2 py-1 md:px-3 md:py-2">
        <ResponsiveDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full justify-start px-2"
          >
            <DatabaseIcon />
            {tx("文件目录")}
            <span className="min-w-0 flex-1 truncate text-right text-muted-foreground">
              {props.connections.find(
                (item) => item.id === props.selectedStorageId,
              )?.bucket ?? tx("选择存储桶")}
            </span>
          </Button>
        </ResponsiveDialogTrigger>
      </div>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{tx("文件目录")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {tx("选择账户或存储桶以浏览文件。")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="h-[65svh] min-h-0 pb-[env(safe-area-inset-bottom)]">
          <StorageTreeContent
            {...props}
            onSelectStorage={(id) => {
              props.onSelectStorage(id)
              setOpen(false)
            }}
          />
        </div>
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
