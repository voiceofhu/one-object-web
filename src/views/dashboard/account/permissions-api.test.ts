import { expect, it } from "vitest"
import { KeyRoundIcon, ShieldCheckIcon } from "lucide-react"
import { buildNavigationGroups } from "@/components/app-shell/navigation"
import type { AuthPermissionRoute, AuthPermissions } from "./permissions-api"

function page(id: string, path: string, icon = "#"): AuthPermissionRoute {
  return {
    id,
    path,
    name: id,
    parent_id: null,
    hidden: false,
    menu_type: "C",
    meta: { title: id, icon },
  }
}

function access(
  routes: AuthPermissionRoute[],
  permissions: string[] = [],
): AuthPermissions {
  return {
    user_id: "100",
    super_admin: false,
    permissions,
    roles: [],
    buttons: [],
    routes,
  }
}

it("shows the authorization menu", () => {
  const groups = buildNavigationGroups(
    access(
      [
        {
          ...page("2005", "/dashboard/authorizations", "key-round"),
          meta: { title: "应用接入", icon: "key-round" },
        },
      ],
      ["object:keys:list"],
    ),
  )
  expect(groups[0].items[0]).toMatchObject({
    href: "/dashboard/authorizations",
    label: "应用接入",
  })
  expect(buildNavigationGroups(access([]))).toEqual([])
})

it("keeps server directories and skips hidden pages", () => {
  const directory: AuthPermissionRoute = {
    ...page("1901", ""),
    menu_type: "M",
    meta: { title: "系统管理", icon: "settings" },
    children: [
      page("2011", "/dashboard/users"),
      { ...page("2017", "/dashboard/roles"), hidden: true },
    ],
  }
  const groups = buildNavigationGroups(access([directory]))
  expect(groups).toHaveLength(1)
  expect(groups[0].label).toBe("系统管理")
  expect(groups[0].items.map((item) => item.href)).toEqual(["/dashboard/users"])
})

it("uses distinct icons for authorization and permission management", () => {
  const navigation = buildNavigationGroups(
    access([
      page("2005", "/dashboard/authorizations", "key-round"),
      page("2023", "/dashboard/permissions", "key-round"),
    ]),
  ).flatMap((group) => group.items)

  expect(navigation.find((item) => item.id === "authorizations")?.icon).toBe(
    KeyRoundIcon,
  )
  expect(navigation.find((item) => item.id === "admin-permissions")?.icon).toBe(
    ShieldCheckIcon,
  )
})
