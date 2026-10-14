import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { PAGE_SIZE_OPTIONS } from "@/lib/pagination"
export function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  hasNext,
  zh = true,
}: {
  total?: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  disabled?: boolean
  hasNext?: boolean
  zh?: boolean
}) {
  if (
    total !== undefined
      ? !Number.isFinite(total) || total < PAGE_SIZE_OPTIONS[0]
      : page === 1 && !hasNext
  )
    return null
  const pages =
    total === undefined ? undefined : Math.max(1, Math.ceil(total / pageSize))
  return (
    <footer className="flex min-h-9 shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-2 py-1 text-xs">
      <span className="text-muted-foreground">
        {total === undefined
          ? zh
            ? `第 ${page} 页`
            : `Page ${page}`
          : zh
            ? `共 ${total} 条记录`
            : `${total} records`}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        {onPageSizeChange && (
          <Select
            value={String(pageSize)}
            disabled={disabled}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              size="sm"
              aria-label={zh ? "每页条数" : "Rows per page"}
              className="min-w-24 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" side="top" align="end">
              <SelectGroup>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                    className="text-xs"
                  >
                    {size}
                    {zh ? "条/页" : " / page"}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={zh ? "首页" : "First page"}
          title={zh ? "首页" : "First page"}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={zh ? "上一页" : "Previous page"}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-12 text-center tabular-nums text-muted-foreground">
          {page}
          {pages === undefined ? "" : ` / ${pages}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={zh ? "下一页" : "Next page"}
          disabled={disabled || !(hasNext ?? page < (pages ?? 1))}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={zh ? "末页" : "Last page"}
          title={zh ? "末页" : "Last page"}
          disabled={disabled || pages === undefined || page >= pages}
          onClick={() => pages !== undefined && onPageChange(pages)}
        >
          <ChevronsRight />
        </Button>
      </div>
    </footer>
  )
}
