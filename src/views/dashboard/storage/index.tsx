import { useSearchParams } from "react-router"
import { NoItems } from "@/components/async-state"
import { DialogActionButton } from "@/components/ui/dialog-action-button"
import { useLocalAtom } from "@/hooks/use-local-atom"
import { ConnectionEditor } from "./components/connection-editor"
import { useObjectTranslation } from "@/local/object"
import { useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"
import { ResourceTable } from "@/components/resource-table"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import { SweepShine } from "@/components/sweep-shine"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import {
  PROVIDERS,
  listAccounts,
  updateAccount,
  checkAccount,
  deleteAccount,
  deleteAccounts,
  type StorageAccount,
} from "./api"

type AccountConfirmation = {
  kind: "disable" | "delete"
  accounts: StorageAccount[]
  clearSelection?: () => void
}
export default function StoragePage() {
  const tx = useObjectTranslation()

  const [params, setParams] = useSearchParams()
  const client = useQueryClient()
  const [editor, setEditor] = useLocalAtom<StorageAccount | "new" | null>(null)
  const creating = params.get("create") === "1"
  const closeEditor = () => {
    setEditor(null)
    if (creating) {
      const next = new URLSearchParams(params)
      next.delete("create")
      setParams(next, { replace: true })
    }
  }
  const [confirmation, setConfirmation] =
    useLocalAtom<AccountConfirmation | null>(null)
  const [search, setSearch] = useLocalAtom("")
  const [statusFilter, setStatusFilter] = useLocalAtom<
    "all" | "active" | "disabled"
  >("all")
  const access = useQuery(authPermissionsQuery)
  const canWrite =
    access.data?.permissions.includes("object:storage:write") ?? false
  const query = useQuery({
    queryKey: ["storage-accounts"],
    queryFn: ({ signal }) => listAccounts(signal),
  })
  const [refreshing, setRefreshing] = useLocalAtom(false)
  const refreshResult = useRef<{ error: Error | null } | null>(null)
  const reloadAccounts = async () => {
    refreshResult.current = null
    setRefreshing(true)
    try {
      const result = await query.refetch({ throwOnError: true })
      refreshResult.current = { error: result.error }
    } catch (error) {
      refreshResult.current = {
        error:
          error instanceof Error ? error : new Error(tx("刷新失败，请重试")),
      }
    }
  }
  const finishRefreshRotation = () => {
    const result = refreshResult.current
    if (!result) return
    refreshResult.current = null
    setRefreshing(false)
    if (result.error) toast.error(tx(result.error.message))
    else toast.success(tx("厂商列表已刷新"))
  }
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["storage-accounts"] }),
      client.invalidateQueries({ queryKey: ["storage-connections"] }),
      client.invalidateQueries({ queryKey: ["storage-buckets"] }),
    ])
  }
  const toggle = useMutation({
    mutationFn: (account: StorageAccount) =>
      updateAccount(account.id, {
        name: account.name,
        enabled: !account.enabled,
      }),
    onSuccess: async (_, account) => {
      setConfirmation(null)
      toast.success(account.enabled ? tx("厂商已停用") : tx("厂商已启用"))
      await refresh()
    },
    onError: (error) => toast.error(tx(error.message)),
  })
  const remove = useMutation({
    mutationFn: (accounts: StorageAccount[]) =>
      accounts.length === 1
        ? deleteAccount(accounts[0].id)
        : deleteAccounts(accounts.map((account) => account.id)),
    onSuccess: async (_, accounts) => {
      confirmation?.clearSelection?.()
      setConfirmation(null)
      toast.success(tx("已删除 {0} 个厂商配置", { 0: accounts.length }))
      await refresh()
    },
    onError: (error) => toast.error(tx(error.message)),
  })
  const check = useMutation({
    mutationFn: checkAccount,
    onSuccess: (result) => toast.success(result.message),
    onError: (error) => toast.error(tx(error.message)),
  })
  const keyword = search.trim().toLowerCase()
  const data = (query.data?.items ?? []).filter(
    (account) =>
      (statusFilter === "all" ||
        account.enabled === (statusFilter === "active")) &&
      (!keyword ||
        [account.name, tx(PROVIDERS[account.provider]), account.region].some(
          (value) => value.toLowerCase().includes(keyword),
        )),
  )
  const columns: ColumnDef<StorageAccount>[] = [
    {
      accessorKey: "name",
      header: tx("厂商名称"),
      cell: ({ row: { original: account } }) => (
        <div className="flex min-w-40 items-center gap-2">
          <img
            src={`/storage-providers/${account.provider}.svg`}
            alt=""
            className="size-5 shrink-0 object-contain"
          />
          {canWrite ? (
            <button
              type="button"
              className="min-w-0 truncate text-left font-medium underline-offset-4 hover:underline"
              title={account.name}
              onClick={(event) => {
                event.stopPropagation()
                setEditor(account)
              }}
            >
              {account.name}
            </button>
          ) : (
            <span className="truncate font-medium" title={account.name}>
              {account.name}
            </span>
          )}
        </div>
      ),
      meta: { label: tx("厂商名称"), headerClassName: "w-[45%]" },
    },
    {
      accessorKey: "bucket_count",
      header: tx("桶数量"),
      cell: ({ row: { original: account } }) => (
        <span className="tabular-nums" title={tx("已导入或同步的存储桶数量")}>
          {account.bucket_count == null ||
          (!account.synced_at && account.bucket_count === 0)
            ? tx("未同步")
            : tx("{0} 个", { 0: account.bucket_count })}
        </span>
      ),
      meta: { label: tx("桶数量") },
    },
    {
      accessorKey: "enabled",
      header: tx("状态"),
      cell: ({ row: { original: account } }) => (
        <div className="flex items-center gap-2">
          <Switch
            size="sm"
            aria-label={tx("{0} 启用状态", { 0: account.name })}
            checked={account.enabled}
            disabled={!canWrite || toggle.isPending || remove.isPending}
            onCheckedChange={(enabled) => {
              if (enabled) toggle.mutate(account)
              else setConfirmation({ kind: "disable", accounts: [account] })
            }}
            onClick={(event) => event.stopPropagation()}
          />
          <span className="text-xs text-muted-foreground">
            {account.enabled ? tx("启用") : tx("停用")}
          </span>
        </div>
      ),
      meta: { label: tx("状态") },
    },
  ]
  const pending = toggle.isPending || remove.isPending
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <ResourceTable
        compact
        columns={columns}
        data={data}
        getRowId={(account) => account.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={tx("搜索厂商名称")}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        isLoading={query.isPending}
        isFetching={query.isFetching || refreshing}
        error={query.error}
        onRefresh={() => reloadAccounts()}
        onRefreshAnimationIteration={finishRefreshRotation}
        onCreate={canWrite ? () => setEditor("new") : undefined}
        onRowClick={canWrite ? (account) => setEditor(account) : undefined}
        createLabel={tx("新增接入")}
        emptyLabel={
          query.isSuccess && !query.data.items.length ? (
            <NoItems
              title={tx("暂无厂商配置")}
              description={tx("添加厂商账号后，即可接入存储桶并上传文件。")}
            >
              {canWrite && (
                <Button size="sm" onClick={() => setEditor("new")}>
                  {tx("添加厂商账号")}
                </Button>
              )}
            </NoItems>
          ) : (
            tx("暂无厂商配置")
          )
        }
        isBulkDeleting={remove.isPending}
        onBulkDelete={
          canWrite
            ? (accounts, clearSelection) =>
                setConfirmation({ kind: "delete", accounts, clearSelection })
            : undefined
        }
        renderRowActions={(account) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-7"
                aria-label={tx("{0} 操作", { 0: account.name })}
                disabled={remove.isPending}
              >
                {check.isPending && check.variables === account.id ? (
                  <RefreshCwIcon className="animate-spin" />
                ) : (
                  <MoreHorizontalIcon />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="max-md:!min-h-9"
                  disabled={check.isPending || !account.enabled}
                  onSelect={() => check.mutate(account.id)}
                >
                  <RefreshCwIcon />
                  {tx("检测连接")}
                </DropdownMenuItem>
                {canWrite && (
                  <DropdownMenuItem
                    className="max-md:!min-h-9"
                    onSelect={() => setEditor(account)}
                  >
                    <PencilIcon />
                    {tx("编辑")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              {canWrite && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="max-md:!min-h-9"
                    variant="destructive"
                    onSelect={() =>
                      setConfirmation({ kind: "delete", accounts: [account] })
                    }
                  >
                    <Trash2Icon />
                    {tx("删除")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
      {canWrite && (editor || creating) && (
        <ConnectionEditor
          value={editor ?? "new"}
          close={closeEditor}
          saved={() => void refresh()}
        />
      )}
      <ResponsiveDialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmation(null)
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {confirmation?.kind === "disable"
                ? tx("停用厂商")
                : tx("删除 {0} 个厂商配置", {
                    0: confirmation?.accounts.length ?? 0,
                  })}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {confirmation?.kind === "disable"
                ? tx(
                    "停用后，该厂商不能用于新上传及云端桶管理；已有文件和未完成上传仍保留。",
                  )
                : tx(
                    "删除所选厂商及其本地桶接入配置，云端桶和对象不受影响。有关联文件或未完成上传时，整批操作将被拒绝。",
                  )}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {confirmation?.accounts.map((account) => (
                <li key={account.id}>{account.name}</li>
              ))}
            </ul>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <DialogActionButton
              action="cancel"
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmation(null)}
            >
              {tx("取消")}
            </DialogActionButton>
            <DialogActionButton
              variant={
                confirmation?.kind === "delete" ? "destructive" : "default"
              }
              disabled={pending}
              onClick={() => {
                if (!confirmation) return
                if (confirmation.kind === "disable")
                  toggle.mutate(confirmation.accounts[0])
                else remove.mutate(confirmation.accounts)
              }}
            >
              <SweepShine active={pending}>
                {confirmation?.kind === "disable"
                  ? tx("确认停用")
                  : tx("确认删除")}
              </SweepShine>
            </DialogActionButton>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </section>
  )
}
