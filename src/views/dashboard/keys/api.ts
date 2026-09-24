import { json, request } from "@/lib/http"
export type AppKey = {
  id: string
  name: string
  logo: string | null
  token: string
  scopes: string[]
  storage_targets: StorageTarget[]
  load_balance: boolean
  created_at: number
  expires_at: number | null
  revoked: boolean
}
export type StorageTarget = {
  storage_id: string
  prefix: string
  weight?: number | null
}
export const keyScopes = [
  ["uploads:write", "上传文件"],
  ["files:read", "读取文件"],
  ["files:delete", "删除文件"],
] as const
export type AppKeyInput = {
  name: string
  logo: string | null
  scopes: string[]
  expires_at: number | null
  storage_targets: StorageTarget[]
  load_balance: boolean
}
export const listKeys = (
  params: { page: number; pageSize: number; search: string; status: string },
  signal?: AbortSignal,
) =>
  request<{ items: AppKey[]; total: number }>(
    `/api/keys?${new URLSearchParams({
      page: String(params.page),
      page_size: String(params.pageSize),
      search: params.search,
      status: params.status,
    })}`,
    { signal },
  )
export const createKey = (input: AppKeyInput) =>
  request<{ id: string; token: string }>("/api/keys", json(input))
export const updateKey = (id: string, input: AppKeyInput) =>
  request<void>(`/api/keys/${encodeURIComponent(id)}`, {
    ...json(input),
    method: "PUT",
  })
export const deleteKey = (id: string) =>
  request<void>(`/api/keys/${encodeURIComponent(id)}`, { method: "DELETE" })
export const setKeyEnabled = ({
  id,
  enabled,
}: {
  id: string
  enabled: boolean
}) =>
  request<void>(`/api/keys/${encodeURIComponent(id)}/enabled`, {
    ...json({ enabled }),
    method: "PATCH",
  })
export const rotateKey = (id: string) =>
  request<void>(`/api/keys/${encodeURIComponent(id)}/rotate`, {
    method: "POST",
  })
