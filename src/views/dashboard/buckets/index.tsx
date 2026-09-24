import { syncAndRefreshBuckets, syncBucketsWithAnimation } from "./sync"
import { BucketAccountSwitcher } from "./components/account-switcher"
import { useLocalAtom } from "@/hooks/use-local-atom"
import { BucketDialog } from "./components/bucket-dialog"
import { BucketBulkDeleteDialog } from "./components/bulk-delete-dialog"
import { BucketDisableDialog } from "./components/disable-dialog"
import { Switch } from "@/components/ui/switch"
import { TextLink } from "@/components/text-link"
import { DashboardPageTransition } from "@/components/dashboard-route-motion"
import { Navigate, useNavigate, useParams } from "react-router"
import { useObjectTranslation } from "@/local/object"
import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router"
import { DatabaseIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react"
import { toast } from "@/lib/toast"

import { Loading, Failure, NoItems } from "@/components/async-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import { ResourceTable } from "@/components/resource-table"
import { listAccounts, updateConnection } from "@/views/dashboard/storage/api"
import { deleteBucket, listBuckets, type Bucket } from "./api"

const states = {
  unknown: "未同步",
  present: "云端存在",
  missing: "云端未找到",
  deleted: "已删除",
} as const

type BucketStatusFilter = "all" | "active" | "disabled"

type BulkDeleteState = {
  buckets: Bucket[]
  clearSelection: () => void
}

export default function BucketsPage() {
  const { id } = useParams<{ id: string }>()
  return <BucketManager key={id ?? ""} selectedId={id} />
}

function BucketManager({ selectedId }: { selectedId?: string }) {
  const navigate = useNavigate()
  const selectAccount = (id: string) =>
    navigate(`/dashboard/buckets/${encodeURIComponent(id)}`)
  const tx = useObjectTranslation()

  const client = useQueryClient()
  const access = useQuery(authPermissionsQuery)
  const accounts = useQuery({
    queryKey: ["storage-accounts"],
    queryFn: ({ signal }) => listAccounts(signal),
  })
  const account = accounts.data?.items.find((item) => item.id === selectedId)
  const accountId = account?.id ?? ""
  const buckets = useQuery({
    queryKey: ["storage-buckets", accountId],
    queryFn: ({ signal }) => listBuckets(accountId, signal),
    enabled: !!accountId,
  })
  const [disabling, setDisabling] = useLocalAtom<Bucket | null>(null)
  const [editor, setEditor] = useLocalAtom<"new" | Bucket | null>(null)
  const [bulkDeleting, setBulkDeleting] = useLocalAtom<BulkDeleteState | null>(
    null,
  )
  const [search, setSearch] = useLocalAtom("")
  const [statusFilter, setStatusFilter] =
    useLocalAtom<BucketStatusFilter>("all")
  const can = (action: string) =>
    access.data?.permissions.includes("object:bucket:" + action) ?? false
  const canReadFiles =
    access.data?.permissions.includes("object:files:read") ?? false
  const canWriteStorage =
    access.data?.permissions.includes("object:storage:write") ?? false

  const refresh = async (targetAccountId = accountId) => {
    await Promise.all([
      client.invalidateQueries({
        queryKey: ["storage-buckets", targetAccountId],
      }),
      client.invalidateQueries({ queryKey: ["storage-connections"] }),
      client.invalidateQueries({ queryKey: ["storage-accounts"] }),
    ])
  }
  const syncAfterChange = async () => {
    const error = await syncAndRefreshBuckets(client, accountId, can("sync"))
    if (error) {
      toast.warning(tx("云端同步失败，请刷新重试"), {
        description: error instanceof Error ? tx(error.message) : undefined,
      })
    }
  }
  const toggle = useMutation({
    mutationFn: ({ bucket, enabled }: { bucket: Bucket; enabled: boolean }) =>
      updateConnection(bucket.id, { name: bucket.name, enabled }),
    onSuccess: async () => {
      await syncAfterChange()
      setDisabling(null)
    },
    onError: (error) => toast.error(tx(error.message)),
  })
  const sync = useMutation({
    mutationFn: syncBucketsWithAnimation,
    onSuccess: async (result, targetAccountId) => {
      await refresh(targetAccountId)
      toast.success(tx("已同步 ") + result.count + tx(" 个云端存储桶"))
    },
    onError: (error) => toast.error(tx(error.message)),
  })
  const bulkRemove = useMutation({
    mutationFn: async (items: Bucket[]) => {
      for (const bucket of items) {
        await deleteBucket(accountId, bucket.bucket, bucket.bucket)
      }
    },
    onSuccess: (_, items) => {
      bulkDeleting?.clearSelection()
      setBulkDeleting(null)
      toast.success(tx("已删除 ") + items.length + tx(" 个云端存储桶"))
    },
    onError: (error) => {
      bulkDeleting?.clearSelection()
      setBulkDeleting(null)
      toast.error(tx(error.message))
    },
    onSettled: syncAfterChange,
  })

  const filteredBuckets = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return (buckets.data?.items ?? []).filter(
      (bucket) =>
        bucket.cloud_state !== "deleted" &&
        (statusFilter === "all" ||
          (bucket.enabled && bucket.cloud_state === "present") ===
            (statusFilter === "active")) &&
        (!keyword ||
          [bucket.bucket, bucket.region, tx(states[bucket.cloud_state])].some(
            (value) => value.toLowerCase().includes(keyword),
          )),
    )
  }, [tx, buckets.data?.items, search, statusFilter])

  const columns: ColumnDef<Bucket>[] = [
    {
      accessorKey: "bucket",
      header: tx("桶名称"),
      cell: ({ row: { original: bucket } }) => (
        <span className="flex max-w-[min(48rem,60vw)] items-center gap-2 font-medium">
          <DatabaseIcon aria-hidden="true" className="size-4 shrink-0" />
          {canReadFiles && bucket.cloud_state === "present" ? (
            <TextLink asChild tooltip={bucket.bucket}>
              <Link
                className="min-w-0 text-primary"
                to={"/dashboard/files/" + encodeURIComponent(bucket.id)}
              >
                <span className="block truncate">{bucket.bucket}</span>
              </Link>
            </TextLink>
          ) : (
            <span className="truncate">{bucket.bucket}</span>
          )}
        </span>
      ),
      meta: { label: tx("桶名称"), headerClassName: "min-w-48" },
    },
    {
      accessorKey: "region",
      header: tx("区域"),
      cell: ({ row: { original: bucket } }) => (
        <span className="text-muted-foreground">
          {bucket.region || tx("默认区域")}
        </span>
      ),
      meta: { label: tx("区域") },
    },
    {
      accessorKey: "cloud_state",
      header: tx("同步状态"),
      cell: ({ row: { original: bucket } }) => (
        <div className="flex items-center gap-2">
          <Badge
            variant={bucket.cloud_state === "present" ? "secondary" : "outline"}
          >
            {tx(states[bucket.cloud_state])}
          </Badge>
          {!bucket.enabled && (
            <span className="text-xs text-muted-foreground">
              {tx("接入已停用")}
            </span>
          )}
        </div>
      ),
      meta: { label: tx("同步状态") },
    },
    {
      accessorKey: "enabled",
      header: tx("状态"),
      cell: ({ row: { original: bucket } }) => (
        <Switch
          checked={bucket.enabled && bucket.cloud_state === "present"}
          aria-label={tx("{0} 启用状态", { 0: bucket.bucket })}
          aria-busy={
            toggle.isPending && toggle.variables?.bucket.id === bucket.id
          }
          disabled={
            !account?.enabled ||
            !canWriteStorage ||
            bucket.cloud_state !== "present" ||
            toggle.isPending
          }
          onCheckedChange={(enabled) => {
            toggle.reset()
            if (enabled) toggle.mutate({ bucket, enabled: true })
            else setDisabling(bucket)
          }}
        />
      ),
      meta: { label: tx("状态"), headerClassName: "w-20" },
    },
  ]

  if (accounts.isPending) return <Loading />
  if (accounts.error)
    return (
      <Failure error={accounts.error} retry={() => void accounts.refetch()} />
    )
  if (!selectedId && accounts.data.items[0]) {
    return (
      <Navigate
        replace
        to={`/dashboard/buckets/${encodeURIComponent(accounts.data.items[0].id)}`}
      />
    )
  }
  const pending =
    sync.isPending || toggle.isPending || bulkRemove.isPending || !!editor

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:flex-row">
      <BucketAccountSwitcher
        accounts={accounts.data.items}
        account={account}
        accountId={accountId}
        onSelect={selectAccount}
        canSync={can("sync")}
        syncing={sync.isPending}
        syncingId={sync.variables}
        isFetching={accounts.isFetching || buckets.isFetching}
        onSync={(id) => sync.mutate(id)}
        onRefresh={() => void refresh()}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardPageTransition
          routeKey={selectedId ?? ""}
          animateOnMount={false}
          variant="fade"
        >
          {!account ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <NoItems
                title={tx(
                  selectedId ? "厂商不存在或无权访问" : "尚未配置厂商账号",
                )}
                description={tx(
                  selectedId
                    ? "请从厂商列表重新选择。"
                    : "请先在厂商管理中添加账号，然后同步云端桶列表。",
                )}
              >
                {!accounts.data.items.length && canWriteStorage && (
                  <Button asChild size="sm">
                    <Link to="/dashboard/storage?create=1">
                      {tx("添加厂商账号")}
                    </Link>
                  </Button>
                )}
              </NoItems>
            </div>
          ) : (
            <>
              <ResourceTable
                key={accountId}
                compact
                inlineActions
                columns={columns}
                data={filteredBuckets}
                emptyLabel={
                  buckets.isSuccess && !buckets.data.items.length ? (
                    <NoItems
                      title={tx("暂无存储桶")}
                      description={tx(
                        "同步已有存储桶，或创建一个新桶开始使用。",
                      )}
                    >
                      <div className="flex flex-wrap justify-center gap-2">
                        {can("sync") && account.enabled && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sync.isPending}
                            onClick={() => sync.mutate(accountId)}
                          >
                            {tx("同步云端")}
                          </Button>
                        )}
                        {can("create") && account.enabled && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => setEditor("new")}
                          >
                            {tx("创建桶")}
                          </Button>
                        )}
                      </div>
                    </NoItems>
                  ) : (
                    tx("暂无存储桶")
                  )
                }
                error={buckets.error}
                getRowCanSelect={(bucket) =>
                  account.enabled && bucket.cloud_state === "present"
                }
                getRowId={(bucket) => bucket.id}
                isBulkDeleting={bulkRemove.isPending}
                isFetching={
                  buckets.isFetching || toggle.isPending || bulkRemove.isPending
                }
                isLoading={buckets.isPending}
                onCreate={
                  can("create") && account.enabled && !pending
                    ? () => setEditor("new")
                    : undefined
                }
                createLabel={tx("创建桶")}
                onBulkDelete={
                  can("delete")
                    ? (items, clearSelection) =>
                        setBulkDeleting({ buckets: items, clearSelection })
                    : undefined
                }
                onRefresh={() => {
                  if (can("sync") && account?.enabled) sync.mutate(accountId)
                  else void refresh()
                }}
                onSearchChange={setSearch}
                onStatusFilterChange={setStatusFilter}
                renderRowActions={(bucket) => {
                  const canRemove =
                    account.enabled &&
                    can("delete") &&
                    bucket.cloud_state === "present"
                  if (!canRemove) return null
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7"
                          aria-label={bucket.bucket + tx(" 操作")}
                          disabled={pending}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setEditor(bucket)}
                          >
                            <Trash2Icon />
                            {tx("删除云端桶")}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }}
                searchPlaceholder={tx("搜索桶名称、区域或同步状态")}
                searchValue={search}
                statusFilter={statusFilter}
              />

              <BucketDisableDialog
                bucket={disabling}
                pending={toggle.isPending}
                error={toggle.error}
                onClose={() => {
                  setDisabling(null)
                  toggle.reset()
                }}
                onConfirm={(bucket) =>
                  toggle.mutate({ bucket, enabled: false })
                }
              />
              {editor && (
                <BucketDialog
                  accountId={accountId}
                  provider={account.provider}
                  defaultRegion={account.region}
                  value={editor}
                  close={() => setEditor(null)}
                  saved={syncAfterChange}
                />
              )}
              <BucketBulkDeleteDialog
                buckets={bulkDeleting?.buckets ?? null}
                deleting={bulkRemove.isPending}
                onConfirm={() => {
                  if (bulkDeleting) bulkRemove.mutate(bulkDeleting.buckets)
                }}
                onOpenChange={(open) => {
                  if (!open && !bulkRemove.isPending) setBulkDeleting(null)
                }}
              />
            </>
          )}
        </DashboardPageTransition>
      </div>
    </section>
  )
}
