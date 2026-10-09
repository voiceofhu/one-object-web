import type { IdentityRole } from "./api"

export function isSuperAdminRole(role: IdentityRole | null | undefined) {
  return role?.role_id === "100"
}
