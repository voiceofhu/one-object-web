import {
  Building2Icon,
  CircleUserRoundIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FilesIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogInIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

import {
  type AuthPermissionRoute,
  type AuthPermissions,
} from "@/views/dashboard/account/permissions-api"

import { findMenuIconOption } from "@/views/dashboard/menu-icons"

export type NavigationItem = {
  href: string
  icon: LucideIcon
  id: string
  label: string
}

export type NavigationGroup = {
  id: string
  label?: string
  items: ReadonlyArray<NavigationItem>
}

const localNavigation: Record<string, { icon: LucideIcon; id: string }> = {
  "/dashboard": { icon: LayoutDashboardIcon, id: "home" },
  "/dashboard/files": { icon: FilesIcon, id: "files" },
  "/dashboard/authorizations": { icon: KeyRoundIcon, id: "authorizations" },
  "/dashboard/buckets": { icon: DatabaseIcon, id: "buckets" },
  "/dashboard/storage": { icon: Building2Icon, id: "storage" },
  "/dashboard/users": { icon: UsersRoundIcon, id: "admin-users" },
  "/dashboard/roles": {
    icon: CircleUserRoundIcon,
    id: "admin-roles",
  },
  "/dashboard/permissions": {
    icon: ShieldCheckIcon,
    id: "admin-permissions",
  },
  "/dashboard/login-events": {
    icon: LogInIcon,
    id: "admin-login-events",
  },
  "/dashboard/operation-logs": {
    icon: ClipboardListIcon,
    id: "admin-operation-logs",
  },
}

export function buildNavigationGroups(
  access: AuthPermissions | undefined,
): NavigationGroup[] {
  const seenItems = new Set<string>()

  return (access?.routes ?? []).flatMap((route) => {
    const items = navigationItems(route, seenItems)
    if (items.length === 0) return []

    return [
      {
        id: route.id,
        ...(route.menu_type === "M" ? { label: route.meta.title } : {}),
        items,
      },
    ]
  })
}

function navigationItems(
  route: AuthPermissionRoute,
  seenItems: Set<string>,
): NavigationItem[] {
  const items: NavigationItem[] = []
  const local = localNavigation[route.path]
  if (
    route.menu_type === "C" &&
    !route.hidden &&
    local &&
    !seenItems.has(local.id)
  ) {
    seenItems.add(local.id)
    items.push({
      href: route.path,
      icon:
        (route.meta.icon !== "#" &&
        !(local.id === "storage" && route.meta.icon === "database") &&
        !(local.id === "admin-permissions" && route.meta.icon === "key-round")
          ? findMenuIconOption(route.meta.icon)?.Icon
          : undefined) ?? local.icon,
      id: local.id,
      label: route.meta.title,
    })
  }

  route.children?.forEach((child) => {
    items.push(...navigationItems(child, seenItems))
  })
  return items
}

export function getActiveNavigation(
  navigation: ReadonlyArray<NavigationItem>,
  pathname: string,
) {
  if (pathname.startsWith("/dashboard/files/")) {
    return navigation.find((item) => item.id === "files") ?? null
  }
  if (pathname.startsWith("/dashboard/buckets/")) {
    return navigation.find((item) => item.id === "buckets") ?? null
  }

  return (
    navigation.find(
      (item) => new URL(item.href, "https://one.invalid").pathname === pathname,
    ) ?? null
  )
}
