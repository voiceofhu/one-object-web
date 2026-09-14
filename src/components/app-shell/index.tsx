import { useLocalAtom } from "@/hooks/use-local-atom"
import { useObjectTranslation } from "@/local/object"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { type CSSProperties, useEffect, useMemo } from "react"

import { Link, Outlet, useLocation, useNavigate } from "react-router"

import { DashboardPageTransition } from "@/components/dashboard-route-motion"

import { LanguageToggle } from "@/components/language-toggle"

import { useTranslation } from "@/components/providers/language-context"

import { ThemeToggle } from "@/components/theme/theme-toggle"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { cn } from "@/lib/utils"

import { authUserQuery } from "@/views/dashboard/account/api"

import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"

import {
  buildNavigationGroups,
  getActiveNavigation,
  type NavigationItem,
} from "./navigation"
import { NavigationGroupSection } from "./navigation-group"
import { RouteTags } from "./route-tags"
import { SessionIdentity } from "./session-identity"
export function AppShell() {
  const tx = useObjectTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const user = useQuery(authUserQuery)
  const access = useQuery(authPermissionsQuery)
  const navigationGroups = useMemo(
    () =>
      buildNavigationGroups(access.data).map((group) => ({
        ...group,
        label: group.label ? tx(group.label) : undefined,
        items: group.items.map((item) => ({ ...item, label: tx(item.label) })),
      })),
    [access.data, tx],
  )
  const navigation = useMemo(
    () => navigationGroups.flatMap((group) => group.items),
    [navigationGroups],
  )
  const activeNavigation = getActiveNavigation(
    navigation,
    location.pathname,
    location.search,
  )
  const [visitedIds, setVisitedIds] = useLocalAtom<ReadonlyArray<string>>(() =>
    activeNavigation && activeNavigation.id !== "home"
      ? ["home", activeNavigation.id]
      : ["home"],
  )
  const routeKey =
    location.pathname === "/dashboard/buckets" ||
    location.pathname.startsWith("/dashboard/buckets/")
      ? "/dashboard/buckets"
      : location.pathname === "/dashboard/files" ||
          location.pathname.startsWith("/dashboard/files/")
        ? "/dashboard/files"
        : `${location.pathname}${location.search}`
  const isFullBleedResourcePage =
    location.pathname === "/dashboard" ||
    location.pathname === "/dashboard/admin" ||
    location.pathname === "/dashboard/storage" ||
    location.pathname === "/dashboard/buckets" ||
    location.pathname.startsWith("/dashboard/buckets/") ||
    location.pathname === "/dashboard/files" ||
    location.pathname.startsWith("/dashboard/files/") ||
    location.pathname === "/dashboard/authorizations"
  useEffect(() => {
    if (!activeNavigation) {
      return
    }

    // Route changes are the external state this tab list mirrors.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitedIds((current) =>
      current.includes(activeNavigation.id)
        ? current
        : [...current, activeNavigation.id],
    )
  }, [activeNavigation, setVisitedIds])

  useEffect(() => {
    if (user.isSuccess && user.data === null) {
      queryClient.removeQueries({ queryKey: authPermissionsQuery.queryKey })
      queryClient.removeQueries({ queryKey: ["object-admin"] })
      queryClient.removeQueries({ queryKey: ["developer"] })
      queryClient.removeQueries({ queryKey: ["account"] })
    }
  }, [queryClient, user.data, user.isSuccess])

  function closeVisitedItem(item: NavigationItem) {
    if (item.id === "home") {
      return
    }

    const closingIndex = visitedIds.indexOf(item.id)
    const nextVisitedIds = visitedIds.filter((id) => id !== item.id)
    setVisitedIds(nextVisitedIds)

    if (activeNavigation?.id === item.id) {
      const fallbackId =
        nextVisitedIds[closingIndex - 1] ??
        nextVisitedIds[closingIndex] ??
        "home"
      const fallback = navigation.find(({ id }) => id === fallbackId)
      navigate(fallback?.href ?? "/dashboard")
    }
  }

  const visitedItems = visitedIds
    .map((id) => navigation.find((item) => item.id === id))
    .filter((item): item is NavigationItem => item !== undefined)

  return (
    <SidebarProvider
      className="h-svh overflow-hidden bg-muted"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "34px",
        } as CSSProperties
      }
    >
      <Sidebar collapsible="offcanvas" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:p-1.5!"
              >
                <Link to="/dashboard" aria-label={t("app.name")}>
                  <img
                    src="/one-object-logo.svg"
                    alt=""
                    aria-hidden="true"
                    className="size-6 rounded-md object-contain"
                  />
                  <span className="text-base font-semibold">
                    {t("app.name")}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {navigationGroups.map((group) => (
            <NavigationGroupSection
              activeItem={activeNavigation}
              group={group}
              key={group.id}
            />
          ))}
        </SidebarContent>
        <SidebarFooter className="pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <SessionIdentity session={user} />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="h-svh min-h-0 overflow-hidden bg-muted md:h-[calc(100svh-1rem)]">
        <header className="flex h-10 shrink-0 items-center overflow-visible border-b bg-muted transition-[width,height] ease-linear md:h-(--header-height) group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
          <div className="flex h-full w-full min-w-0 items-center overflow-visible px-3 lg:px-4">
            <SidebarTrigger className="mr-2 -ml-1 size-8 md:size-8" />
            <div
              className="h-full w-px shrink-0 bg-border"
              aria-hidden="true"
            />
            <RouteTags
              activeItem={activeNavigation}
              items={visitedItems}
              onClose={closeVisitedItem}
              onSelect={(item) => navigate(item.href)}
            />
            <div className="ml-1 flex h-full shrink-0 items-center gap-1.5 overflow-visible md:ml-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="@container/main flex min-h-0 flex-1 flex-col overflow-hidden bg-muted">
          <DashboardPageTransition routeKey={routeKey}>
            <div
              className={cn(
                "w-full",
                isFullBleedResourcePage
                  ? "flex min-h-0 flex-1 flex-col"
                  : "p-4 lg:p-5",
              )}
            >
              <Outlet />
            </div>
          </DashboardPageTransition>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
