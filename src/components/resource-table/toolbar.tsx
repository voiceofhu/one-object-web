import { RefreshButton } from "@/components/refresh-button"
import type { Table as TanStackTable } from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import { AnimatedSegmentedTabs } from "@/components/ui/animated-segmented-tabs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

import { cn } from "@/lib/utils"
import { getColumnMeta } from "@/components/resource-table/helpers"

export type ResourceTableFilterOption<TValue extends string> = {
  label: ReactNode
  value: TValue
}

export function ResourceTableToolbar<TData, TFilter extends string>({
  allRowsExpanded,
  compact,
  createLabel,
  filterOptions,
  hasExpandableRows,
  isFetching,
  onCreate,
  onRefresh,
  onRefreshAnimationIteration,
  onSearchChange,
  onStatusFilterChange,
  onToggleExpanded,
  searchPlaceholder,
  searchValue,
  statusFilter,
  statusFilterControl: _statusFilterControl,
  statusFilterLabel,
  stackedToolbar,
  table,
  toolbarActions,
  zh,
}: {
  allRowsExpanded: boolean
  compact: boolean
  createLabel?: string
  filterOptions: readonly ResourceTableFilterOption<TFilter>[]
  hasExpandableRows: boolean
  isFetching: boolean
  onCreate?: () => void
  onRefreshAnimationIteration?: () => void
  onRefresh: () => void
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: TFilter) => void
  onToggleExpanded: () => void
  searchPlaceholder: string
  searchValue: string
  statusFilter: TFilter
  statusFilterControl: "segmented" | "select"
  statusFilterLabel?: string
  stackedToolbar: boolean
  table: TanStackTable<TData>
  toolbarActions?: ReactNode
  zh: boolean
}) {
  const filterControl =
    filterOptions.length > 0 ? (
      <AnimatedSegmentedTabs
        label={statusFilterLabel ?? (zh ? "状态筛选" : "Status filter")}
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        options={filterOptions}
      />
    ) : null
  const searchControl = (
    <InputGroup className="w-full max-w-sm sm:w-80">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={searchPlaceholder}
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </InputGroup>
  )
  const toolbarControls = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onRefreshAnimationIteration ? (
        <Button
          className="order-last"
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={onRefresh}
        >
          <RefreshCwIcon
            data-icon="inline-start"
            className={cn(isFetching && "animate-spin")}
            onAnimationIteration={onRefreshAnimationIteration}
          />
          {zh ? "刷新" : "Refresh"}
        </Button>
      ) : (
        <RefreshButton
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={onRefresh}
        >
          {zh ? "刷新" : "Refresh"}
        </RefreshButton>
      )}
      {onCreate ? (
        <Button type="button" size="sm" onClick={onCreate}>
          <PlusIcon data-icon="inline-start" />
          {createLabel ?? (zh ? "新增" : "Create")}
        </Button>
      ) : null}
      {hasExpandableRows ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleExpanded}
        >
          {allRowsExpanded ? (
            <ChevronsDownUpIcon data-icon="inline-start" />
          ) : (
            <ChevronsUpDownIcon data-icon="inline-start" />
          )}
          {allRowsExpanded
            ? zh
              ? "全部收起"
              : "Collapse all"
            : zh
              ? "全部展开"
              : "Expand all"}
        </Button>
      ) : null}
      {toolbarActions}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <SlidersHorizontalIcon data-icon="inline-start" />
            {zh ? "列" : "Columns"}
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {zh ? "显示列" : "Show columns"}
            </DropdownMenuLabel>
            {table
              .getAllLeafColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(value) =>
                    column.toggleVisibility(Boolean(value))
                  }
                >
                  {getColumnMeta(column).label ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <div
      className={cn(
        "flex shrink-0 gap-2 border-b bg-muted/40 px-3 lg:px-4",
        stackedToolbar
          ? "flex-col"
          : "flex-col sm:flex-row sm:items-center sm:justify-between",
        compact ? "py-2" : "py-3",
      )}
    >
      {stackedToolbar ? (
        <>
          <div className="min-w-0 overflow-x-auto">{filterControl}</div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            {searchControl}
            {toolbarControls}
          </div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            {filterControl}
            {searchControl}
          </div>
          {toolbarControls}
        </>
      )}
    </div>
  )
}
