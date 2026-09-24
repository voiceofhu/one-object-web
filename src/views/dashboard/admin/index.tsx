import { useObjectTranslation } from "@/local/object"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
import { RolesPanel } from "./roles"
import { PermissionsPanel } from "./permissions"
import { UsersPanel } from "./users"
import { LogsPanel } from "./logs"
import { AdminErrorAlert, AdminLoading } from "./shared/common"
const sections: Record<string, string> = {
  users: "object:user:list",
  roles: "object:role:list",
  permissions: "object:permission:list",
  "login-events": "object:login-log:list",
  "operation-logs": "object:operation-log:list",
}
export default function AdminPage() {
  const tx = useObjectTranslation()

  const [query] = useSearchParams()
  const section = query.get("section") || "users"
  const access = useQuery(authPermissionsQuery)
  if (access.isPending) return <AdminLoading />
  if (access.error) return <AdminErrorAlert error={access.error} />
  if (
    !sections[section] ||
    !access.data?.permissions.includes(sections[section])
  )
    return (
      <div className="p-5">
        <AdminErrorAlert error={new Error(tx("没有此管理页面的访问权限"))} />
      </div>
    )
  const permissions = access.data.permissions
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {section === "users" ? (
        <UsersPanel permissions={permissions} />
      ) : section === "roles" ? (
        <RolesPanel accessPermissions={permissions} />
      ) : section === "permissions" ? (
        <PermissionsPanel accessPermissions={permissions} />
      ) : (
        <LogsPanel
          key={section}
          kind={section === "login-events" ? "login" : "operation"}
        />
      )}
    </div>
  )
}
