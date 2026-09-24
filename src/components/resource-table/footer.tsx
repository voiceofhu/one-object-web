import type { Table as TanStackTable } from "@tanstack/react-table"
import { Trash2Icon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TablePagination } from "@/components/table-pagination"

export function ResourceTableFooter<TData>({
  isBulkDeleting,
  isFetching,
  onBulkDelete,
  pageIndex,
  pageSize,
  selectedRecords,
  showPaginationFooter,
  table,
  totalRows,
  zh,
}: {
  compact: boolean
  firstRow: number
  isBulkDeleting: boolean
  isFetching: boolean
  lastRow: number
  onBulkDelete?: (rows: TData[], clearSelection: () => void) => void
  pageCount: number
  pageIndex: number
  pageSize: number
  selectedRecords: TData[]
  showPaginationFooter: boolean
  table: TanStackTable<TData>
  totalRows: number
  zh: boolean
}) {
  return (
    <>
      {showPaginationFooter ? (
        <TablePagination
          total={totalRows}
          page={pageIndex + 1}
          pageSize={pageSize}
          onPageChange={(page) => table.setPageIndex(page - 1)}
          onPageSizeChange={(size) => table.setPageSize(size)}
          disabled={isFetching}
          zh={zh}
        />
      ) : null}

      {selectedRecords.length > 0 ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 z-30 flex justify-center px-4",
            showPaginationFooter ? "bottom-16" : "bottom-4",
          )}
        >
          <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-xl bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            <span className="text-muted-foreground">
              {zh ? "已选择 " : "Selected "}
              <span className="font-medium tabular-nums">
                {selectedRecords.length}
              </span>
              {zh ? " 项" : " items"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBulkDeleting}
              onClick={() => table.resetRowSelection()}
            >
              <XIcon data-icon="inline-start" />
              {zh ? "取消选择" : "Clear"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBulkDeleting}
              onClick={() =>
                onBulkDelete?.(selectedRecords, () => table.resetRowSelection())
              }
            >
              <Trash2Icon data-icon="inline-start" />
              {zh ? "批量删除" : "Delete"}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
