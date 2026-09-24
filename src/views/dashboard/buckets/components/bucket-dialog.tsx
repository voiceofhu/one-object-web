import { DialogActionButton } from "@/components/ui/dialog-action-button"
import { useLocalAtom } from "@/hooks/use-local-atom"

import { useObjectTranslation } from "@/local/object"

import { useMutation } from "@tanstack/react-query"

import { toast } from "@/lib/toast"

import { SweepShine } from "@/components/sweep-shine"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"

import { Input } from "@/components/ui/input"

import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"

import { createBucket, deleteBucket, type Bucket } from "../api"

export function BucketDialog({
  accountId,
  provider,
  defaultRegion,
  value,
  close,
  saved,
}: {
  accountId: string
  provider: string
  defaultRegion: string
  value: "new" | Bucket
  close: () => void
  saved: () => Promise<void>
}) {
  const tx = useObjectTranslation()

  const creating = value === "new"
  const [name, setName] = useLocalAtom("")
  const [region, setRegion] = useLocalAtom(defaultRegion)
  const mutation = useMutation({
    mutationFn: async () => {
      if (creating) await createBucket(accountId, name.trim(), region.trim())
      else await deleteBucket(accountId, value.bucket, name)
    },
    onSuccess: async () => {
      toast.success(creating ? tx("云端存储桶已创建") : tx("云端存储桶已删除"))
      await saved()
      close()
    },
    onError: (error) => toast.error(tx(error.message)),
  })
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close()
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {creating ? tx("创建云端存储桶") : tx("删除云端存储桶")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {creating
              ? tx("选择存储桶区域，创建私有桶并接入文件上传。")
              : tx("将直接删除云端桶「") +
                value.bucket +
                tx(
                  "」。仅支持空桶；存在文件、历史版本或未完成分片时会拒绝删除。",
                )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate()
          }}
        >
          <ResponsiveDialogBody className="space-y-4">
            {creating && !["r2", "oci"].includes(provider) && (
              <Field>
                <FieldLabel htmlFor="bucket-region">{tx("桶区域")}</FieldLabel>
                <Input
                  id="bucket-region"
                  required
                  value={region}
                  disabled={mutation.isPending}
                  onChange={(event) => setRegion(event.target.value)}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="bucket-name">
                {creating ? tx("桶名称") : tx("输入完整桶名确认删除")}
              </FieldLabel>
              <Input
                id="bucket-name"
                required
                autoComplete="off"
                disabled={mutation.isPending}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={provider === "oci" ? 256 : 63}
                placeholder={
                  creating
                    ? provider === "tencent"
                      ? "example-1250000000"
                      : "example-bucket"
                    : value.bucket
                }
              />
              {creating && (
                <FieldDescription>
                  {provider === "oci"
                    ? tx("使用 1–256 位大小写字母、数字、连字符、下划线和点号")
                    : tx("使用 3–63 位小写字母、数字和连字符")}
                  {provider === "aws" ? tx("，也可包含点号") : ""}
                  {provider === "tencent" ? tx("，并包含 APPID 后缀") : ""}。
                </FieldDescription>
              )}
            </Field>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <DialogActionButton
              action="cancel"
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={close}
            >
              {tx("取消")}
            </DialogActionButton>
            <DialogActionButton
              type="submit"
              variant={creating ? "default" : "destructive"}
              disabled={
                mutation.isPending ||
                !name.trim() ||
                (!creating && name !== value.bucket)
              }
            >
              <SweepShine active={mutation.isPending}>
                {creating ? tx("创建") : tx("确认删除云端桶")}
              </SweepShine>
            </DialogActionButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
