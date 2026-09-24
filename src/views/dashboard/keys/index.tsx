import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { format, fromUnixTime } from "date-fns"
import { useEffect, useState } from "react"
import { toast } from "@/lib/toast"
import {
  BookOpenIcon,
  RefreshCwIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { useCurrentTime } from "@/hooks/use-current-time"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTranslation } from "@/components/providers/language-context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DefaultUserAvatar } from "@/components/default-user-avatar"
import { Badge } from "@/components/ui/badge"
import { formatKeyTime, maskToken } from "./format"
import { useObjectTranslation } from "@/local/object"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import { ResourceTable } from "@/components/resource-table"
import { TablePagination } from "@/components/table-pagination"
import { MIN_PAGE_SIZE } from "@/lib/pagination"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { Switch } from "@/components/ui/switch"
import { setKeyEnabled } from "./api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { listKeys, deleteKey, rotateKey, type AppKey } from "./api"
import { KeyDialog, type KeyDialogState } from "./key-dialog"
import { KeyDeleteDialog } from "./delete-dialog"
import { KeyRotateDialog } from "./rotate-dialog"

type KeyStatus = "all" | "active" | "expired" | "never" | "revoked"

function keyStatus(key: AppKey, now: Date): Exclude<KeyStatus, "all"> {
  if (key.revoked) return "revoked"
  if (key.expires_at === null) return "never"
  return key.expires_at <= Math.floor(now.getTime() / 1000)
    ? "expired"
    : "active"
}

function formatKeyDate(timestamp: number) {
  return format(fromUnixTime(timestamp), "yyyy-MM-dd HH:mm")
}

export default function KeysPage() {
  const tx = useObjectTranslation()
  const { locale } = useTranslation()
  const isMobile = useIsMobile()
  const now = useCurrentTime()
  const client = useQueryClient()
  const access = useQuery(authPermissionsQuery)
  const permissions = access.data?.permissions ?? []
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<KeyStatus>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(MIN_PAGE_SIZE)
  const [dialog, setDialog] = useState<KeyDialogState>(null)
  const [keyToDelete, setKeyToDelete] = useState<AppKey | null>(null)
  const [keyToRotate, setKeyToRotate] = useState<AppKey | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])
  const query = useQuery({
    queryKey: ["keys", page, pageSize, debouncedSearch, statusFilter],
    queryFn: ({ signal }) =>
      listKeys(
        { page, pageSize, search: debouncedSearch, status: statusFilter },
        signal,
      ),
  })
  const canCreate = permissions.includes("object:keys:create")
  const canDeleteKey = permissions.includes("object:keys:revoke")
  const remove = useMutation({
    mutationFn: deleteKey,
    onSuccess: async () => {
      setKeyToDelete(null)
      setPage(1)
      await client.invalidateQueries({ queryKey: ["keys"] })
      toast.success(tx("授权已删除"))
    },
    onError: (error) => toast.error(tx(error.message)),
  })
  const rotate = useMutation({
    mutationFn: rotateKey,
    onSuccess: async () => {
      setKeyToRotate(null)
      await client.invalidateQueries({ queryKey: ["keys"] })
      toast.success(tx("Token 已轮换，请复制新 Token"))
    },
    onError: (error) => toast.error(tx(error.message)),
  })
  const toggle = useMutation({
    mutationFn: setKeyEnabled,
    onSuccess: async () => {
      setPage(1)
      await client.invalidateQueries({ queryKey: ["keys"] })
    },
    onError: (error) => toast.error(tx(error.message)),
  })
  const renderEnabled = (key: AppKey) => (
    <div className="flex min-h-11 items-center gap-2 sm:min-h-8">
      <Switch
        checked={!key.revoked}
        aria-label={`${key.name} ${tx("启用授权")}`}
        disabled={
          toggle.isPending || (key.revoked ? !canCreate : !canDeleteKey)
        }
        onCheckedChange={(enabled) => toggle.mutate({ id: key.id, enabled })}
      />
      <span className="text-xs text-muted-foreground">
        {key.revoked ? tx("已停用") : tx("已启用")}
      </span>
    </div>
  )
  const renderToken = (key: AppKey) =>
    key.token ? (
      <div className="flex min-h-11 w-fit max-w-full items-center gap-2 sm:min-h-8">
        <code className="min-w-0 truncate text-xs">{maskToken(key.token)}</code>
        <CopyButton
          value={key.token}
          variant="ghost"
          size="icon-sm"
          className="size-11 shrink-0 sm:size-8"
          aria-label={tx("复制密钥")}
        />
      </div>
    ) : (
      <span className="text-xs text-muted-foreground">
        {tx("旧 Token 未保存")}
      </span>
    )
  const rows = query.data?.items ?? []
  const columns: ColumnDef<AppKey>[] = [
    {
      accessorKey: "name",
      header: tx("应用名称"),
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1.5 max-sm:w-[calc(100vw-7rem)]">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="rounded-lg">
              <AvatarImage
                src={row.original.logo ?? undefined}
                alt=""
                className="rounded-lg object-contain"
              />
              <AvatarFallback className="rounded-lg">
                <DefaultUserAvatar seed={`one-object:app:${row.original.id}`} />
              </AvatarFallback>
            </Avatar>
            {canCreate ? (
              <button
                type="button"
                className="max-w-full truncate font-medium hover:underline"
                onClick={() => setDialog({ kind: "edit", key: row.original })}
              >
                {row.original.name}
              </button>
            ) : (
              <div className="max-w-64 truncate font-medium">
                {row.original.name}
              </div>
            )}
          </div>
          {row.original.revoked ||
          keyStatus(row.original, now) === "expired" ? (
            <Badge variant="secondary">
              {row.original.revoked ? tx("已停用") : tx("已过期")}
            </Badge>
          ) : null}
          {isMobile ? (
            <>
              {renderToken(row.original)}
              {renderEnabled(row.original)}
              <time
                className="block text-xs text-muted-foreground"
                dateTime={fromUnixTime(row.original.created_at).toISOString()}
                title={formatKeyDate(row.original.created_at)}
              >
                {tx("创建时间")} ·{" "}
                {formatKeyTime(row.original.created_at, now, locale)}
              </time>
            </>
          ) : null}
        </div>
      ),
      meta: { label: tx("应用名称"), headerClassName: "min-w-48" },
    },
    {
      accessorKey: "token",
      header: tx("密钥"),
      enableSorting: false,
      cell: ({ row }) => renderToken(row.original),
      meta: { label: tx("密钥"), headerClassName: "min-w-72" },
    },
    {
      accessorKey: "created_at",
      header: tx("创建时间"),
      cell: ({ row }) => (
        <time
          className="whitespace-nowrap text-sm text-muted-foreground"
          dateTime={fromUnixTime(row.original.created_at).toISOString()}
          title={formatKeyDate(row.original.created_at)}
        >
          {formatKeyTime(row.original.created_at, now, locale)}
        </time>
      ),
      meta: { label: tx("创建时间") },
    },
    {
      id: "enabled",
      header: tx("状态"),
      cell: ({ row }) => renderEnabled(row.original),
    },
  ]

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="min-h-0 flex-1">
        <ResourceTable
          compact
          columns={
            isMobile
              ? columns.filter(
                  (column) =>
                    "accessorKey" in column && column.accessorKey === "name",
                )
              : columns
          }
          data={rows}
          showPaginationControls={false}
          emptyLabel={tx("暂无应用授权")}
          error={query.error}
          getRowId={(key) => key.id}
          isFetching={query.isFetching || remove.isPending || rotate.isPending}
          isLoading={query.isPending}
          onCreate={canCreate ? () => setDialog({ kind: "create" }) : undefined}
          createLabel={tx("新增授权")}
          onRefresh={() => query.refetch()}
          onSearchChange={(value) => {
            setPage(1)
            setSearch(Array.from(value).slice(0, 100).join(""))
          }}
          onStatusFilterChange={(value) => {
            setPage(1)
            setStatusFilter(value)
          }}
          stackedToolbar
          statusFilterControl={isMobile ? "select" : "segmented"}
          renderRowActions={(key) => {
            const canEdit = canCreate
            const canDelete = canDeleteKey
            if (!canEdit && !canDelete) return null
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-11 sm:size-7"
                    aria-label={key.name + tx("授权操作")}
                    disabled={remove.isPending || rotate.isPending}
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuGroup>
                    {canEdit ? (
                      <DropdownMenuItem
                        onSelect={() => setDialog({ kind: "edit", key })}
                      >
                        <PencilIcon />
                        {tx("编辑")}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                  {canEdit ? (
                    <DropdownMenuItem onSelect={() => setKeyToRotate(key)}>
                      <RefreshCwIcon />
                      {tx("轮换 Token")}
                    </DropdownMenuItem>
                  ) : null}
                  {canDelete && canEdit ? <DropdownMenuSeparator /> : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setKeyToDelete(key)}
                    >
                      <Trash2Icon />
                      {tx("删除授权")}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }}
          searchPlaceholder={tx("搜索应用名称、授权 ID 或权限")}
          searchValue={search}
          statusFilter={statusFilter}
          statusFilterOptions={[
            { value: "all", label: tx("全部") },
            { value: "active", label: tx("有效") },
            { value: "expired", label: tx("已过期") },
            { value: "never", label: tx("不过期") },
            { value: "revoked", label: tx("已停用") },
          ]}
          toolbarActions={
            <Button asChild variant="ghost" size="sm">
              <a href="/guide" target="_blank" rel="noreferrer">
                <BookOpenIcon />
                {tx("使用文档")}
              </a>
            </Button>
          }
        />
      </div>
      <TablePagination
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPage(1)
          setPageSize(size)
        }}
        disabled={query.isFetching}
        zh={locale === "zh-CN"}
      />
      <KeyDialog
        key={
          dialog?.kind === "edit"
            ? dialog.key.id
            : dialog?.kind === "create"
              ? "create"
              : "closed"
        }
        dialog={dialog}
        permissions={permissions}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null)
            setPage(1)
          }
        }}
      />
      <KeyRotateDialog
        appKey={keyToRotate}
        pending={rotate.isPending}
        onConfirm={() => {
          if (keyToRotate) rotate.mutate(keyToRotate.id)
        }}
        onOpenChange={(open) => {
          if (!open && !rotate.isPending) setKeyToRotate(null)
        }}
      />
      <KeyDeleteDialog
        keyToDelete={keyToDelete}
        pending={remove.isPending}
        onConfirm={() => {
          if (keyToDelete) remove.mutate(keyToDelete.id)
        }}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setKeyToDelete(null)
        }}
      />
    </section>
  )
}
