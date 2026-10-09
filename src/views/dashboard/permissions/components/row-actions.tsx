import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function PermissionRowActions({
  locale,
  canCreateChild,
  canEdit,
  canDelete,
  onCreateChild,
  onEdit,
  onDelete,
}: {
  locale: "zh-CN" | "en-US"
  canCreateChild: boolean
  canEdit: boolean
  canDelete: boolean
  onCreateChild: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" className="size-7">
          <MoreHorizontalIcon />
          <span className="sr-only">
            {locale === "zh-CN" ? "权限操作" : "Permission actions"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          {canCreateChild ? (
            <DropdownMenuItem onSelect={onCreateChild}>
              <PlusIcon />
              {locale === "zh-CN" ? "新增子权限" : "Create child"}
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon />
              {locale === "zh-CN" ? "编辑" : "Edit"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        {canDelete && (canCreateChild || canEdit) ? (
          <DropdownMenuSeparator />
        ) : null}
        {canDelete ? (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2Icon />
            {locale === "zh-CN" ? "删除" : "Delete"}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
