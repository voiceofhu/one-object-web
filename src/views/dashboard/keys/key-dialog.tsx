import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listConnections, listAccounts } from "@/views/dashboard/storage/api"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "@/lib/toast"

import { useObjectTranslation } from "@/local/object"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { ImageCropUpload } from "@/components/image-crop-upload"
import { Input } from "@/components/ui/input"
import { DialogActionButton } from "@/components/ui/dialog-action-button"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { createKey, keyScopes, updateKey, type AppKey } from "./api"
import { AdminErrorAlert } from "@/views/dashboard/admin/shared/common"

const schema = z.object({
  logo: z.string().nullable(),
  scopes: z.array(z.string()).min(1, "至少选择一个权限"),
  storage_targets: z
    .array(
      z.object({
        storage_id: z.string().min(1, "请选择存储桶"),
        prefix: z.string().trim().max(900),
        weight: z.number().int().min(1).max(1000).optional(),
      }),
    )
    .min(1, "请选择存储桶"),
  name: z
    .string()
    .trim()
    .min(1, "请输入应用名称")
    .max(100, "名称最多 100 个字符"),
})
type Form = z.infer<typeof schema>
export type KeyDialogState =
  { kind: "create" } | { kind: "edit"; key: AppKey } | null

export function KeyDialog({
  dialog,
  permissions,
  onOpenChange,
}: {
  dialog: KeyDialogState
  permissions: string[]
  onOpenChange: (open: boolean) => void
}) {
  const tx = useObjectTranslation()
  const client = useQueryClient()
  const editing = dialog?.kind === "edit" ? dialog.key : undefined
  const canReadStorage =
    permissions.includes("object:storage:read") ||
    permissions.includes("object:bucket:read")
  const connections = useQuery({
    queryKey: ["storage-connections"],
    queryFn: ({ signal }) => listConnections(signal),
    enabled: !!dialog && canReadStorage,
  })
  const accounts = useQuery({
    queryKey: ["storage-accounts"],
    queryFn: ({ signal }) => listAccounts(signal),
    enabled: !!dialog && canReadStorage,
  })
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editing?.name ?? "",
      logo: editing?.logo ?? null,
      scopes:
        editing?.scopes ??
        ["uploads:write", "files:read"].filter((scope) =>
          permissions.includes(`object:${scope}`),
        ),
      storage_targets: editing?.storage_targets.length
        ? editing.storage_targets.map((target) => ({
            ...target,
            weight: target.weight ?? undefined,
          }))
        : [{ storage_id: "", prefix: "" }],
    },
  })
  const targets = useFieldArray({
    control: form.control,
    name: "storage_targets",
  })
  const logo = useWatch({ control: form.control, name: "logo" })
  const scopes = useWatch({ control: form.control, name: "scopes" })
  const mutation = useMutation({
    mutationFn: async (values: Form) => {
      const input = {
        ...values,
        storage_targets: values.storage_targets.map(
          ({ storage_id, prefix, weight }) => ({
            storage_id,
            weight,
            prefix: prefix ? `${prefix.replace(/\/+$/, "")}/` : "one-object/",
          }),
        ),
        expires_at: editing?.expires_at ?? null,
        load_balance: values.storage_targets.length > 1,
      }
      if (editing) {
        await updateKey(editing.id, input)
      } else {
        await createKey(input)
      }
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["keys"] })
      onOpenChange(false)
      toast.success(editing ? tx("授权已修改") : tx("授权已创建"))
    },
  })

  return (
    <ResponsiveDialog open={dialog !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90svh] flex-col sm:max-w-xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {editing ? tx("编辑授权") : tx("新增授权")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            {editing
              ? tx("修改授权信息不会生成新的 Token。")
              : tx("选择权限和存储桶，Token 默认不过期。")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="overflow-y-auto">
          <form
            id="key-editor-form"
            noValidate
            onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
          >
            <FieldGroup className="gap-5">
              <div className="flex items-start gap-3">
                <ImageCropUpload
                  value={logo}
                  seed={`one-object:app:${editing?.id ?? "new"}`}
                  onChange={(value) =>
                    form.setValue("logo", value, { shouldDirty: true })
                  }
                  disabled={mutation.isPending}
                />
                <Field
                  className="min-w-0 flex-1"
                  data-invalid={!!form.formState.errors.name}
                >
                  <FieldLabel htmlFor="key-name">
                    {tx("应用名称")}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </FieldLabel>
                  <Input
                    id="key-name"
                    className="h-11 text-base sm:h-9 sm:text-sm"
                    autoComplete="off"
                    maxLength={100}
                    required
                    aria-invalid={!!form.formState.errors.name}
                    {...form.register("name")}
                  />
                  <FieldError>
                    {form.formState.errors.name?.message
                      ? tx(form.formState.errors.name.message)
                      : null}
                  </FieldError>
                </Field>
              </div>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">
                  {tx("权限范围")}
                  <span aria-hidden="true" className="ml-1 text-destructive">
                    *
                  </span>
                </legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {keyScopes.map(([scope, label]) => (
                    <label
                      key={scope}
                      className="flex min-h-11 items-center gap-2 text-sm sm:min-h-8"
                    >
                      <Checkbox
                        checked={scopes.includes(scope)}
                        disabled={!permissions.includes(`object:${scope}`)}
                        onCheckedChange={(checked) =>
                          form.setValue(
                            "scopes",
                            checked
                              ? [...scopes, scope]
                              : scopes.filter((value) => value !== scope),
                            { shouldDirty: true, shouldValidate: true },
                          )
                        }
                      />
                      {tx(label)}
                    </label>
                  ))}
                </div>
                <FieldError>
                  {form.formState.errors.scopes?.message
                    ? tx(form.formState.errors.scopes.message)
                    : null}
                </FieldError>
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">
                  {tx("桶与文件夹")}
                  <span aria-hidden="true" className="ml-1 text-destructive">
                    *
                  </span>
                </legend>
                {targets.fields.map((target, index) => (
                  <div
                    key={target.id}
                    className="grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_auto]"
                  >
                    <Select
                      defaultValue={target.storage_id}
                      onValueChange={(value) =>
                        form.setValue(
                          `storage_targets.${index}.storage_id`,
                          value,
                          { shouldDirty: true, shouldValidate: true },
                        )
                      }
                      disabled={!canReadStorage}
                    >
                      <SelectTrigger
                        aria-label={tx("选择存储桶")}
                        aria-invalid={
                          !!form.formState.errors.storage_targets?.[index]
                            ?.storage_id
                        }
                        className="col-span-2 w-full min-w-0 max-sm:h-11 sm:col-span-1"
                      >
                        <SelectValue placeholder={tx("选择存储桶")} />
                      </SelectTrigger>
                      <SelectContent>
                        {connections.data?.items.map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            <span className="flex min-w-0 items-center gap-2">
                              <img
                                src={`/storage-providers/${connection.provider}.svg`}
                                alt=""
                                className="size-4 shrink-0"
                              />
                              <span className="truncate">
                                {accounts.data?.items.find(
                                  (account) =>
                                    account.id === connection.account_id,
                                )?.name ?? connection.name}{" "}
                                · {connection.bucket}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                        {target.storage_id &&
                        !connections.data?.items.some(
                          (connection) => connection.id === target.storage_id,
                        ) ? (
                          <SelectItem value={target.storage_id}>
                            {target.storage_id}
                          </SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-start-1 row-start-2 h-11 text-base sm:col-start-2 sm:row-start-1 sm:h-9 sm:text-sm"
                      aria-label={tx("文件夹前缀")}
                      placeholder="one-object/"
                      {...form.register(`storage_targets.${index}.prefix`)}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      step={1}
                      inputMode="numeric"
                      className="col-start-2 row-start-2 h-11 sm:col-start-3 sm:row-start-1 sm:h-9"
                      aria-label={tx("权重（可选）")}
                      placeholder="1"
                      {...form.register(`storage_targets.${index}.weight`, {
                        setValueAs: (value: string) =>
                          value === "" ? undefined : Number(value),
                      })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="col-start-3 row-start-1 size-11 sm:col-start-4 sm:size-9"
                      aria-label={tx("移除桶文件夹范围")}
                      disabled={targets.fields.length === 1}
                      onClick={() => targets.remove(index)}
                    >
                      <Trash2Icon />
                    </Button>
                    <FieldError className="col-span-full">
                      {form.formState.errors.storage_targets?.[index]
                        ?.storage_id?.message
                        ? tx("请选择存储桶")
                        : form.formState.errors.storage_targets?.[index]?.prefix
                            ?.message}
                    </FieldError>
                    <FieldError className="col-span-full">
                      {form.formState.errors.storage_targets?.[index]?.weight
                        ? tx("权重需为 1 到 1000 的整数")
                        : null}
                    </FieldError>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!canReadStorage}
                  onClick={() => targets.append({ storage_id: "", prefix: "" })}
                >
                  <PlusIcon />
                  {tx("添加存储桶")}
                </Button>
                {!canReadStorage ? (
                  <p className="text-xs text-destructive">
                    {tx("当前账号没有存储桶查看权限")}
                  </p>
                ) : null}
                {connections.error ? (
                  <AdminErrorAlert error={connections.error} />
                ) : null}
              </fieldset>
              {!editing && scopes.length === 0 ? (
                <p className="text-sm text-destructive">
                  {tx("当前账号没有可授予的应用权限。")}
                </p>
              ) : null}
              {mutation.error ? (
                <AdminErrorAlert error={mutation.error} />
              ) : null}
            </FieldGroup>
          </form>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="flex-row justify-end [&>button]:h-11 [&>button]:flex-1 sm:[&>button]:h-9 sm:[&>button]:flex-none">
          <ResponsiveDialogClose asChild>
            <DialogActionButton
              action="cancel"
              type="button"
              variant="outline"
              disabled={mutation.isPending}
            >
              {tx("取消")}
            </DialogActionButton>
          </ResponsiveDialogClose>
          <DialogActionButton
            type="submit"
            form="key-editor-form"
            disabled={mutation.isPending}
            loading={mutation.isPending}
            loadingText={tx("保存中…")}
          >
            {editing ? tx("保存") : tx("生成 Token")}
          </DialogActionButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
