import { json, request } from "@/lib/http"
export const PROVIDERS = {
  r2: "Cloudflare R2",
  aws: "AWS S3",
  aliyun: "阿里云 OSS",
  tencent: "腾讯云 COS",
  oci: "甲骨文云",
} as const
export type Provider = keyof typeof PROVIDERS
export type StorageConnection = {
  id: string
  name: string
  provider: Provider
  bucket: string
  account_id?: string | null
  region: string
  endpoint: string
  enabled: boolean
  created_at: number
  owner_name?: string | null
}
export type ConnectionInput = {
  name: string
  provider: Provider
  bucket: string
  region: string
  account_id: string
  access_key: string
  secret_key: string
}
export const listConnections = (signal?: AbortSignal) =>
  request<{ items: StorageConnection[] }>("/api/storage/connections", {
    signal,
  })
export const updateConnection = (
  id: string,
  input: {
    name: string
    enabled: boolean
    access_key?: string
    secret_key?: string
  },
) =>
  request<void>(`/api/storage/connections/${id}`, {
    ...json(input),
    method: "PUT",
  })
export type StorageAccount = Omit<
  StorageConnection,
  "bucket" | "account_id"
> & {
  synced_at: number | null
  bucket_count: number
}
export const listAccounts = (signal?: AbortSignal) =>
  request<{ items: StorageAccount[] }>("/api/storage/accounts", { signal })
export type StorageCredentials = {
  access_key: string
  secret_key: string
}
export const getAccountCredentials = (id: string) =>
  request<StorageCredentials>(
    `/api/storage/accounts/${encodeURIComponent(id)}/credentials`,
  )
export const createAccount = ({ bucket: _bucket, ...input }: ConnectionInput) =>
  request<{ id: string }>("/api/storage/accounts", json(input))
export const updateAccount = (
  id: string,
  input: Parameters<typeof updateConnection>[1],
) =>
  request<void>(`/api/storage/accounts/${id}`, {
    ...json(input),
    method: "PUT",
  })
export const checkAccount = (id: string) =>
  request<{ ok: boolean; message: string }>(
    `/api/storage/accounts/${id}/check`,
    { method: "POST" },
  )

export const deleteAccount = (id: string) =>
  request<void>(`/api/storage/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
export const deleteAccounts = (ids: string[]) =>
  request<void>("/api/storage/accounts/bulk-delete", json({ ids }))
