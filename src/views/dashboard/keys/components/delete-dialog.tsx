import { useObjectTranslation } from "@/local/object"
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
import type { AppKey } from "@/views/dashboard/keys/api"

export function KeyDeleteDialog({
  keyToDelete,
  pending,
  onConfirm,
  onOpenChange,
}: {
  keyToDelete: AppKey | null
  pending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const tx = useObjectTranslation()
  return (
    <ResponsiveDialog open={keyToDelete !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="sm:max-w-md"
        showCloseButton={!pending}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{tx("删除授权")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {tx(
              "删除后 Token 永久失效，授权不可恢复。已上传文件保留，不会删除。",
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="px-4 py-3 text-sm font-medium">{keyToDelete?.name}</div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <DialogActionButton
              action="cancel"
              type="button"
              variant="outline"
              disabled={pending}
            >
              {tx("取消")}
            </DialogActionButton>
          </ResponsiveDialogClose>
          <DialogActionButton
            variant="destructive"
            disabled={!keyToDelete || pending}
            loading={pending}
            loadingText={tx("删除中…")}
            onClick={onConfirm}
          >
            {tx("确认删除")}
          </DialogActionButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
