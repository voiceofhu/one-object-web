import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState, type FormEvent } from "react"
import { toast } from "@/lib/toast"

import { useTranslation } from "@/components/providers/language-context"
import { DialogActionButton } from "@/components/ui/dialog-action-button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import {
  createPermission,
  rbacQueryKeys,
  updatePermission,
  type IdentityPermission,
  type IdentityPermissionInput,
} from "@/views/dashboard/admin/api/rbac-api"
import { AdminErrorAlert } from "@/views/dashboard/admin/shared/common"
import { MenuIconSelect } from "@/views/dashboard/admin/permissions/menu-icon-select"
import {
  buildPermissionTree,
  collectPermissionIds,
  flattenPermissionNodes,
} from "@/views/dashboard/admin/permissions/tree"
import type { PermissionEditorState } from "@/views/dashboard/admin/permissions/types"

export function PermissionEditorDialog({
  dialog,
  permissions,
  onOpenChange,
}: {
  dialog: PermissionEditorState
  permissions: IdentityPermission[]
  onOpenChange: (open: boolean) => void
}) {
  const { locale } = useTranslation()
  const queryClient = useQueryClient()
  const editing = dialog?.kind === "edit" ? dialog.permission : null
  const createParent = dialog?.kind === "create" ? dialog.parent : undefined
  const defaultType: IdentityPermission["permission_type"] = createParent
    ? createParent.permission_type === "M"
      ? "C"
      : "F"
    : "M"
  const [permissionName, setPermissionName] = useState(
    editing?.permission_name ?? "",
  )
  const [permissionType, setPermissionType] = useState<
    IdentityPermission["permission_type"]
  >(editing?.permission_type ?? defaultType)
  const [parentId, setParentId] = useState<string | null>(
    editing?.parent_id ?? createParent?.permission_id ?? null,
  )
  const [path, setPath] = useState(editing?.path ?? "")
  const [permissionCode, setPermissionCode] = useState(
    editing?.permission_code ?? "",
  )
  const [icon, setIcon] = useState(editing?.icon ?? "#")
  const [visible, setVisible] = useState(editing?.visible ?? true)
  const [description, setDescription] = useState(editing?.description ?? "")
  const blockedIds = useMemo(() => {
    if (!editing) return new Set<string>()
    const node = buildPermissionTree(permissions)
      .flatMap((root) => flattenPermissionNodes(root))
      .find((item) => item.permission_id === editing.permission_id)
    return new Set(node ? collectPermissionIds(node) : [editing.permission_id])
  }, [editing, permissions])
  const parentOptions = permissions.filter(
    (permission) =>
      permission.permission_type !== "F" &&
      !blockedIds.has(permission.permission_id),
  )
  const code = permissionCode.trim()
  const validCode =
    !code || /^object:[a-z][a-z0-9-]*:[A-Za-z][A-Za-z0-9-]*$/.test(code)
  const valid =
    permissionName.trim().length > 0 &&
    permissionName.trim().length <= 64 &&
    description.trim().length <= 256 &&
    validCode &&
    (permissionType !== "F" || (parentId !== null && code.length > 0))
  const mutation = useMutation({
    mutationFn: () => {
      const siblings = permissions.filter(
        (permission) => permission.parent_id === parentId,
      )
      const input: IdentityPermissionInput = {
        description: description.trim(),
        icon: permissionType === "F" ? "#" : icon.trim() || "#",
        order_num:
          editing?.order_num ??
          Math.max(0, ...siblings.map((permission) => permission.order_num)) +
            1,
        parent_id: parentId,
        path: permissionType === "F" ? "" : path.trim(),
        permission_code: permissionType === "M" ? null : code || null,
        permission_name: permissionName.trim(),
        permission_type: permissionType,
        status: editing?.status ?? "active",
        visible: permissionType === "F" ? false : visible,
      }
      return editing
        ? updatePermission(editing.permission_id, input)
        : createPermission(input)
    },
    onSuccess: async () => {
      onOpenChange(false)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: rbacQueryKeys.permissions,
        }),
        queryClient.invalidateQueries({
          queryKey: authPermissionsQuery.queryKey,
        }),
      ])
      toast.success(
        editing
          ? locale === "zh-CN"
            ? "权限已修改"
            : "Permission updated"
          : locale === "zh-CN"
            ? "权限已新增"
            : "Permission created",
      )
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (valid && !mutation.isPending) mutation.mutate()
  }

  return (
    <ResponsiveDialog open={dialog !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[90svh] sm:max-w-xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {editing
              ? locale === "zh-CN"
                ? "编辑权限"
                : "Edit permission"
              : locale === "zh-CN"
                ? "新增权限"
                : "Create permission"}
          </ResponsiveDialogTitle>
          {createParent ? (
            <ResponsiveDialogDescription>
              {createParent.permission_name}
            </ResponsiveDialogDescription>
          ) : null}
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="overflow-y-auto">
          <form id="permission-editor-form" onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel>
                  {locale === "zh-CN" ? "权限类型" : "Type"}
                </FieldLabel>
                <Select
                  value={permissionType}
                  disabled={!!editing && Number(editing.permission_id) <= 2101}
                  onValueChange={(value) =>
                    setPermissionType(
                      value as IdentityPermission["permission_type"],
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="M">
                        {locale === "zh-CN" ? "目录" : "Group"}
                      </SelectItem>
                      <SelectItem value="C">
                        {locale === "zh-CN" ? "菜单" : "Menu"}
                      </SelectItem>
                      <SelectItem value="F">
                        {locale === "zh-CN" ? "按钮" : "Action"}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="permission-name">
                  {locale === "zh-CN" ? "权限名称" : "Name"}
                </FieldLabel>
                <Input
                  id="permission-name"
                  maxLength={64}
                  value={permissionName}
                  onChange={(event) => setPermissionName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>
                  {locale === "zh-CN" ? "上级权限" : "Parent"}
                </FieldLabel>
                <Select
                  value={parentId ?? "root"}
                  onValueChange={(value) =>
                    setParentId(value === "root" ? null : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem
                        value="root"
                        disabled={permissionType === "F"}
                      >
                        {locale === "zh-CN" ? "顶级权限" : "Root"}
                      </SelectItem>
                      {parentOptions.map((permission) => (
                        <SelectItem
                          key={permission.permission_id}
                          value={permission.permission_id}
                        >
                          {permission.permission_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {permissionType !== "F" ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="permission-path">
                      {locale === "zh-CN" ? "路由路径" : "Path"}
                    </FieldLabel>
                    <Input
                      id="permission-path"
                      maxLength={255}
                      value={path}
                      onChange={(event) => setPath(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>
                      {locale === "zh-CN" ? "图标" : "Icon"}
                    </FieldLabel>
                    <MenuIconSelect
                      controlId="permission-icon"
                      value={icon}
                      onChange={setIcon}
                    />
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="permission-visible">
                      {locale === "zh-CN" ? "显示" : "Visible"}
                    </FieldLabel>
                    <Switch
                      id="permission-visible"
                      checked={visible}
                      onCheckedChange={setVisible}
                    />
                  </Field>
                </>
              ) : null}
              {permissionType !== "M" ? (
                <Field>
                  <FieldLabel htmlFor="permission-code">
                    {locale === "zh-CN" ? "权限标识" : "Permission code"}
                  </FieldLabel>
                  <Input
                    id="permission-code"
                    disabled={
                      !!editing && Number(editing.permission_id) <= 2101
                    }
                    maxLength={128}
                    value={permissionCode}
                    onChange={(event) => setPermissionCode(event.target.value)}
                  />
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="permission-description">
                  {locale === "zh-CN" ? "备注" : "Description"}
                </FieldLabel>
                <Textarea
                  id="permission-description"
                  maxLength={256}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              {mutation.isError ? (
                <AdminErrorAlert error={mutation.error} />
              ) : null}
            </FieldGroup>
          </form>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <DialogActionButton
              action="cancel"
              type="button"
              variant="outline"
              disabled={mutation.isPending}
            >
              {locale === "zh-CN" ? "取消" : "Cancel"}
            </DialogActionButton>
          </ResponsiveDialogClose>
          <DialogActionButton
            type="submit"
            form="permission-editor-form"
            disabled={!valid || mutation.isPending}
          >
            {locale === "zh-CN" ? "保存" : "Save"}
          </DialogActionButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
