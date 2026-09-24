import { useObjectTranslation } from "@/local/object"

import { type ColumnDef } from "@tanstack/react-table"

import { type StorageAccount } from "@/views/dashboard/storage/api"

export function useVendorColumns(): ColumnDef<StorageAccount>[] {
  const tx = useObjectTranslation()
  return [
    {
      accessorKey: "name",
      header: tx("厂商"),
      cell: ({ row: { original: vendor } }) => (
        <div className="flex min-w-0 items-center gap-1.5">
          <img
            src={`/storage-providers/${vendor.provider}.svg`}
            alt=""
            aria-hidden="true"
            className="size-4 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate font-medium" title={vendor.name}>
              {vendor.name}
              {!vendor.enabled && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {tx("· 已停用")}
                </span>
              )}
            </p>
          </div>
        </div>
      ),
      meta: {
        label: tx("厂商"),
        cellClassName: "max-w-40 overflow-hidden",
      },
    },
  ]
}
