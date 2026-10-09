import { rootRequest } from "@/lib/request"

export type IdentityRole = {
  role_id: string
  role_name: string
  role_key: string
  role_sort: number
  status: "active" | "disabled"
  description: string
  permission_ids: string[]
}

export async function listRoles() {
  return (
    await rootRequest<{ items: IdentityRole[] }>("/api/admin/roles", {
      cache: "no-store",
    })
  ).items
}

export async function createRole(input: {
  role_name: string
  role_key: string
  description: string
  permission_ids: string[]
}) {
  const created = await rootRequest<{ role_id: string }>("/api/admin/roles", {
    method: "POST",
    body: JSON.stringify({ ...input, role_sort: 100, status: "active" }),
  })
  return (await listRoles()).find((r) => r.role_id === created.role_id)!
}

export async function updateRole(role: IdentityRole) {
  const { role_id, permission_ids: _, ...input } = role
  await rootRequest(`/api/admin/roles/${role_id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
  return { ...role, ...input }
}

export async function deleteRole(id: string) {
  await rootRequest(`/api/admin/roles/${id}`, { method: "DELETE" })
}

export async function assignRolePermissions(id: string, ids: string[]) {
  await rootRequest(`/api/admin/roles/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ ids }),
  })
}
