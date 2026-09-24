import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { toast } from "@/lib/toast"
import { z } from "zod"

import { useTranslation } from "@/components/providers/language-context"
import { SweepShine } from "@/components/sweep-shine"
import { Button } from "@/components/ui/button"
import { DialogActionButton } from "@/components/ui/dialog-action-button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { Textarea } from "@/components/ui/textarea"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import {
  createRole,
  rbacQueryKeys,
  updateRole,
  type IdentityPermission,
} from "@/views/dashboard/admin/api/rbac-api"
import { AdminErrorAlert } from "@/views/dashboard/admin/components/shared/common"
import { isSuperAdminRole } from "@/views/dashboard/admin/components/roles/helpers"
import { PermissionTree } from "@/views/dashboard/admin/components/roles/permissions-dialog"
import type {
  RoleDialog,
  RoleEditorValues,
} from "@/views/dashboard/admin/components/roles/types"

export function RoleEditorDialog({
  dialog,
  permissions,
  permissionsError,
  permissionsPending,
  onRetryPermissions,
  onOpenChange,
}: {
  dialog: RoleDialog
  permissions: IdentityPermission[]
  permissionsError: Error | null
  permissionsPending: boolean
  onRetryPermissions: () => void
  onOpenChange: (open: boolean) => void
}) {
  const { locale } = useTranslation()
  const queryClient = useQueryClient()
  const role = dialog?.kind === "edit" ? dialog.role : null
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    () => new Set(),
  )
  const [permissionValidationVisible, setPermissionValidationVisible] =
    useState(false)
  const form = useForm<RoleEditorValues>({
    defaultValues: {
      description: role?.description ?? "",
      role_key: role?.role_key ?? "",
      role_name: role?.role_name ?? "",
    },
    resolver: zodResolver(roleEditorSchema(locale)),
  })
  const mutation = useMutation({
    mutationFn: (values: RoleEditorValues) =>
      role
        ? updateRole({
            ...role,
            description: values.description,
            role_key: values.role_key,
            role_name: values.role_name,
          })
        : createRole({
            description: values.description,
            permission_ids: [...selectedPermissions].sort(),
            role_key: values.role_key,
            role_name: values.role_name,
          }),
    onSuccess: async () => {
      onOpenChange(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles }),
        queryClient.invalidateQueries({
          queryKey: authPermissionsQuery.queryKey,
        }),
      ])
      toast.success(
        role
          ? locale === "zh-CN"
            ? "角色已修改"
            : "Role updated"
          : locale === "zh-CN"
            ? "角色已创建"
            : "Role created",
      )
    },
  })
  const errors = form.formState.errors

  function submit(event: FormEvent<HTMLFormElement>) {
    void form.handleSubmit((values) => {
      if (!role && selectedPermissions.size === 0) {
        setPermissionValidationVisible(true)
        return
      }
      if (!mutation.isPending) mutation.mutate(values)
    })(event)
  }

  return (
    <ResponsiveDialog open={dialog !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[90svh] sm:max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {role
              ? locale === "zh-CN"
                ? "编辑角色"
                : "Edit role"
              : locale === "zh-CN"
                ? "新增角色"
                : "Create role"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {role
              ? locale === "zh-CN"
                ? "更新角色的基本信息；权限范围仍在“配置权限”中维护。"
                : "Update the role profile. Maintain its permission scope from Permissions."
              : locale === "zh-CN"
                ? "设置角色基本信息并选择权限。"
                : "Set the role profile and select its permissions."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="overflow-y-auto">
          <form
            className="flex flex-col gap-5 pb-2"
            id="role-editor-form"
            noValidate
            onSubmit={submit}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={Boolean(errors.role_name)}>
                <FieldLabel htmlFor="role-name">
                  <EditorRequiredMark locale={locale} />
                  {locale === "zh-CN" ? "角色名称" : "Role name"}
                </FieldLabel>
                <Input
                  aria-invalid={Boolean(errors.role_name)}
                  autoComplete="off"
                  disabled={mutation.isPending}
                  id="role-name"
                  maxLength={64}
                  placeholder={
                    locale === "zh-CN" ? "请输入角色名称" : "Role name"
                  }
                  {...form.register("role_name")}
                />
                <FieldError errors={[errors.role_name]} />
              </Field>
              <Field data-invalid={Boolean(errors.role_key)}>
                <FieldLabel htmlFor="role-key">
                  <EditorRequiredMark locale={locale} />
                  {locale === "zh-CN" ? "权限标识" : "Role key"}
                </FieldLabel>
                <Input
                  aria-invalid={Boolean(errors.role_key)}
                  autoComplete="off"
                  disabled={mutation.isPending || isSuperAdminRole(role)}
                  id="role-key"
                  maxLength={100}
                  placeholder={
                    locale === "zh-CN"
                      ? "例如 identity_admin"
                      : "For example, identity_admin"
                  }
                  {...form.register("role_key")}
                />
                <FieldError errors={[errors.role_key]} />
              </Field>
            </div>
            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="role-description">
                {locale === "zh-CN" ? "角色说明" : "Description"}
              </FieldLabel>
              <Textarea
                aria-invalid={Boolean(errors.description)}
                className="min-h-24 resize-none"
                disabled={mutation.isPending}
                id="role-description"
                maxLength={256}
                placeholder={
                  locale === "zh-CN" ? "请输入角色说明（可选）" : "Optional"
                }
                {...form.register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>
            {!role ? (
              <div>
                {permissionsPending ? (
                  <div className="rounded-lg border px-3 py-6 text-center text-sm text-muted-foreground">
                    {locale === "zh-CN"
                      ? "正在加载权限…"
                      : "Loading permissions…"}
                  </div>
                ) : permissionsError ? (
                  <div className="space-y-3">
                    <AdminErrorAlert error={permissionsError} />
                    <Button
                      onClick={onRetryPermissions}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {locale === "zh-CN" ? "重新加载" : "Retry"}
                    </Button>
                  </div>
                ) : (
                  <PermissionTree
                    disabled={mutation.isPending}
                    onChange={(value) => {
                      setSelectedPermissions(value)
                      if (value.size > 0) setPermissionValidationVisible(false)
                    }}
                    permissions={permissions}
                    selected={selectedPermissions}
                  />
                )}
                {permissionValidationVisible &&
                selectedPermissions.size === 0 ? (
                  <FieldError className="mt-2">
                    {locale === "zh-CN"
                      ? "请至少选择一项权限。"
                      : "Select at least one permission."}
                  </FieldError>
                ) : null}
              </div>
            ) : null}
            {mutation.isError ? (
              <AdminErrorAlert error={mutation.error} />
            ) : null}
          </form>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <DialogActionButton
              action="cancel"
              className="flex-1 sm:min-w-24 sm:flex-none"
              disabled={mutation.isPending}
              type="button"
              variant="outline"
            >
              {locale === "zh-CN" ? "取消" : "Cancel"}
            </DialogActionButton>
          </ResponsiveDialogClose>
          <DialogActionButton
            aria-busy={mutation.isPending}
            className="flex-[1.5] sm:min-w-24 sm:flex-none"
            disabled={
              mutation.isPending ||
              (!role && (permissionsPending || permissionsError !== null))
            }
            form="role-editor-form"
            type="submit"
          >
            {mutation.isPending ? (
              <SweepShine>
                {locale === "zh-CN" ? "保存中…" : "Saving…"}
              </SweepShine>
            ) : role ? (
              locale === "zh-CN" ? (
                "保存"
              ) : (
                "Save"
              )
            ) : locale === "zh-CN" ? (
              "创建"
            ) : (
              "Create"
            )}
          </DialogActionButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function roleEditorSchema(locale: "en-US" | "zh-CN") {
  const required = locale === "zh-CN" ? "此字段为必填项。" : "Required."
  const roleNameInvalid =
    locale === "zh-CN"
      ? "角色名称需为 1–64 个字符，且首尾不能有空格。"
      : "Use 1–64 characters without surrounding spaces."
  const roleKeyInvalid =
    locale === "zh-CN"
      ? "权限标识需以小写字母开头，只能包含小写字母、数字和下划线。"
      : "Start with a lowercase letter and use only lowercase letters, numbers, and underscores."
  const descriptionInvalid =
    locale === "zh-CN"
      ? "角色说明不能超过 256 个字符或包含首尾空格。"
      : "Use at most 256 characters without surrounding spaces."

  return z.object({
    description: z
      .string()
      .max(256, descriptionInvalid)
      .refine((value) => value.trim() === value, descriptionInvalid),
    role_key: z
      .string()
      .min(1, required)
      .max(100, roleKeyInvalid)
      .regex(/^[a-z][a-z0-9_]*$/, roleKeyInvalid),
    role_name: z
      .string()
      .min(1, required)
      .max(64, roleNameInvalid)
      .refine((value) => value.trim() === value, roleNameInvalid),
  })
}

function EditorRequiredMark({ locale }: { locale: "en-US" | "zh-CN" }) {
  return (
    <>
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
      <span className="sr-only">
        {locale === "zh-CN" ? "必填" : "Required"}
      </span>
    </>
  )
}
