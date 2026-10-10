import { useObjectTranslation } from "@/local/object"
import { RouteProgressPending } from "@/components/route-progress"
import { lazy, Suspense, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Navigate, Outlet, Route, Routes } from "react-router"
const AppShell = lazy(async () => ({
  default: (await import("@/components/app-shell")).AppShell,
}))
import { Loading, Failure } from "@/components/async-state"
import { LoginPage } from "@/views/login"
import { pendingReturnTo, sessionEstablished } from "@/views/login/redirect"
import { authUserQuery } from "@/views/dashboard/account/api"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"
const Dashboard = lazy(() => import("@/views/dashboard"))
const Users = lazy(() => import("@/views/dashboard/users"))
const Roles = lazy(() => import("@/views/dashboard/roles"))
const Permissions = lazy(() => import("@/views/dashboard/permissions"))
const LoginEvents = lazy(() => import("@/views/dashboard/login-events"))
const OperationLogs = lazy(() => import("@/views/dashboard/operation-logs"))
const Account = lazy(() => import("@/views/dashboard/account"))
const Files = lazy(() => import("@/views/dashboard/files"))
const Keys = lazy(() => import("@/views/dashboard/keys"))
const Buckets = lazy(() => import("@/views/dashboard/buckets"))
const Storage = lazy(() => import("@/views/dashboard/storage"))
const ApiGuide = lazy(() => import("@/views/api-guide"))
function RequirePermission({ code }: { code: string }) {
  const tx = useObjectTranslation()

  const access = useQuery(authPermissionsQuery)
  if (access.isPending) return <Loading />
  if (access.error) return <Failure error={access.error} />
  return access.data?.permissions.includes(code) ? (
    <Outlet context={access.data.permissions} />
  ) : (
    <Failure error={new Error(tx("没有此页面的访问权限"))} />
  )
}
const adminPages = [
  ["users", "object:user:list", Users],
  ["roles", "object:role:list", Roles],
  ["permissions", "object:permission:list", Permissions],
  ["login-events", "object:login-log:list", LoginEvents],
  ["operation-logs", "object:operation-log:list", OperationLogs],
] as const
function AuthenticatedApp() {
  const account = useQuery(authUserQuery)
  useEffect(() => {
    if (account.data) sessionEstablished()
  }, [account.data])
  if (account.isPending)
    return (
      <main className="p-8">
        <Loading />
      </main>
    )
  if (account.error)
    return (
      <main className="mx-auto max-w-xl p-8">
        <Failure error={account.error} retry={() => void account.refetch()} />
      </main>
    )
  if (!account.data) return <LoginPage />
  return (
    <Suspense
      fallback={
        <>
          <RouteProgressPending />
          <Loading />
        </>
      }
    >
      <Routes>
        <Route index element={<Navigate to={pendingReturnTo()} replace />} />
        <Route path="dashboard" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          {adminPages.map(([path, code, Page]) => (
            <Route key={path} element={<RequirePermission code={code} />}>
              <Route path={path} element={<Page />} />
            </Route>
          ))}
          <Route path="account" element={<Account />} />
          <Route element={<RequirePermission code="object:files:read" />}>
            <Route path="files">
              <Route index element={<Files />} />
              <Route path=":id/*" element={<Files />} />
            </Route>
          </Route>
          <Route element={<RequirePermission code="object:keys:list" />}>
            <Route path="authorizations" element={<Keys />} />
          </Route>
          <Route element={<RequirePermission code="object:storage:read" />}>
            <Route path="storage" element={<Storage />} />
          </Route>
          <Route element={<RequirePermission code="object:bucket:read" />}>
            <Route path="buckets">
              <Route index element={<Buckets />} />
              <Route path=":id" element={<Buckets />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="guide" element={<ApiGuide />} />
        <Route path="*" element={<AuthenticatedApp />} />
      </Routes>
    </Suspense>
  )
}
