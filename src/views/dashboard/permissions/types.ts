import type { IdentityPermission } from "./api"

export type PermissionEditorState =
  | { kind: "create"; parent?: IdentityPermission }
  | { kind: "edit"; permission: IdentityPermission }
  | null
