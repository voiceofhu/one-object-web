import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Row } from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GripVerticalIcon,
} from "lucide-react"
import * as React from "react"

import { useTranslation } from "@/components/providers/language-context"
import { Button } from "@/components/ui/button"
import { TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type SortableControls = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef"
> & { disabled: boolean }

const SortableRowContext = React.createContext<SortableControls | null>(null)

export function SortableResourceTableRow<TData>({
  row,
  disabled,
  onClick,
  className,
  children,
}: {
  row: Row<TData>
  disabled: boolean
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: row.id, disabled })
  const controls = React.useMemo(
    () => ({ attributes, disabled, listeners, setActivatorNodeRef }),
    [attributes, disabled, listeners, setActivatorNodeRef],
  )
  return (
    <SortableRowContext.Provider value={controls}>
      <TableRow
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          zIndex: isDragging ? 1 : undefined,
        }}
        onClick={onClick}
        data-state={row.getIsSelected() ? "selected" : undefined}
        className={cn(
          className,
          onClick && "cursor-pointer",
          isDragging && "relative bg-muted/80 shadow-sm",
        )}
      >
        {children}
      </TableRow>
    </SortableRowContext.Provider>
  )
}

/* eslint-disable react-hooks/refs -- dnd-kit exposes activator bindings through context, not mutable React ref values. */
export function ResourceTableDragHandle({ disabled }: { disabled: boolean }) {
  const { locale } = useTranslation()
  const controls = React.useContext(SortableRowContext)
  if (!controls) return null
  return (
    <Button
      ref={controls.setActivatorNodeRef}
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled || controls.disabled}
      className="cursor-grab text-muted-foreground active:cursor-grabbing"
      aria-label={locale === "zh-CN" ? "拖拽调整排序" : "Drag to reorder"}
      {...controls.attributes}
      {...controls.listeners}
    >
      <GripVerticalIcon />
    </Button>
  )
}
/* eslint-enable react-hooks/refs */

export function TreeCell<TData>({
  row,
  children,
}: {
  row: Row<TData>
  children: React.ReactNode
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-1.5"
      style={{ paddingLeft: row.depth * 20 }}
    >
      {row.getCanExpand() ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-expanded={row.getIsExpanded()}
          onClick={row.getToggleExpandedHandler()}
        >
          {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Button>
      ) : (
        <span className="size-6 shrink-0" />
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function PageButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button type="button" variant="outline" size="icon-sm" {...props}>
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  )
}
