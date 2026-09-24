import { describe, expect, it } from "vitest"
import { KeyRoundIcon, ShieldCheckIcon } from "lucide-react"
import { buildNavigationGroups } from "@/components/app-shell/navigation"
import {
  groupDashboardRoutes,
  type AuthPermissionRoute,
} from "./permissions-api"

function page(id: string, path: string): AuthPermissionRoute {
  return {
    id,
    path,
    name: id,
    parent_id: null,
    hidden: false,
    menu_type: "C",
    meta: { title: id, icon: "#" },
  }
}

describe("dashboard menu groups", () => {
  it("groups legacy management and log pages without adding unauthorized routes", () => {
    const routes = groupDashboardRoutes([
      page("files", "/files"),
      page("users", "/admin/users"),
      page("roles", "/admin/roles"),
      page("login", "/admin/login-logs"),
      page("operation", "/admin/operation-logs"),
    ])
    expect(routes.map((route) => route.meta.title)).toEqual([
      "files",
      "系统管理",
      "审计日志",
    ])
    expect(routes[1].children?.map((route) => route.path)).toEqual([
      "/dashboard/admin?section=users",
      "/dashboard/admin?section=roles",
    ])
    expect(routes[2].children?.map((route) => route.path)).toEqual([
      "/dashboard/admin?section=login-events",
      "/dashboard/admin?section=operation-logs",
    ])
    expect(
      routes[1].children?.every((route) => route.parent_id === routes[1].id),
    ).toBe(true)
  })
  it("does not create empty groups for accounts without management access", () => {
    expect(
      groupDashboardRoutes([page("files", "/files")]).map((route) => route.id),
    ).toEqual(["files"])
  })
  it("preserves existing server directories and hidden pages", () => {
    const hidden = {
      ...page("users", "/admin/users"),
      hidden: true,
      parent_id: "custom",
    }
    const directory: AuthPermissionRoute = {
      ...page("custom", ""),
      menu_type: "M",
      children: [hidden],
    }
    const result = groupDashboardRoutes([directory])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("custom")
    expect(result[0].children?.[0]).toMatchObject({
      hidden: true,
      parent_id: "custom",
      path: "/dashboard/admin?section=users",
    })
  })
})

it.each(["/keys", "/dashboard/keys", "/authorizations"])(
  "shows the authorization menu for %s",
  (path) => {
    const routes = groupDashboardRoutes([
      { ...page("2005", path), meta: { title: "应用接入", icon: "key-round" } },
    ])
    const groups = buildNavigationGroups({
      user_id: "100",
      super_admin: false,
      permissions: ["object:keys:list"],
      roles: [],
      buttons: [],
      routes,
    })
    expect(groups[0].items[0]).toMatchObject({
      href: "/dashboard/authorizations",
      label: "应用接入",
    })
    expect(
      buildNavigationGroups({
        user_id: "100",
        super_admin: false,
        permissions: [],
        roles: [],
        buttons: [],
        routes: [],
      }),
    ).toEqual([])
  },
)

it("uses distinct icons for authorization and permission management", () => {
  const navigation = buildNavigationGroups({
    user_id: "100",
    super_admin: false,
    permissions: [],
    roles: [],
    buttons: [],
    routes: groupDashboardRoutes([
      {
        ...page("2005", "/authorizations"),
        meta: { title: "应用接入", icon: "key-round" },
      },
      {
        ...page("2023", "/admin/permissions"),
        meta: { title: "权限管理", icon: "key-round" },
      },
    ]),
  }).flatMap((group) => group.items)

  expect(navigation.find((item) => item.id === "authorizations")?.icon).toBe(
    KeyRoundIcon,
  )
  expect(navigation.find((item) => item.id === "admin-permissions")?.icon).toBe(
    ShieldCheckIcon,
  )
})
