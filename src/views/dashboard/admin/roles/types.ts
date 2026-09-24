import type { IdentityRole } from "@/views/dashboard/admin/api/rbac-api"

export type RoleDialog =
  { kind: "create" } | { kind: "edit"; role: IdentityRole } | null

export type RoleEditorValues = {
  description: string
  role_key: string
  role_name: string
}
