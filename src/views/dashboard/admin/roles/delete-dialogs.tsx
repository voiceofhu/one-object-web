import { useTranslation } from "@/components/providers/language-context"
import { DialogActionButton } from "@/components/ui/dialog-action-button"
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import type { IdentityRole } from "@/views/dashboard/admin/api/rbac-api"

export function DeleteRoleDialog({
  role,
  deleting,
  onConfirm,
  onOpenChange,
}: {
  role: IdentityRole | null
  deleting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const { locale } = useTranslation()
  return (
    <ResponsiveDialog open={role !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {locale === "zh-CN" ? "删除角色" : "Delete role"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {locale === "zh-CN"
              ? `确定删除“${role?.role_name ?? ""}”吗？`
              : `Delete “${role?.role_name ?? ""}”?`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <DialogActionButton
              action="cancel"
              disabled={deleting}
              type="button"
              variant="outline"
            >
              {locale === "zh-CN" ? "取消" : "Cancel"}
            </DialogActionButton>
          </ResponsiveDialogClose>
          <DialogActionButton
            disabled={deleting}
            onClick={onConfirm}
            variant="destructive"
          >
            {locale === "zh-CN" ? "删除" : "Delete"}
          </DialogActionButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

export function BulkDeleteRolesDialog({
  roles,
  deleting,
  onConfirm,
  onOpenChange,
}: {
  roles: IdentityRole[] | null
  deleting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const { locale } = useTranslation()
  return (
    <ResponsiveDialog open={roles !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {locale === "zh-CN" ? "批量删除角色" : "Delete roles"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {locale === "zh-CN"
              ? `确定删除选中的 ${roles?.length ?? 0} 个角色吗？`
              : `Delete ${roles?.length ?? 0} selected roles?`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <DialogActionButton
              action="cancel"
              disabled={deleting}
              type="button"
              variant="outline"
            >
              {locale === "zh-CN" ? "取消" : "Cancel"}
            </DialogActionButton>
          </ResponsiveDialogClose>
          <DialogActionButton
            disabled={deleting}
            onClick={onConfirm}
            variant="destructive"
          >
            {locale === "zh-CN" ? "删除" : "Delete"}
          </DialogActionButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
