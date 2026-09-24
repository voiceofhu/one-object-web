import type { IdentityPermission } from "@/views/dashboard/admin/api/rbac-api"

export type PermissionEditorState =
  | { kind: "create"; parent?: IdentityPermission }
  | { kind: "edit"; permission: IdentityPermission }
  | null
