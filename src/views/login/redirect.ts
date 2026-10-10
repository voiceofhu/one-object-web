// One User (OIDC) entry: no start page. Unauthenticated visits go straight to
// One User's login; a short-lived guard stops callback/401 redirect loops.
const START_PATH = "/api/auth/oidc/start"
const GUARD_KEY = "one:oidc-redirect-at"
const RETURN_KEY = "one:oidc-return-to"
const GUARD_MS = 15_000

const isDashboardPath = (path: string | null | undefined): path is string =>
  !!path && (path === "/dashboard" || path.startsWith("/dashboard/"))

export function startLogin(returnTo?: string) {
  if (isDashboardPath(returnTo)) sessionStorage.setItem(RETURN_KEY, returnTo)
  sessionStorage.setItem(GUARD_KEY, String(Date.now()))
  window.location.replace(START_PATH)
}

export function recentlyRedirected() {
  return Date.now() - Number(sessionStorage.getItem(GUARD_KEY) ?? 0) < GUARD_MS
}

export function pendingReturnTo() {
  const path = sessionStorage.getItem(RETURN_KEY)
  return isDashboardPath(path) ? path : "/dashboard"
}

export function sessionEstablished() {
  sessionStorage.removeItem(GUARD_KEY)
  sessionStorage.removeItem(RETURN_KEY)
}
