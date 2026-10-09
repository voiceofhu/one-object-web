export const adminQueryKeys = {
  loginDevices: ["object-admin", "login-devices"] as const,
  loginEvents: ["object-admin", "login-events"] as const,
  loginIps: ["object-admin", "login-ips"] as const,
  operationLogs: ["object-admin", "operation-logs"] as const,
  root: ["object-admin"] as const,
  sessions: ["object-admin", "sessions"] as const,
  users: ["object-admin", "users"] as const,
}

export const rbacQueryKeys = {
  permissions: ["object-admin", "permissions"] as const,
  roles: ["object-admin", "roles"] as const,
  userRoles: (userId: string) =>
    ["object-admin", "users", userId, "roles"] as const,
}
