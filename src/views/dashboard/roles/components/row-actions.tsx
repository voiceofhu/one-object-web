import {
  KeyRoundIcon,
  MoreHorizontalIcon,
  PencilIcon,
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

export function RoleRowActions({
  locale,
  canSetPermissions,
  canEdit,
  canDelete,
  onPermissions,
  onEdit,
  onDelete,
}: {
  locale: "zh-CN" | "en-US"
  canSetPermissions: boolean
  canEdit: boolean
  canDelete: boolean
  onPermissions: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  if (!canSetPermissions && !canEdit && !canDelete) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" className="size-7">
          <MoreHorizontalIcon />
          <span className="sr-only">
            {locale === "zh-CN" ? "角色操作" : "Role actions"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          {canSetPermissions ? (
            <DropdownMenuItem onSelect={onPermissions}>
              <KeyRoundIcon />
              {locale === "zh-CN" ? "配置权限" : "Permissions"}
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon />
              {locale === "zh-CN" ? "编辑" : "Edit"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        {canDelete && (canSetPermissions || canEdit) ? (
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
