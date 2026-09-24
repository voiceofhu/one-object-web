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
import type { IdentityPermission } from "@/views/dashboard/admin/api/rbac-api"

export function DeletePermissionDialog({
  permission,
  deleting,
  onConfirm,
  onOpenChange,
}: {
  permission: IdentityPermission | null
  deleting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const { locale } = useTranslation()
  return (
    <ResponsiveDialog open={permission !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {locale === "zh-CN" ? "删除权限" : "Delete permission"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {locale === "zh-CN"
              ? `确定删除“${permission?.permission_name ?? ""}”吗？`
              : `Delete “${permission?.permission_name ?? ""}”?`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <DialogActionButton
              action="cancel"
              type="button"
              variant="outline"
              disabled={deleting}
            >
              {locale === "zh-CN" ? "取消" : "Cancel"}
            </DialogActionButton>
          </ResponsiveDialogClose>
          <DialogActionButton
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {locale === "zh-CN" ? "删除" : "Delete"}
          </DialogActionButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
