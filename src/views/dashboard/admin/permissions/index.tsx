import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "@/lib/toast"

import { useTranslation } from "@/components/providers/language-context"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import {
  deletePermission,
  listPermissions,
  reorderPermissions,
  rbacQueryKeys,
  updatePermissionStatus,
  type IdentityPermission,
} from "@/views/dashboard/admin/api/rbac-api"
import { DeletePermissionDialog } from "@/views/dashboard/admin/permissions/delete-dialog"
import { PermissionEditorDialog } from "@/views/dashboard/admin/permissions/editor-dialog"
import { PermissionRowActions } from "@/views/dashboard/admin/permissions/row-actions"
import {
  buildPermissionTree,
  filterPermissionTree,
  permissionTypeLabel,
  reorderPermissionItems,
  statusText,
  type PermissionNode,
} from "@/views/dashboard/admin/permissions/tree"
import type { PermissionEditorState } from "@/views/dashboard/admin/permissions/types"
import { ResourceTable } from "@/components/resource-table"

export function PermissionsPanel({
  accessPermissions,
}: {
  accessPermissions: string[]
}) {
  const { locale } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "disabled"
  >("all")
  const [permissionEditor, setPermissionEditor] =
    useState<PermissionEditorState>(null)
  const [deletingPermission, setDeletingPermission] =
    useState<IdentityPermission | null>(null)
  const permissions = useQuery({
    queryFn: listPermissions,
    queryKey: rbacQueryKeys.permissions,
  })
  const access = useQuery(authPermissionsQuery)
  const isSuperAdmin = access.data?.super_admin === true
  const canCreate =
    isSuperAdmin && accessPermissions.includes("object:permission:create")
  const canUpdate =
    isSuperAdmin && accessPermissions.includes("object:permission:update")
  const canDelete =
    isSuperAdmin && accessPermissions.includes("object:permission:delete")
  const canChangeStatus = canUpdate
  const canReorder = canUpdate
  const statusMutation = useMutation({
    mutationFn: ({
      permission,
      status,
    }: {
      permission: IdentityPermission
      status: IdentityPermission["status"]
    }) => updatePermissionStatus(permission.permission_id, status),
    onMutate: async ({ permission, status }) => {
      await queryClient.cancelQueries({ queryKey: rbacQueryKeys.permissions })
      const previous = queryClient.getQueryData<IdentityPermission[]>(
        rbacQueryKeys.permissions,
      )
      queryClient.setQueryData<IdentityPermission[]>(
        rbacQueryKeys.permissions,
        (items) =>
          items?.map((item) =>
            item.permission_id === permission.permission_id
              ? { ...item, status }
              : item,
          ),
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(rbacQueryKeys.permissions, context?.previous)
      toast.error(error instanceof Error ? error.message : String(error))
    },
    onSuccess: (permission) => {
      toast.success(
        locale === "zh-CN"
          ? `${permission.permission_name}状态已更新`
          : `${permission.permission_name} status updated`,
      )
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: rbacQueryKeys.permissions,
        }),
        queryClient.invalidateQueries({
          queryKey: authPermissionsQuery.queryKey,
        }),
      ])
    },
  })
  const reorderMutation = useMutation({
    mutationFn: async ({
      active,
      over,
      orderedRecords,
    }: {
      active: PermissionNode
      over: PermissionNode
      orderedRecords: PermissionNode[]
    }) => {
      if (active.parent_id !== over.parent_id) {
        throw new Error(
          locale === "zh-CN"
            ? "权限只能在同一个上级权限下拖拽排序"
            : "Permissions can only be reordered under the same parent",
        )
      }
      const siblingIds = orderedRecords
        .filter((permission) => permission.parent_id === active.parent_id)
        .map((permission) => permission.permission_id)
      await reorderPermissions(active.parent_id, siblingIds)
      return { parentId: active.parent_id, siblingIds }
    },
    onMutate: async ({ active, over, orderedRecords }) => {
      if (active.parent_id !== over.parent_id) return {}
      await queryClient.cancelQueries({ queryKey: rbacQueryKeys.permissions })
      const previous = queryClient.getQueryData<IdentityPermission[]>(
        rbacQueryKeys.permissions,
      )
      const siblingIds = orderedRecords
        .filter((permission) => permission.parent_id === active.parent_id)
        .map((permission) => permission.permission_id)
      queryClient.setQueryData<IdentityPermission[]>(
        rbacQueryKeys.permissions,
        (items) => reorderPermissionItems(items, active.parent_id, siblingIds),
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(rbacQueryKeys.permissions, context?.previous)
      toast.error(error instanceof Error ? error.message : String(error))
    },
    onSuccess: () => {
      toast.success(locale === "zh-CN" ? "权限排序已保存" : "Order saved")
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: rbacQueryKeys.permissions,
        }),
        queryClient.invalidateQueries({
          queryKey: authPermissionsQuery.queryKey,
        }),
      ])
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (permission: IdentityPermission) =>
      deletePermission(permission.permission_id),
    onSuccess: async () => {
      setDeletingPermission(null)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: rbacQueryKeys.permissions,
        }),
        queryClient.invalidateQueries({
          queryKey: authPermissionsQuery.queryKey,
        }),
      ])
      toast.success(locale === "zh-CN" ? "权限已删除" : "Permission deleted")
    },
  })
  const rows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return filterPermissionTree(
      buildPermissionTree(permissions.data ?? []),
      (permission) => {
        const matchesStatus =
          statusFilter === "all" || permission.status === statusFilter
        const matchesSearch =
          !keyword ||
          permission.permission_name.toLowerCase().includes(keyword) ||
          permission.path.toLowerCase().includes(keyword) ||
          (permission.permission_code ?? "").toLowerCase().includes(keyword)
        return matchesStatus && matchesSearch
      },
    )
  }, [permissions.data, search, statusFilter])
  const columns = useMemo<ColumnDef<PermissionNode>[]>(
    () => [
      {
        accessorKey: "permission_name",
        header: locale === "zh-CN" ? "权限名称" : "Permission",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {permissionTypeLabel(row.original.permission_type, locale)}
            </Badge>
            {canUpdate ? (
              <button
                type="button"
                className="max-w-72 truncate text-left font-medium underline-offset-4 hover:underline"
                title={row.original.permission_name}
                onClick={() =>
                  setPermissionEditor({
                    kind: "edit",
                    permission: row.original,
                  })
                }
              >
                {row.original.permission_name}
              </button>
            ) : (
              <span className="font-medium">
                {row.original.permission_name}
              </span>
            )}
          </div>
        ),
        meta: { label: locale === "zh-CN" ? "权限名称" : "Permission" },
      },
      {
        accessorKey: "path",
        header: locale === "zh-CN" ? "路由路径" : "Path",
        cell: ({ row }) => (
          <code className="text-xs text-muted-foreground">
            {row.original.path || "—"}
          </code>
        ),
        meta: { label: locale === "zh-CN" ? "路由路径" : "Path" },
      },
      {
        accessorKey: "permission_code",
        header: locale === "zh-CN" ? "权限标识" : "Code",
        cell: ({ row }) => (
          <code className="text-xs text-muted-foreground">
            {row.original.permission_code ?? "—"}
          </code>
        ),
        meta: { label: locale === "zh-CN" ? "权限标识" : "Code" },
      },
      {
        accessorKey: "status",
        header: locale === "zh-CN" ? "状态" : "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              aria-label={`${row.original.permission_name} ${locale === "zh-CN" ? "权限状态" : "permission status"}`}
              checked={
                statusMutation.isPending &&
                statusMutation.variables?.permission.permission_id ===
                  row.original.permission_id
                  ? statusMutation.variables.status === "active"
                  : row.original.status === "active"
              }
              disabled={
                !canChangeStatus ||
                statusMutation.isPending ||
                Number(row.original.permission_id) <= 2101
              }
              onCheckedChange={(checked) =>
                statusMutation.mutate({
                  permission: row.original,
                  status: checked ? "active" : "disabled",
                })
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
    [canChangeStatus, canUpdate, locale, statusMutation],
  )

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <ResourceTable
        columns={columns}
        data={rows}
        emptyLabel={locale === "zh-CN" ? "暂无权限" : "No permissions"}
        error={permissions.error}
        getRowId={(permission) => permission.permission_id}
        getSubRows={(permission) => permission.children}
        isFetching={permissions.isFetching}
        isLoading={permissions.isPending}
        isRowReordering={reorderMutation.isPending}
        onCreate={
          canCreate ? () => setPermissionEditor({ kind: "create" }) : undefined
        }
        onRefresh={() => permissions.refetch()}
        onRowReorder={
          canReorder && !search.trim() && statusFilter === "all"
            ? (payload) => reorderMutation.mutateAsync(payload)
            : undefined
        }
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        renderRowActions={(permission) => (
          <PermissionRowActions
            canCreateChild={canCreate && permission.permission_type !== "F"}
            canDelete={canDelete && Number(permission.permission_id) > 2101}
            canEdit={canUpdate}
            locale={locale}
            onCreateChild={() =>
              setPermissionEditor({
                kind: "create",
                parent: permission,
              })
            }
            onDelete={() => setDeletingPermission(permission)}
            onEdit={() => setPermissionEditor({ kind: "edit", permission })}
          />
        )}
        searchPlaceholder={
          locale === "zh-CN" ? "搜索权限" : "Search permissions"
        }
        searchValue={search}
        showPaginationControls={false}
        statusFilter={statusFilter}
        treeColumnId="permission_name"
      />
      <PermissionEditorDialog
        key={
          permissionEditor?.kind === "edit"
            ? permissionEditor.permission.permission_id
            : permissionEditor?.kind === "create"
              ? `create-${permissionEditor.parent?.permission_id ?? "root"}`
              : "closed"
        }
        dialog={permissionEditor}
        permissions={permissions.data ?? []}
        onOpenChange={(open) => {
          if (!open) setPermissionEditor(null)
        }}
      />
      <DeletePermissionDialog
        deleting={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingPermission) deleteMutation.mutate(deletingPermission)
        }}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeletingPermission(null)
        }}
        permission={deletingPermission}
      />
    </section>
  )
}
