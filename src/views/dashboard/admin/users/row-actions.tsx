import {
  MoreHorizontalIcon,
  PencilIcon,
  ShieldIcon,
  Trash2Icon,
} from "lucide-react"
import { useObjectTranslation } from "@/local/object"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserRowActions({
  name,
  permissions,
  disabled,
  onEdit,
  onRoles,
  onDelete,
}: {
  name: string
  permissions: string[]
  disabled: boolean
  onEdit: () => void
  onRoles: () => void
  onDelete: () => void
}) {
  const tx = useObjectTranslation()
  const canEdit = permissions.includes("object:user:update")
  const canAssign =
    permissions.includes("object:user:assign") &&
    permissions.includes("object:role:list")
  const canDelete = permissions.includes("object:user:delete")
  if (!canEdit && !canAssign && !canDelete) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={tx("{0} 更多操作", { 0: name })}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon />
              {tx("编辑")}
            </DropdownMenuItem>
          ) : null}
          {canAssign ? (
            <DropdownMenuItem onSelect={onRoles}>
              <ShieldIcon />
              {tx("分配角色")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        {canDelete && (canEdit || canAssign) ? <DropdownMenuSeparator /> : null}
        {canDelete ? (
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2Icon />
              {tx("删除")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
