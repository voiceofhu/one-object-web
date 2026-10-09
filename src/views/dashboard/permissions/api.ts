import { rootRequest } from "@/lib/request"

export type IdentityPermission = {
  permission_id: string
  permission_name: string
  permission_code: string | null
  parent_id: string | null
  order_num: number
  path: string
  permission_type: "M" | "C" | "F"
  visible: boolean
  status: "active" | "disabled"
  icon: string
  description: string
}

export type IdentityPermissionInput = Omit<IdentityPermission, "permission_id">

export async function listPermissions() {
  return (
    await rootRequest<{ items: IdentityPermission[] }>(
      "/api/admin/permissions",
      { cache: "no-store" },
    )
  ).items
}

export async function createPermission(input: IdentityPermissionInput) {
  const created = await rootRequest<{ permission_id: string }>(
    "/api/admin/permissions",
    { method: "POST", body: JSON.stringify(input) },
  )
  return (await listPermissions()).find(
    (p) => p.permission_id === created.permission_id,
  )!
}

export async function updatePermission(
  id: string,
  input: IdentityPermissionInput,
) {
  await rootRequest(`/api/admin/permissions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
  return (await listPermissions()).find((p) => p.permission_id === id)!
}

export async function deletePermission(id: string) {
  await rootRequest(`/api/admin/permissions/${id}`, { method: "DELETE" })
}

export async function updatePermissionStatus(
  id: string,
  status: IdentityPermission["status"],
) {
  const permission = (await listPermissions()).find(
    (p) => p.permission_id === id,
  )
  if (!permission) throw new Error("权限不存在")
  const { permission_id: _, ...input } = permission
  return updatePermission(id, { ...input, status })
}

export async function reorderPermissions(
  parent_id: string | null,
  ids: string[],
) {
  await rootRequest("/api/admin/permissions/reorder", {
    method: "PUT",
    body: JSON.stringify({ parent_id, ids }),
  })
}
