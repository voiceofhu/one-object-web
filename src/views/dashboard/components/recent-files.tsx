import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { Link } from "react-router"
import { TextLink } from "@/components/text-link"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { fromUnixTime } from "date-fns"
import { useTranslation } from "@/components/providers/language-context"
import { useCurrentTime } from "@/hooks/use-current-time"
import { bytes, date, relativeTime } from "@/lib/format"
import { useObjectTranslation } from "@/local/object"
import type { ObjectFile } from "../files/api"
import { fileLocationHref } from "../files/location"

export function RecentFiles({ files }: { files: ObjectFile[] }) {
  const tx = useObjectTranslation()
  const { locale } = useTranslation()
  const now = useCurrentTime()
  const columns: ColumnDef<ObjectFile>[] = [
    {
      accessorKey: "original_filename",
      header: tx("文件名"),
      cell: ({ row: { original: file } }) =>
        file.browse_storage_id ? (
          <TextLink asChild tooltip={file.original_filename}>
            <Link
              to={fileLocationHref(file.browse_storage_id, file.object_key)}
              className="block max-w-64 truncate"
            >
              {file.original_filename}
            </Link>
          </TextLink>
        ) : (
          <span
            className="block max-w-64 truncate"
            title={tx("未找到对应存储接入")}
          >
            {file.original_filename}
          </span>
        ),
    },
    {
      accessorKey: "file_size",
      header: tx("大小"),
      cell: ({ row }) => bytes(row.original.file_size),
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
  ]
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table owns row modeling.
  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (file) => file.id,
  })
  return (
    <Table className="min-w-[28rem]">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id}>
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
              <TableCell key={cell.id} className="whitespace-nowrap">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
