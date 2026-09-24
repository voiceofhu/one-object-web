import type { ColumnDef } from "@tanstack/react-table"

type ColumnMeta = {
  label?: string
  headerClassName?: string
  cellClassName?: string
}

export function getColumnMeta<TData>(column: {
  columnDef: ColumnDef<TData>
}): ColumnMeta {
  return (column.columnDef.meta ?? {}) as ColumnMeta
}

export function countRows<TData>(
  rows: TData[],
  getSubRows: (row: TData) => TData[] | undefined,
): number {
  return rows.reduce(
    (count, row) => count + 1 + countRows(getSubRows(row) ?? [], getSubRows),
    0,
  )
}
