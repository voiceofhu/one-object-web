import { json, request } from "@/lib/http"
export type ObjectFile = {
  id: string
  app_id: string
  original_filename: string
  object_key: string
  browse_storage_id: string | null
  file_size: number
  mime_type: string
  storage_id: string
  bucket_name: string
  created_at: number
  owner_name?: string | null
}
export const listFiles = (
  offset: number,
  search: string,
  signal?: AbortSignal,
  storageId?: string,
) =>
  request<{ items: ObjectFile[]; total: number; limit: number }>(
    `/api/files?${new URLSearchParams({ offset: String(offset), search, ...(storageId ? { storage_id: storageId } : {}) })}`,
    { signal },
  )
export const deleteFile = (id: string) =>
  request<void>(`/api/files/${encodeURIComponent(id)}`, { method: "DELETE" })

export type StorageObjectEntry = {
  kind: "folder" | "file"
  key: string
  name: string
  size: number | null
  modified_at: string | null
  storage_id: string
  bucket_name: string
}
export type StorageObjectsPage = {
  mode: "storage"
  items: StorageObjectEntry[]
  limit: number
  prefix: string
  next_cursor: string | null
  has_more: boolean
}
export const listStorageObjects = (
  storageId: string,
  prefix: string,
  cursor?: string,
  signal?: AbortSignal,
  recursive = false,
) =>
  request<StorageObjectsPage>(
    `/api/files/objects?${new URLSearchParams({
      storage_id: storageId,
      prefix,
      recursive: String(recursive),
      ...(cursor ? { cursor } : {}),
    })}`,
    { signal },
  )

export const deleteStorageObjects = (storageId: string, keys: string[]) =>
  request<{ deleted: string[]; failed: { key: string; message: string }[] }>(
    "/api/files/objects/batch-delete",
    json({ storage_id: storageId, keys }),
  )
