import { useLocalAtom } from "@/hooks/use-local-atom"

import { type UseQueryResult, useMutation } from "@tanstack/react-query"

import {
  CircleUserRoundIcon,
  EllipsisVerticalIcon,
  LogInIcon,
  LogOutIcon,
  UsersRoundIcon,
} from "lucide-react"

import { lazy, Suspense } from "react"

import { Link } from "react-router"

import { toast } from "sonner"

import { useTranslation } from "@/components/providers/language-context"

import { DialogActionButton } from "@/components/ui/dialog-action-button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

import { getDefaultUserAvatarSeed } from "@/lib/default-user-avatar"

import { logout, type AuthUser } from "@/views/dashboard/account/api"

const DefaultUserAvatar = lazy(async () => {
  const module = await import("@/components/default-user-avatar")
  return { default: module.DefaultUserAvatar }
})

type SessionQuery = UseQueryResult<AuthUser | null, Error>

export function SessionIdentity({ session }: { session: SessionQuery }) {
  const { isMobile } = useSidebar()
  const { locale, t } = useTranslation()
  const [logoutDialogOpen, setLogoutDialogOpen] = useLocalAtom(false)
  const user = session.data
  const displayName = user?.display_name ?? t("session.signedOut")
  const secondaryText = user?.email?.trim()
  const avatarSeed = getDefaultUserAvatarSeed(
    user?.user_id,
    user?.email,
    user?.user_name,
    user?.display_name,
  )
  const logoutMutation = useMutation({
    mutationFn: (_switchAccount: boolean) => logout(),
    onError: (error) =>
      toast.error(t("account.logoutError"), {
        description: error.message,
      }),
    onSuccess: (_data, switchAccount) => {
      window.location.replace(switchAccount ? "/api/auth/oidc/start" : "/")
    },
  })

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground"
              >
                {user ? (
                  <Suspense fallback={null}>
                    <Avatar className="size-full">
                      <AvatarImage src={user.picture || undefined} alt="" />
                      <AvatarFallback>
                        <DefaultUserAvatar seed={avatarSeed} />
                      </AvatarFallback>
                    </Avatar>
                  </Suspense>
                ) : session.isPending ? (
                  "…"
                ) : (
                  "!"
                )}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5 text-left leading-none">
                <span className="truncate text-sm font-medium">
                  {displayName}
                </span>
                {secondaryText ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {secondaryText}
                  </span>
                ) : null}
              </span>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-64"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <span className="grid min-w-0 gap-1">
                <span className="truncate text-sm font-medium">
                  {displayName}
                </span>
                {secondaryText ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {secondaryText}
                  </span>
                ) : null}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user ? (
              <>
                <DropdownMenuItem asChild>
                  <a href="/api/auth/account">
                    <CircleUserRoundIcon />
                    {t("nav.account")}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={logoutMutation.isPending}
                  onSelect={() => logoutMutation.mutate(true)}
                >
                  <UsersRoundIcon />
                  {t("account.switchAccount")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={logoutMutation.isPending}
                  onSelect={() => setLogoutDialogOpen(true)}
                  variant="destructive"
                >
                  <LogOutIcon />
                  {t("account.logout")}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Link to="/login">
                  <LogInIcon />
                  {t("nav.login")}
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <ResponsiveDialog
          open={logoutDialogOpen}
          onOpenChange={(open) => {
            if (!logoutMutation.isPending) setLogoutDialogOpen(open)
          }}
        >
          <ResponsiveDialogContent className="sm:max-w-[25rem]">
            <ResponsiveDialogHeader className="px-5 py-4 pr-12">
              <ResponsiveDialogTitle>
                {t("account.logout")}
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody className="px-5 py-4">
              <ResponsiveDialogDescription className="leading-6">
                {locale === "zh-CN"
                  ? "确认退出 One Object 并返回首页吗？这不会退出 One User 或其他平台。"
                  : "Sign out of One Object and return home? One User and other platforms will remain signed in."}
              </ResponsiveDialogDescription>
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter className="gap-2 px-5 py-3">
              <ResponsiveDialogClose asChild>
                <DialogActionButton
                  action="cancel"
                  className="min-w-20"
                  disabled={logoutMutation.isPending}
                  type="button"
                  variant="outline"
                >
                  {locale === "zh-CN" ? "取消" : "Cancel"}
                </DialogActionButton>
              </ResponsiveDialogClose>
              <DialogActionButton
                aria-busy={logoutMutation.isPending}
                className="min-w-24"
                disabled={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate(false)}
                type="button"
                variant="destructive"
              >
                {logoutMutation.isPending
                  ? locale === "zh-CN"
                    ? "退出中..."
                    : "Signing out..."
                  : t("account.logout")}
              </DialogActionButton>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
