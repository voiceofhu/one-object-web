import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "@/lib/toast"

import { useTranslation } from "@/components/providers/language-context"
import { Switch } from "@/components/ui/switch"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import {
  deleteRole,
  listPermissions,
  listRoles,
  rbacQueryKeys,
  updateRole,
  type IdentityRole,
} from "@/views/dashboard/admin/api/rbac-api"
import { AdminErrorAlert } from "@/views/dashboard/admin/shared/common"
import { ResourceTable } from "@/components/resource-table"
import {
  BulkDeleteRolesDialog,
  DeleteRoleDialog,
} from "@/views/dashboard/admin/roles/delete-dialogs"
import { RoleEditorDialog } from "@/views/dashboard/admin/roles/editor-dialog"
import { isSuperAdminRole } from "@/views/dashboard/admin/roles/helpers"
import { RolePermissionDialog } from "@/views/dashboard/admin/roles/permissions-dialog"
import { RoleRowActions } from "@/views/dashboard/admin/roles/row-actions"
import type { RoleDialog } from "@/views/dashboard/admin/roles/types"
import { statusText } from "@/views/dashboard/admin/permissions/tree"

export function RolesPanel({
  accessPermissions,
}: {
  accessPermissions: string[]
}) {
  const { locale } = useTranslation()
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<RoleDialog>(null)
  const [permissionRole, setPermissionRole] = useState<IdentityRole | null>(
    null,
  )
  const [deletingRole, setDeletingRole] = useState<IdentityRole | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState<{
    roles: IdentityRole[]
    clearSelection: () => void
  } | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "disabled"
  >("all")
  const roles = useQuery({ queryFn: listRoles, queryKey: rbacQueryKeys.roles })
  const canListPermissions = accessPermissions.includes(
    "object:permission:list",
  )
  const permissions = useQuery({
    enabled: canListPermissions,
    queryFn: listPermissions,
    queryKey: rbacQueryKeys.permissions,
  })
  const canCreate = accessPermissions.includes("object:role:create")
  const canUpdate = accessPermissions.includes("object:role:update")
  const canDelete = accessPermissions.includes("object:role:delete")
  const canAssign =
    canListPermissions && accessPermissions.includes("object:role:assign")
  const statusMutation = useMutation({
    mutationFn: ({ role, enabled }: { role: IdentityRole; enabled: boolean }) =>
      updateRole({ ...role, status: enabled ? "active" : "disabled" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles }),
        queryClient.invalidateQueries({
          queryKey: authPermissionsQuery.queryKey,
        }),
      ])
    },
  })
  const removeMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: async () => {
      setDeletingRole(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles }),
        queryClient.invalidateQueries({
          queryKey: authPermissionsQuery.queryKey,
        }),
      ])
      toast.success(locale === "zh-CN" ? "角色已删除" : "Role deleted")
    },
  })
  const bulkRemoveMutation = useMutation({
    mutationFn: async (items: IdentityRole[]) => {
      await Promise.all(items.map((role) => deleteRole(role.role_id)))
    },
    onSuccess: async () => {
      bulkDeleting?.clearSelection()
      setBulkDeleting(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles }),
        queryClient.invalidateQueries({
          queryKey: authPermissionsQuery.queryKey,
        }),
      ])
      toast.success(locale === "zh-CN" ? "角色已删除" : "Roles deleted")
    },
  })
  const mutationError =
    statusMutation.error ?? removeMutation.error ?? bulkRemoveMutation.error
  const filteredRoles = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return (roles.data ?? []).filter((role) => {
      const matchesStatus =
        statusFilter === "all" || role.status === statusFilter
      const matchesSearch =
        !keyword ||
        role.role_name.toLowerCase().includes(keyword) ||
        role.role_key.toLowerCase().includes(keyword) ||
        role.description.toLowerCase().includes(keyword)
      return matchesStatus && matchesSearch
    })
  }, [roles.data, search, statusFilter])
  const columns = useMemo<ColumnDef<IdentityRole>[]>(
    () => [
      {
        accessorKey: "role_name",
        header: locale === "zh-CN" ? "角色名称" : "Role",
        cell: ({ row }) => (
          <div className="min-w-0">
            {canUpdate && !isSuperAdminRole(row.original) ? (
              <button
                type="button"
                className="max-w-72 truncate text-left font-medium underline-offset-4 hover:underline"
                title={row.original.role_name}
                onClick={() => setEditor({ kind: "edit", role: row.original })}
              >
                {row.original.role_name}
              </button>
            ) : (
              <span className="font-medium">{row.original.role_name}</span>
            )}
            {row.original.description ? (
              <p className="max-w-72 truncate text-xs text-muted-foreground">
                {row.original.description}
              </p>
            ) : null}
          </div>
        ),
        meta: { label: locale === "zh-CN" ? "角色名称" : "Role" },
      },
      {
        accessorKey: "role_key",
        header: locale === "zh-CN" ? "权限标识" : "Key",
        cell: ({ row }) => (
          <code className="text-xs text-muted-foreground">
            {row.original.role_key}
          </code>
        ),
        meta: { label: locale === "zh-CN" ? "权限标识" : "Key" },
      },
      {
        id: "permissions",
        accessorFn: (role) => role.permission_ids.length,
        header: locale === "zh-CN" ? "权限" : "Permissions",
        cell: ({ row }) =>
          locale === "zh-CN"
            ? `${row.original.permission_ids.length} 项`
            : `${row.original.permission_ids.length} items`,
        meta: { label: locale === "zh-CN" ? "权限" : "Permissions" },
      },
      {
        accessorKey: "status",
        header: locale === "zh-CN" ? "状态" : "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              aria-label={`${row.original.role_name} ${locale === "zh-CN" ? "角色状态" : "role status"}`}
              checked={row.original.status === "active"}
              disabled={
                isSuperAdminRole(row.original) ||
                !canUpdate ||
                statusMutation.isPending
              }
              onCheckedChange={(enabled) =>
                statusMutation.mutate({ enabled, role: row.original })
              }
              size="sm"
            />
            <span className="text-xs text-muted-foreground">
              {statusText(row.original.status, locale)}
            </span>
          </div>
        ),
        meta: { label: locale === "zh-CN" ? "状态" : "Status" },
      },
    ],
    [canUpdate, locale, statusMutation],
  )

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {mutationError ? <AdminErrorAlert error={mutationError} /> : null}
      {permissions.isError ? (
        <AdminErrorAlert error={permissions.error} />
      ) : null}
      <ResourceTable
        columns={columns}
        data={filteredRoles}
        emptyLabel={locale === "zh-CN" ? "暂无角色" : "No roles"}
        error={roles.error}
        getRowCanSelect={(role) =>
          !isSuperAdminRole(role) && role.role_id !== "101"
        }
        getRowId={(role) => role.role_id}
        isBulkDeleting={bulkRemoveMutation.isPending}
        isFetching={roles.isFetching}
        isLoading={roles.isPending}
        onBulkDelete={
          canDelete
            ? (items, clearSelection) =>
                setBulkDeleting({ clearSelection, roles: items })
            : undefined
        }
        onCreate={
          canCreate && canAssign
            ? () => setEditor({ kind: "create" })
            : undefined
        }
        onRefresh={() => roles.refetch()}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        renderRowActions={(role) => (
          <RoleRowActions
            canDelete={
              canDelete && !isSuperAdminRole(role) && role.role_id !== "101"
            }
            canEdit={canUpdate && !isSuperAdminRole(role)}
            canSetPermissions={canListPermissions}
            locale={locale}
            onDelete={() => setDeletingRole(role)}
            onEdit={() => setEditor({ kind: "edit", role })}
            onPermissions={() => setPermissionRole(role)}
          />
        )}
        searchPlaceholder={locale === "zh-CN" ? "搜索角色" : "Search roles"}
        searchValue={search}
        statusFilter={statusFilter}
      />

      <RoleEditorDialog
        key={
          editor?.kind === "edit"
            ? editor.role.role_id
            : (editor?.kind ?? "closed")
        }
        dialog={editor}
        onRetryPermissions={() => void permissions.refetch()}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        permissions={permissions.data ?? []}
        permissionsError={permissions.error}
        permissionsPending={permissions.isPending}
      />
      <RolePermissionDialog
        canAssign={canAssign}
        key={permissionRole?.role_id ?? "no-role"}
        onOpenChange={(open) => {
          if (!open) setPermissionRole(null)
        }}
        permissions={permissions.data ?? []}
        role={permissionRole}
      />
      <DeleteRoleDialog
        deleting={removeMutation.isPending}
        onConfirm={() => {
          if (deletingRole) removeMutation.mutate(deletingRole.role_id)
        }}
        onOpenChange={(open) => {
          if (!open && !removeMutation.isPending) setDeletingRole(null)
        }}
        role={deletingRole}
      />
      <BulkDeleteRolesDialog
        deleting={bulkRemoveMutation.isPending}
        onConfirm={() => {
          if (bulkDeleting) bulkRemoveMutation.mutate(bulkDeleting.roles)
        }}
        onOpenChange={(open) => {
          if (!open && !bulkRemoveMutation.isPending) setBulkDeleting(null)
        }}
        roles={bulkDeleting?.roles ?? null}
      />
    </section>
  )
}
