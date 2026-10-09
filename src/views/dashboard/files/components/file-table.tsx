import { OwnerTag } from "@/components/owner-tag"
import { useObjectTranslation } from "@/local/object"
import { NameTooltip } from "./name-tooltip"
import { useMemo } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { FileActions } from "./file-actions"
import { FileIcon } from "./file-icon"
import { fromUnixTime } from "date-fns"
import { useTranslation } from "@/components/providers/language-context"
import { useCurrentTime } from "@/hooks/use-current-time"
import { bytes, date, relativeTime } from "@/lib/format"
import type { ObjectFile } from "../api"
export function FileTable({
  data,
  onDelete,
  pending,
  showBucketColumn = true,
}: {
  data: ObjectFile[]
  onDelete?: (file: ObjectFile) => void
  pending: boolean
  showBucketColumn?: boolean
}) {
  const tx = useObjectTranslation()
  const { locale } = useTranslation()
  const now = useCurrentTime()

  const columns = useMemo<ColumnDef<ObjectFile>[]>(() => {
    const columns: ColumnDef<ObjectFile>[] = [
      {
        accessorKey: "original_filename",
        header: tx("文件名"),
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-2">
            <FileIcon
              name={row.original.original_filename}
              mimeType={row.original.mime_type}
              href={`/api/files/${encodeURIComponent(row.original.id)}/download`}
            />
            <NameTooltip
              name={row.original.original_filename}
              className="max-w-80"
            />
            <OwnerTag name={row.original.owner_name} className="shrink-0" />
          </span>
        ),
      },
      { accessorKey: "bucket_name", header: tx("存储桶") },
      {
        accessorKey: "file_size",
        header: tx("大小"),
        cell: ({ row }) => bytes(row.original.file_size),
      },
      {
        accessorKey: "app_id",
        header: tx("来源"),
        cell: ({ row }) => (
          <span className="block max-w-36 truncate" title={row.original.app_id}>
            {row.original.app_id === "console"
              ? tx("管理后台")
              : row.original.app_id}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: tx("上传时间"),
        cell: ({ row }) => (
          <time
            className="whitespace-nowrap"
            dateTime={fromUnixTime(row.original.created_at).toISOString()}
            title={date(row.original.created_at)}
          >
            {relativeTime(fromUnixTime(row.original.created_at), now, locale)}
          </time>
        ),
      },
      {
        id: "actions",
        header: tx("操作"),
        cell: ({ row }) => (
          <FileActions
            name={row.original.original_filename}
            href={`/api/files/${encodeURIComponent(row.original.id)}/download`}
            onDelete={onDelete ? () => onDelete(row.original) : undefined}
            pending={pending}
          />
        ),
      },
    ]
    return showBucketColumn
      ? columns
      : columns.filter((_, index) => index !== 1)
  }, [tx, onDelete, pending, showBucketColumn, locale, now])
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table exposes stateful helpers by design.
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    manualFiltering: true,
  })
  return (
    <div className="min-w-0 overflow-x-auto">
      <Table className="min-w-[40rem]">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={
                    header.column.id === "actions"
                      ? "sticky right-0 z-10 w-12 bg-background text-center"
                      : undefined
                  }
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
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  className={
                    cell.column.id === "actions"
                      ? "sticky right-0 z-10 w-12 bg-background py-1 text-center"
                      : "py-1"
                  }
                  key={cell.id}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
