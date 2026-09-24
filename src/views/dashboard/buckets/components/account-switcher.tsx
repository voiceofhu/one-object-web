import { useVendorColumns } from "./vendor-columns"
import { ResourceTable } from "@/components/resource-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { RefreshCwIcon } from "lucide-react"
import { useObjectTranslation } from "@/local/object"
import type { StorageAccount } from "@/views/dashboard/storage/api"

function bucketCountLabel(
  account: StorageAccount,
  tx: ReturnType<typeof useObjectTranslation>,
) {
  return account.bucket_count == null ||
    (!account.synced_at && account.bucket_count === 0)
    ? tx("未同步")
    : String(account.bucket_count)
}

type Props = {
  accounts: StorageAccount[]
  account: StorageAccount | undefined
  accountId: string
  onSelect: (id: string) => void
  canSync: boolean
  syncing: boolean
  syncingId: string | undefined
  isFetching: boolean
  onSync: (id: string) => void
  onRefresh: () => void
}

export function BucketAccountSwitcher({
  accounts,
  account,
  accountId,
  onSelect,
  canSync,
  syncing,
  syncingId,
  isFetching,
  onSync,
  onRefresh,
}: Props) {
  const tx = useObjectTranslation()
  const vendorColumns = useVendorColumns()
  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5 border-b px-2 py-2 md:hidden">
        <Select value={accountId} onValueChange={onSelect}>
          <SelectTrigger
            size="sm"
            className="min-w-0 flex-1"
            aria-label={tx("厂商")}
          >
            <SelectValue
              className="min-w-0 flex-1"
              placeholder={tx("选择厂商")}
            >
              {account ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <img
                    src={`/storage-providers/${account.provider}.svg`}
                    alt=""
                    aria-hidden="true"
                    className="size-4 shrink-0 object-contain"
                  />
                  <span className="min-w-0 truncate font-medium">
                    {account.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className="ml-auto px-1.5 text-[11px] font-normal"
                  >
                    {bucketCountLabel(account, tx)}
                  </Badge>
                </span>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-(--radix-select-trigger-width)">
            {accounts.map((vendor) => (
              <SelectItem
                key={vendor.id}
                value={vendor.id}
                textValue={`${vendor.name} ${bucketCountLabel(vendor, tx)}`}
                className="py-1.5 pr-10"
              >
                <span className="flex min-w-0 w-full items-center gap-1.5">
                  <img
                    src={`/storage-providers/${vendor.provider}.svg`}
                    alt=""
                    aria-hidden="true"
                    className="size-4 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {vendor.name}
                    {!vendor.enabled ? tx("（已停用）") : ""}
                  </span>
                  <Badge
                    variant="secondary"
                    className="px-1.5 text-[11px] font-normal"
                  >
                    {bucketCountLabel(vendor, tx)}
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canSync && (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={tx("同步云端")}
            disabled={!account?.enabled || syncing}
            onClick={() => onSync(accountId)}
          >
            <RefreshCwIcon
              className={
                syncing && syncingId === accountId
                  ? "animate-spin motion-reduce:animate-none"
                  : undefined
              }
            />
          </Button>
        )}
      </div>
      <aside className="hidden h-72 min-h-0 w-full shrink-0 flex-col border-b bg-background md:flex md:h-auto md:w-56 md:border-r md:border-b-0 lg:w-60">
        <div className="min-h-0 flex-1">
          <ResourceTable
            compact
            columns={vendorColumns}
            data={accounts}
            emptyLabel={tx("暂无厂商配置")}
            getRowClassName={(vendor) =>
              vendor.id === accountId
                ? "group/vendor-row bg-primary/5 hover:bg-primary/10"
                : "group/vendor-row"
            }
            getRowId={(vendor) => vendor.id}
            isFetching={isFetching}
            isLoading={false}
            onRefresh={() => {
              if (canSync && account?.enabled) onSync(accountId)
              else onRefresh()
            }}
            onRowClick={(vendor) => onSelect(vendor.id)}
            onSearchChange={() => undefined}
            onStatusFilterChange={() => undefined}
            inlineActions
            actionsLabel={tx("桶数量")}
            renderRowActions={(vendor) => {
              const vendorCanSync = canSync && vendor.enabled
              const vendorSyncing = syncing && syncingId === vendor.id
              const count = bucketCountLabel(vendor, tx)
              return (
                <div className="grid h-7 min-w-7 items-center justify-items-center">
                  <span
                    className={`[grid-area:1/1] text-xs tabular-nums text-muted-foreground transition-opacity ${vendorCanSync && !syncing ? "group-hover/vendor-row:opacity-0 group-focus-within/vendor-row:opacity-0 [@media(hover:none)]:opacity-0" : ""} ${vendorSyncing ? "opacity-0" : ""}`}
                    title={tx("桶数量")}
                  >
                    {count}
                  </span>
                  {vendorCanSync && (!syncing || vendorSyncing) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={`relative z-10 [grid-area:1/1] size-7 transition-opacity ${vendorSyncing ? "opacity-100" : "pointer-events-none opacity-0 group-hover/vendor-row:pointer-events-auto group-hover/vendor-row:opacity-100 group-focus-within/vendor-row:pointer-events-auto group-focus-within/vendor-row:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"}`}
                      aria-label={vendor.name + tx(" 同步")}
                      disabled={syncing}
                      aria-busy={vendorSyncing}
                      title={tx("同步云端")}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation()
                        onSync(vendor.id)
                      }}
                    >
                      <RefreshCwIcon
                        className={
                          vendorSyncing
                            ? "animate-spin motion-reduce:animate-none"
                            : undefined
                        }
                      />
                    </Button>
                  )}
                </div>
              )
            }}
            searchPlaceholder=""
            searchValue=""
            showToolbar={false}
            statusFilter="all"
            statusFilterOptions={[]}
          />
        </div>
      </aside>
    </>
  )
}
