import { apiFetch } from "@/lib/http"
export class HttpError extends Error {
  readonly status: number
  readonly details: unknown
  readonly contentType: string

  constructor(
    status: number,
    message: string,
    details: unknown = null,
    contentType = "",
  ) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.details = details
    this.contentType = contentType
  }
}

export type RootResponse<T> = {
  body: T
  status: number
}

export function rootRequest<T>(path: string, init?: RequestInit) {
  return request<T>(rootRelativeUrl(path), init).then(
    (response) => response.body,
  )
}

export function rootRequestWithStatus<T>(path: string, init?: RequestInit) {
  return request<T>(rootRelativeUrl(path), init)
}

async function request<T>(
  url: string,
  init: RequestInit = {},
): Promise<RootResponse<T>> {
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")

  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !(init.body instanceof Blob) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json")
  }

  const response = await apiFetch(url, { ...init, headers })
  const body = await parseBody(response)

  if (!response.ok) {
    throw new HttpError(
      response.status,
      readErrorMessage(response, body),
      body,
      response.headers.get("content-type") ?? "",
    )
  }

  return { body: body as T, status: response.status }
}

function rootRelativeUrl(path: string) {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("#") ||
    hasUnsafePathCharacter(path)
  ) {
    throw new Error("root request path must be a safe same-origin relative URL")
  }
  return path
}

function hasUnsafePathCharacter(value: string) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)
  })
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("json")) {
    try {
      return await response.json()
    } catch {
      throw new HttpError(
        response.status,
        `HTTP ${response.status} returned invalid JSON`,
      )
    }
  }

  return response.text()
}

function readErrorMessage(response: Response, body: unknown) {
  if (isProblemDetails(body)) {
    return body.detail || body.title
  }

  if (typeof body === "string" && body.trim()) {
    return body
  }

  return response.statusText || `HTTP ${response.status}`
}

function isProblemDetails(
  body: unknown,
): body is { title: string; detail?: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    "title" in body &&
    typeof body.title === "string"
  )
}
