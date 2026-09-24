import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { toast } from "@/lib/toast"

import { useTranslation } from "@/components/providers/language-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import {
  assignRolePermissions,
  rbacQueryKeys,
  type IdentityPermission,
  type IdentityRole,
} from "@/views/dashboard/admin/api/rbac-api"
import { AdminErrorAlert } from "@/views/dashboard/admin/components/shared/common"
import { isSuperAdminRole } from "@/views/dashboard/admin/components/roles/helpers"
import {
  buildPermissionNodeMap,
  buildPermissionTree,
  collectPermissionIds,
  getPermissionNodeCheckedState,
  normalizeLinkedPermissions,
  permissionTypeLabel,
  removeEmptyPermissionAncestors,
  type PermissionCheckedState,
  type PermissionNode,
} from "@/views/dashboard/admin/components/permissions/tree"

export function RolePermissionDialog({
  role,
  permissions,
  canAssign,
  onOpenChange,
}: {
  role: IdentityRole | null
  permissions: IdentityPermission[]
  canAssign: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { locale } = useTranslation()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(
    () => new Set(role?.permission_ids ?? []),
  )
  const mutation = useMutation({
    mutationFn: () =>
      assignRolePermissions(role?.role_id ?? "", [...selected].sort()),
    onSuccess: async () => {
      onOpenChange(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles }),
        queryClient.invalidateQueries({
          queryKey: authPermissionsQuery.queryKey,
        }),
      ])
      toast.success(locale === "zh-CN" ? "权限已保存" : "Permissions saved")
    },
  })
  const superAdmin = isSuperAdminRole(role)
  const disabled = !role || superAdmin || !canAssign || mutation.isPending

  return (
    <ResponsiveDialog open={role !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[90svh] sm:max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {locale === "zh-CN" ? "角色权限" : "Role permissions"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {role?.role_name ?? ""}
            {superAdmin
              ? locale === "zh-CN"
                ? " · 超级管理员始终拥有全部菜单和按钮权限"
                : " · Super administrators always have every menu and button permission"
              : ""}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="overflow-y-auto">
          <PermissionTree
            disabled={disabled}
            onChange={setSelected}
            permissions={permissions}
            selected={selected}
          />
          {mutation.isError ? (
            <div className="mt-4">
              <AdminErrorAlert error={mutation.error} />
            </div>
          ) : null}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <DialogActionButton
              action="cancel"
              disabled={mutation.isPending}
              type="button"
              variant="outline"
            >
              {locale === "zh-CN" ? "关闭" : "Close"}
            </DialogActionButton>
          </ResponsiveDialogClose>
          {!superAdmin && canAssign ? (
            <DialogActionButton
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {locale === "zh-CN" ? "保存权限" : "Save permissions"}
            </DialogActionButton>
          ) : null}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

export function PermissionTree({
  permissions,
  selected,
  disabled,
  onChange,
}: {
  permissions: IdentityPermission[]
  selected: Set<string>
  disabled: boolean
  onChange: (value: Set<string>) => void
}) {
  const { locale } = useTranslation()
  const tree = useMemo(() => buildPermissionTree(permissions), [permissions])
  const nodeById = useMemo(() => buildPermissionNodeMap(tree), [tree])
  const parentById = useMemo(
    () =>
      new Map(permissions.map((item) => [item.permission_id, item.parent_id])),
    [permissions],
  )
  const expandableIds = useMemo(
    () =>
      [...nodeById.values()]
        .filter((node) => node.children.length > 0)
        .map((node) => node.permission_id),
    [nodeById],
  )
  const selectableIds = useMemo(
    () =>
      permissions
        .filter((permission) => permission.status === "active")
        .map((permission) => permission.permission_id),
    [permissions],
  )
  const selectableIdSet = useMemo(() => new Set(selectableIds), [selectableIds])
  const defaultExpandedIds = useMemo(
    () => new Set(expandableIds),
    [expandableIds],
  )
  const [expandedOverride, setExpandedOverride] = useState<Set<string> | null>(
    null,
  )
  const expandedIds = expandedOverride ?? defaultExpandedIds
  const [linked, setLinked] = useState(true)

  const selectedMenuCount = permissions.filter(
    (permission) =>
      permission.permission_type !== "F" &&
      selected.has(permission.permission_id),
  ).length
  const selectedButtonCount = permissions.filter(
    (permission) =>
      permission.permission_type === "F" &&
      selected.has(permission.permission_id),
  ).length
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
  const someSelected = selectableIds.some((id) => selected.has(id))
  const allExpanded =
    expandableIds.length > 0 && expandableIds.every((id) => expandedIds.has(id))

  function toggle(node: PermissionNode, checked: boolean) {
    const next = new Set(selected)
    if (!linked) {
      if (checked) next.add(node.permission_id)
      else next.delete(node.permission_id)
      onChange(next)
      return
    }

    const ids = collectPermissionIds(node).filter((id) =>
      selectableIdSet.has(id),
    )
    if (checked) {
      ids.forEach((id) => next.add(id))
      let parentId = node.parent_id
      while (parentId) {
        if (selectableIdSet.has(parentId)) next.add(parentId)
        parentId = parentById.get(parentId) ?? null
      }
    } else {
      ids.forEach((id) => next.delete(id))
      removeEmptyPermissionAncestors(
        next,
        node.permission_id,
        parentById,
        nodeById,
      )
    }
    onChange(next)
  }

  function toggleLinked(checked: boolean) {
    setLinked(checked)
    if (checked) {
      onChange(
        normalizeLinkedPermissions(selected, tree, parentById, selectableIdSet),
      )
    }
  }

  return (
    <section className="shrink-0 overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/70 bg-muted/25 px-2.5 py-1.5 text-[0.6875rem]">
        <PermissionTreeControl
          checked={allExpanded}
          disabled={disabled || expandableIds.length === 0}
          label={locale === "zh-CN" ? "展开/折叠" : "Expand/collapse"}
          onCheckedChange={(checked) =>
            setExpandedOverride(checked ? new Set(expandableIds) : new Set())
          }
        />
        <PermissionTreeControl
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          disabled={disabled || selectableIds.length === 0}
          label={locale === "zh-CN" ? "全选/全不选" : "Select all/none"}
          onCheckedChange={(checked) =>
            onChange(checked ? new Set(selectableIds) : new Set())
          }
        />
        <PermissionTreeControl
          checked={linked}
          disabled={disabled}
          label={locale === "zh-CN" ? "父子联动" : "Link hierarchy"}
          onCheckedChange={toggleLinked}
        />
        <div className="ml-auto flex items-center gap-1">
          <Badge className="h-4 px-1.5" variant="outline">
            {locale === "zh-CN" ? "菜单" : "Menus"} {selectedMenuCount}
          </Badge>
          <Badge className="h-4 px-1.5" variant="outline">
            {locale === "zh-CN" ? "按钮" : "Actions"} {selectedButtonCount}
          </Badge>
        </div>
      </div>
      <div className="h-[min(19rem,42vh)] overflow-y-auto p-1.5">
        {tree.length > 0 ? (
          tree.map((node) => (
            <PermissionTreeNode
              disabled={disabled}
              expandedIds={expandedIds}
              key={node.permission_id}
              linked={linked}
              node={node}
              onToggle={toggle}
              onToggleExpanded={(permissionId) => {
                setExpandedOverride((current) => {
                  const next = new Set(current ?? defaultExpandedIds)
                  if (next.has(permissionId)) next.delete(permissionId)
                  else next.add(permissionId)
                  return next
                })
              }}
              selectableIds={selectableIdSet}
              selected={selected}
            />
          ))
        ) : (
          <div className="px-3 py-10 text-center text-xs text-muted-foreground">
            {locale === "zh-CN" ? "暂无权限。" : "No permissions available."}
          </div>
        )}
      </div>
    </section>
  )
}

export function PermissionTreeControl({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string
  checked: PermissionCheckedState
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <label
      className="flex cursor-pointer items-center gap-1.5 has-disabled:cursor-not-allowed has-disabled:text-muted-foreground"
      htmlFor={id}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span>{label}</span>
    </label>
  )
}

export function PermissionTreeNode({
  node,
  selected,
  disabled,
  expandedIds,
  linked,
  selectableIds,
  onToggle,
  onToggleExpanded,
  depth = 0,
}: {
  node: PermissionNode
  selected: Set<string>
  disabled: boolean
  expandedIds: Set<string>
  linked: boolean
  selectableIds: Set<string>
  onToggle: (node: PermissionNode, checked: boolean) => void
  onToggleExpanded: (permissionId: string) => void
  depth?: number
}) {
  const { locale } = useTranslation()
  const hasChildren = node.children.length > 0
  const expanded = expandedIds.has(node.permission_id)
  const checked = getPermissionNodeCheckedState(
    node,
    selected,
    selectableIds,
    linked,
  )
  const canToggle = linked
    ? collectPermissionIds(node).some((id) => selectableIds.has(id))
    : selectableIds.has(node.permission_id)
  const inputId = useId()

  return (
    <div>
      <div
        className="flex min-h-7 items-center gap-1.5 rounded-md pr-2 text-xs hover:bg-muted/70"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        <Button
          aria-label={
            expanded
              ? locale === "zh-CN"
                ? "收起权限节点"
                : "Collapse permission"
              : locale === "zh-CN"
                ? "展开权限节点"
                : "Expand permission"
          }
          disabled={!hasChildren}
          onClick={() => onToggleExpanded(node.permission_id)}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDownIcon />
            ) : (
              <ChevronRightIcon />
            )
          ) : null}
        </Button>
        <Checkbox
          checked={checked}
          disabled={disabled || !canToggle}
          id={inputId}
          onCheckedChange={(value) => onToggle(node, value === true)}
        />
        <label
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 py-1 has-disabled:cursor-not-allowed"
          htmlFor={inputId}
        >
          <span className="truncate">{node.permission_name}</span>
          <Badge className="h-4 px-1.5" variant="outline">
            {permissionTypeLabel(node.permission_type, locale)}
          </Badge>
          {node.status !== "active" ? (
            <Badge className="h-4 px-1.5" variant="destructive">
              {locale === "zh-CN" ? "停用" : "Disabled"}
            </Badge>
          ) : null}
        </label>
      </div>
      {hasChildren && expanded
        ? node.children.map((child) => (
            <PermissionTreeNode
              depth={depth + 1}
              disabled={disabled}
              expandedIds={expandedIds}
              key={child.permission_id}
              linked={linked}
              node={child}
              onToggle={onToggle}
              onToggleExpanded={onToggleExpanded}
              selectableIds={selectableIds}
              selected={selected}
            />
          ))
        : null}
    </div>
  )
}
