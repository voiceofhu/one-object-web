import { createApiFetch } from "@/lib/oblivious"

/** Production builds send API calls through Oblivious HTTP; `plain` must match the backend `Gateway::plain`. */
export const apiFetch = createApiFetch({
  enabled: import.meta.env.MODE === "production",
  plain: (pathname) =>
    [
      "/api/auth/oidc/start",
      "/api/auth/oidc/callback",
      "/api/files/upload",
      "/api/files/objects/download",
    ].includes(pathname) ||
    pathname.startsWith("/api/keys/logos/") ||
    /^\/api\/files\/[^/]+\/(download|access)$/.test(pathname) ||
    /^\/api\/uploads\/[^/]+\/(content|parts\/[^/]+)$/.test(pathname),
})

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}
export async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 160_000,
): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    signal: init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      message?: string
      code?: string
    }
    throw new ApiError(
      response.status,
      data.message || `请求失败（${response.status}）`,
      data.code,
    )
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>)
}
export function json(value: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  }
}
