import { rootRequest } from "@/lib/request"

export type User = {
  user_id: string
  oidc_sub: string
  display_name: string
  avatar_url: string | null
  email: string | null
  status: "active" | "disabled" | "deleted"
  role_ids: string[]
  created_at: string
}

type UserPage = { items: User[]; total: number; limit: number }

export function listUsers(offset: number) {
  return rootRequest<UserPage>(`/api/admin/users?offset=${offset}`)
}

export function createUser(oidcSub: string, displayName: string) {
  return rootRequest("/api/admin/users", {
    method: "POST",
    body: JSON.stringify({ oidc_sub: oidcSub, display_name: displayName }),
  })
}

export function updateUser(
  user: { user_id: string; display_name: string },
  status: "active" | "disabled",
) {
  return rootRequest(`/api/admin/users/${user.user_id}`, {
    method: "PUT",
    body: JSON.stringify({ display_name: user.display_name, status }),
  })
}

export function deleteUser(id: string) {
  return rootRequest(`/api/admin/users/${id}`, { method: "DELETE" })
}
