import type { IdentityRole } from "@/views/dashboard/admin/api/rbac-api"

export function isSuperAdminRole(role: IdentityRole | null | undefined) {
  return role?.role_id === "100"
}
