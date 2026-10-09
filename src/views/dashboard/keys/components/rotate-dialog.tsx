import { useObjectTranslation } from "@/local/object"
import { DialogActionButton } from "@/components/ui/dialog-action-button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from "@/components/ui/responsive-dialog"
import type { AppKey } from "@/views/dashboard/keys/api"

export function KeyRotateDialog({
  appKey,
  pending,
  onConfirm,
  onOpenChange,
}: {
  appKey: AppKey | null
  pending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const tx = useObjectTranslation()
  return (
    <ResponsiveDialog open={appKey !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="sm:max-w-md"
        showCloseButton={!pending}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{tx("轮换 Token")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {tx(
              "旧 Token 将立即失效，请将新 Token 更新到应用服务端。文件归属、权限和有效期保持不变。",
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="break-all text-sm font-medium">
          {appKey?.name}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <DialogActionButton
              action="cancel"
              variant="outline"
              disabled={pending}
            >
              {tx("取消")}
            </DialogActionButton>
          </ResponsiveDialogClose>
          <DialogActionButton
            disabled={pending || !appKey}
            loading={pending}
            onClick={onConfirm}
          >
            {tx("确认轮换")}
          </DialogActionButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
