import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table"
import * as React from "react"

import { MIN_PAGE_SIZE } from "@/lib/pagination"
import { useTranslation } from "@/components/providers/language-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ResourceTableFooter } from "@/components/resource-table/footer"
import {
  ResourceTableDragHandle,
  SortableResourceTableRow,
  TreeCell,
} from "@/components/resource-table/parts"
import { countRows, getColumnMeta } from "@/components/resource-table/helpers"
import {
  ResourceTableToolbar,
  type ResourceTableFilterOption,
} from "@/components/resource-table/toolbar"

type StatusFilter = "all" | "active" | "disabled"

type ResourceTableProps<TData, TFilter extends string = StatusFilter> = {
  data: TData[]
  columns: ColumnDef<TData>[]
  searchValue: string
  onSearchChange: (value: string) => void
  statusFilter: TFilter
  onStatusFilterChange: (value: TFilter) => void
  statusFilterLabel?: string
  statusFilterOptions?: readonly ResourceTableFilterOption<TFilter>[]
  statusFilterControl?: "segmented" | "select"
  searchPlaceholder: string
  isLoading?: boolean
  isFetching?: boolean
  error?: unknown
  onRefreshAnimationIteration?: () => void
  onRefresh: () => void
  onCreate?: () => void
  createLabel?: string
  emptyLabel: React.ReactNode
  getRowId: (row: TData) => string
  getSubRows?: (row: TData) => TData[] | undefined
  treeColumnId?: string
  renderRowActions?: (row: TData) => React.ReactNode
  stickyActions?: boolean
  inlineActions?: boolean
  actionsLabel?: string
  onRowClick?: (row: TData) => void
  getRowClassName?: (row: TData) => string | undefined
  getRowCanSelect?: (row: TData) => boolean
  onBulkDelete?: (rows: TData[], clearSelection: () => void) => void
  isBulkDeleting?: boolean
  onRowReorder?: (event: {
    active: TData
    over: TData
    orderedRecords: TData[]
  }) => Promise<unknown> | void
  isRowReordering?: boolean
  showPaginationControls?: boolean
  showToolbar?: boolean
  fitContent?: boolean
  compact?: boolean
  stackedToolbar?: boolean
  toolbarActions?: React.ReactNode
}

export function ResourceTable<TData, TFilter extends string = StatusFilter>({
  data,
  columns,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusFilterLabel,
  statusFilterOptions,
  statusFilterControl = "segmented",
  searchPlaceholder,
  isLoading = false,
  isFetching = false,
  error,
  onRefresh,
  onRefreshAnimationIteration,
  onCreate,
  createLabel,
  emptyLabel,
  getRowId,
  getSubRows,
  treeColumnId,
  renderRowActions,
  stickyActions = true,
  inlineActions = false,
  actionsLabel,
  onRowClick,
  getRowClassName,
  getRowCanSelect,
  onBulkDelete,
  isBulkDeleting = false,
  onRowReorder,
  isRowReordering = false,
  showPaginationControls = true,
  showToolbar = true,
  fitContent = false,
  compact = false,
  stackedToolbar = false,
  toolbarActions,
}: ResourceTableProps<TData, TFilter>) {
  const { locale } = useTranslation()
  const zh = locale === "zh-CN"
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [expanded, setExpanded] = React.useState<ExpandedState>(true)
  const enableSelection = Boolean(onBulkDelete)
  const enableRowReorder = Boolean(onRowReorder)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const tableColumns = React.useMemo<ColumnDef<TData>[]>(() => {
    const next = [...columns]
    if (enableSelection) {
      next.unshift({
        id: "select",
        enableHiding: false,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            aria-label={zh ? "选择当前页" : "Select current page"}
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(value === true)
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={zh ? "选择当前行" : "Select row"}
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(value) => row.toggleSelected(value === true)}
          />
        ),
        meta: { label: zh ? "选择" : "Select", headerClassName: "w-10" },
      })
    }
    if (enableRowReorder) {
      next.unshift({
        id: "reorder",
        enableHiding: false,
        enableSorting: false,
        header: "",
        cell: () => <ResourceTableDragHandle disabled={isRowReordering} />,
        meta: {
          label: zh ? "排序" : "Order",
          headerClassName: "w-10",
          cellClassName: "w-10",
        },
      })
    }
    if (renderRowActions) {
      next.push({
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () =>
          actionsLabel ??
          (inlineActions ? (
            <span className="sr-only">{zh ? "操作" : "Actions"}</span>
          ) : zh ? (
            "操作"
          ) : (
            "Actions"
          )),
        cell: ({ row }) => renderRowActions(row.original),
        meta: {
          label: actionsLabel ?? (zh ? "操作" : "Actions"),
          headerClassName: inlineActions
            ? actionsLabel
              ? "w-16 text-center"
              : "w-12 text-right"
            : stickyActions
              ? "sticky right-0 z-20 w-20 border-l bg-muted text-right"
              : "w-20 border-l bg-muted text-right",
          cellClassName: inlineActions
            ? actionsLabel
              ? "w-16 text-center"
              : "w-12 text-right"
            : stickyActions
              ? "sticky right-0 z-10 border-l bg-background text-right"
              : "w-20 border-l bg-background text-right",
        },
      })
    }
    return next
  }, [
    columns,
    enableRowReorder,
    enableSelection,
    isRowReordering,
    renderRowActions,
    stickyActions,
    inlineActions,
    actionsLabel,
    zh,
  ])

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table exposes stateful helpers by design.
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { columnVisibility, rowSelection, expanded },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSubRows,
    getRowId,
    enableSorting: false,
    enableRowSelection: enableSelection
      ? (row) => getRowCanSelect?.(row.original) ?? true
      : false,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: showPaginationControls ? MIN_PAGE_SIZE : 1_000,
      },
    },
  })

  const rows = table.getRowModel().rows
  const selectedRows = table
    .getSelectedRowModel()
    .rows.filter((row) => row.getCanSelect())
  const selectedRecords = selectedRows.map((row) => row.original)
  const expandableRows = rows.filter((row) => row.getCanExpand())
  const allRowsExpanded =
    expandableRows.length > 0 &&
    expandableRows.every((row) => row.getIsExpanded())
  const pageCount = Math.max(table.getPageCount(), 1)
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalRows = getSubRows ? countRows(data, getSubRows) : data.length
  const showPaginationFooter =
    showPaginationControls && totalRows >= MIN_PAGE_SIZE
  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const lastRow = showPaginationControls
    ? Math.min((pageIndex + 1) * pageSize, totalRows)
    : totalRows
  const errorText =
    error instanceof Error ? error.message : error ? String(error) : null
  const filterOptions =
    statusFilterOptions ??
    ([
      { label: zh ? "全部" : "All", value: "all" },
      { label: zh ? "启用" : "Active", value: "active" },
      { label: zh ? "停用" : "Disabled", value: "disabled" },
    ] as unknown as ResourceTableFilterOption<TFilter>[])

  function handleDragEnd(event: DragEndEvent) {
    if (!onRowReorder || !event.over || event.active.id === event.over.id)
      return
    const oldIndex = rows.findIndex((row) => row.id === String(event.active.id))
    const newIndex = rows.findIndex((row) => row.id === String(event.over?.id))
    if (oldIndex < 0 || newIndex < 0) return
    const orderedRows = arrayMove(rows, oldIndex, newIndex)
    void Promise.resolve(
      onRowReorder({
        active: rows[oldIndex].original,
        over: rows[newIndex].original,
        orderedRecords: orderedRows.map((row) => row.original),
      }),
    ).catch(() => undefined)
  }

  return (
    <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {showToolbar ? (
        <ResourceTableToolbar
          allRowsExpanded={allRowsExpanded}
          compact={compact}
          createLabel={createLabel}
          filterOptions={filterOptions}
          hasExpandableRows={Boolean(getSubRows && expandableRows.length > 0)}
          isFetching={isFetching}
          onCreate={onCreate}
          onRefresh={onRefresh}
          onRefreshAnimationIteration={onRefreshAnimationIteration}
          onSearchChange={(value) => {
            table.setPageIndex(0)
            setRowSelection({})
            onSearchChange(value)
          }}
          onStatusFilterChange={(value) => {
            table.setPageIndex(0)
            setRowSelection({})
            onStatusFilterChange(value)
          }}
          onToggleExpanded={() => setExpanded(allRowsExpanded ? {} : true)}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          statusFilter={statusFilter}
          statusFilterControl={statusFilterControl}
          statusFilterLabel={statusFilterLabel}
          stackedToolbar={stackedToolbar}
          table={table}
          toolbarActions={toolbarActions}
          zh={zh}
        />
      ) : null}

      {errorText ? (
        <div className="m-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorText}
        </div>
      ) : null}

      {isLoading ? (
        <div className={cn("space-y-3", compact ? "p-3" : "p-4")}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-72 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          {searchValue.trim() || statusFilter !== "all"
            ? zh
              ? "没有匹配的结果"
              : "No matching results"
            : emptyLabel}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <Table
              className={cn(
                fitContent ? "w-max min-w-0" : "min-w-full",
                inlineActions && "[&_tbody_tr:last-child]:border-b",
                compact &&
                  "[&_td]:h-10 [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:h-9 [&_th]:px-2.5",
              )}
            >
              <TableHeader className="bg-muted [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = getColumnMeta(header.column)
                      return (
                        <TableHead
                          key={header.id}
                          className={meta.headerClassName}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={rows.map((row) => row.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {rows.map((row) => (
                    <SortableResourceTableRow
                      key={row.id}
                      row={row}
                      disabled={!enableRowReorder || isRowReordering}
                      onClick={
                        onRowClick ? () => onRowClick(row.original) : undefined
                      }
                      className={getRowClassName?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = getColumnMeta(cell.column)
                        const content = flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )
                        return (
                          <TableCell
                            key={cell.id}
                            className={meta.cellClassName}
                            onClick={
                              cell.column.id === "actions" ||
                              cell.column.id === "select"
                                ? (event) => event.stopPropagation()
                                : undefined
                            }
                          >
                            {treeColumnId === cell.column.id ? (
                              <TreeCell row={row}>{content}</TreeCell>
                            ) : (
                              content
                            )}
                          </TableCell>
                        )
                      })}
                    </SortableResourceTableRow>
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>
      )}

      <ResourceTableFooter
        compact={compact}
        firstRow={firstRow}
        isBulkDeleting={isBulkDeleting}
        isFetching={isFetching}
        lastRow={lastRow}
        onBulkDelete={onBulkDelete}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        selectedRecords={selectedRecords}
        showPaginationFooter={showPaginationFooter}
        table={table}
        totalRows={totalRows}
        zh={zh}
      />
    </section>
  )
}
