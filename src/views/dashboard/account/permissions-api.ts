import { queryOptions } from "@tanstack/react-query"
import { rootRequest } from "@/lib/request"
export type AuthPermissionRoute = {
  id: string
  parent_id: string | null
  name: string
  path: string
  hidden: boolean
  menu_type: "M" | "C"
  meta: { title: string; icon: string }
  children?: AuthPermissionRoute[]
}
export type AuthPermissions = {
  user_id: string
  super_admin: boolean
  permissions: string[]
  roles: string[]
  buttons: string[]
  routes: AuthPermissionRoute[]
}
export const authPermissionsQuery = queryOptions({
  queryKey: ["auth", "permissions"] as const,
  staleTime: 0,
  refetchInterval: 30_000,
  retry: false,
  queryFn: async () => {
    const result = await rootRequest<AuthPermissions>(
      "/api/account/permissions",
      { cache: "no-store" },
    )
    const route = (
      id: string,
      title: string,
      path: string,
    ): AuthPermissionRoute => ({
      id,
      parent_id: null,
      name: id,
      path,
      hidden: false,
      menu_type: "C",
      meta: { title, icon: "#" },
    })
    return {
      ...result,
      routes: [
        route("home", "仪表盘", "/dashboard"),
        ...result.routes,
      ],
    }
  },
})
