import { uploadPart } from "./upload-part"
import { ApiError, json, request } from "@/lib/http"
export type Upload = {
  id: string
  method?: "single" | "multipart"
  original_filename: string
  file_size: number
  part_size: number
  total_parts: number
  status: string
  storage_id: string
  expires_at: number
}
export type UploadState = {
  upload: Upload
  parts: { part_number: number; sha256: string; size: number }[]
}
export const listUploads = (signal?: AbortSignal) =>
  request<{ items: Upload[] }>("/api/uploads", { signal })
export const getUpload = (id: string, signal?: AbortSignal) =>
  request<UploadState>(`/api/uploads/${id}`, { signal })
export const abortUpload = (id: string) =>
  request<{ status: string }>(`/api/uploads/${id}/abort`, { method: "POST" })
export async function uploadFile(
  file: File,
  id: string | undefined,
  signal: AbortSignal,
  progress: (id: string, percent: number) => void,
  storageId?: string,
  stage?: (label: string) => void,
  instant?: () => void,
  prefix?: string,
) {
  if (!file.size) throw new Error("请选择非空文件")
  const policy = id
    ? undefined
    : await request<UploadPolicy>("/api/uploads/policy", { signal })
  const partSize = policy ? selectPartSize(file.size, policy) : undefined
  let hashes: string[] | undefined
  if (!id) {
    stage?.("校验文件")
    hashes = []
    for (let offset = 0; offset < file.size; offset += partSize!) {
      signal.throwIfAborted()
      hashes.push(await hashChunk(file.slice(offset, offset + partSize!)))
      stage?.(
        `校验 ${Math.round((Math.min(offset + partSize!, file.size) / file.size) * 100)}%`,
      )
    }
    signal.throwIfAborted()
  }
  stage?.(id ? "读取上传任务" : "检查秒传并准备上传")
  const state = id
    ? await getUpload(id, signal)
    : await request<UploadState>("/api/uploads", {
        ...json({
          storage_id: storageId,
          single: shouldUseSingleUpload(file.size, policy),
          prefix,
          part_size: partSize,
          hashes,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
        }),
        signal,
      })
  const upload = state.upload
  if (!id && upload.status === "completed") {
    progress(upload.id, 100)
    instant?.()
    return upload.id
  }
  progress(upload.id, 0)
  if (upload.original_filename !== file.name || upload.file_size !== file.size)
    throw new Error("请选择与上传任务名称、大小一致的原文件")
  if (upload.status !== "initiated" && upload.status !== "completed")
    throw new Error("上传任务已结束，请重新上传")
  if (upload.method === "single") {
    if (id) {
      for (const previous of state.parts) {
        const chunk = file.slice(
          (previous.part_number - 1) * upload.part_size,
          Math.min(previous.part_number * upload.part_size, file.size),
        )
        if (
          chunk.size !== previous.size ||
          (await hashChunk(chunk)) !== previous.sha256
        ) {
          throw new Error("文件内容与声明摘要不一致，请取消任务并重新上传")
        }
      }
    }
    if (upload.status === "completed") {
      progress(upload.id, 100)
      return upload.id
    }
    stage?.("正在上传")
    let lastPercent = -1
    await retryUpload(
      () =>
        uploadPart(
          `/api/uploads/${upload.id}/content`,
          file,
          signal,
          (sent) => {
            const percent = Math.floor((sent / file.size) * 99)
            if (percent === lastPercent) return
            lastPercent = percent
            progress(upload.id, percent)
          },
          () => stage?.("等待云端确认"),
          610_000,
        ),
      signal,
    )
    progress(upload.id, 100)
    return upload.id
  }
  const confirmed = new Map(state.parts.map((part) => [part.part_number, part]))
  stage?.("校验已上传分片")
  for (const previous of state.parts) {
    signal.throwIfAborted()
    if (previous.part_number < 1 || previous.part_number > upload.total_parts)
      throw new Error("上传分片信息无效")
    const chunk = file.slice(
      (previous.part_number - 1) * upload.part_size,
      Math.min(previous.part_number * upload.part_size, file.size),
    )
    if (
      chunk.size !== previous.size ||
      (await hashChunk(chunk)) !== previous.sha256
    )
      throw new Error("已上传分片与所选文件不一致，请取消任务并重新上传")
  }
  if (upload.status === "completed" && confirmed.size !== upload.total_parts)
    throw new Error("已完成文件缺少校验信息")
  let doneBytes = state.parts.reduce((sum, part) => sum + part.size, 0)
  let doneParts = confirmed.size
  // Bytes handed to the network by in-flight parts; reset when a part is retried.
  const inflight = new Map<number, number>()
  let lastPercent = -1
  const report = () => {
    let sent = doneBytes
    for (const bytes of inflight.values()) sent += bytes
    const percent = Math.floor((Math.min(sent, file.size) / file.size) * 99)
    if (percent === lastPercent) return
    lastPercent = percent
    progress(upload.id, percent)
  }
  report()
  const pending: number[] = []
  for (let number = 1; number <= upload.total_parts; number++)
    if (!confirmed.has(number)) pending.push(number)
  // Parallel parts hide the per-part server→provider hop; one failure stops the rest.
  const failure = new AbortController()
  const partSignal = AbortSignal.any([signal, failure.signal])
  const sendPart = async (number: number) => {
    const chunk = file.slice(
      (number - 1) * upload.part_size,
      Math.min(number * upload.part_size, file.size),
    )
    await retryUpload(() => {
      inflight.set(number, 0)
      report()
      return uploadPart(
        `/api/uploads/${upload.id}/parts/${number}`,
        chunk,
        partSignal,
        (sent) => {
          inflight.set(number, sent)
          report()
        },
        () => {},
      )
    }, partSignal)
    inflight.delete(number)
    doneBytes += chunk.size
    doneParts++
    stage?.(`传输分片 ${doneParts}/${upload.total_parts}`)
    report()
  }
  if (pending.length) stage?.(`传输分片 ${doneParts}/${upload.total_parts}`)
  const worker = async () => {
    while (pending.length) {
      partSignal.throwIfAborted()
      const number = pending.shift()!
      try {
        await sendPart(number)
      } catch (error) {
        failure.abort(error)
        throw error
      }
    }
  }
  const workers = Array.from(
    { length: Math.min(PART_CONCURRENCY, pending.length) },
    worker,
  )
  const results = await Promise.allSettled(workers)
  signal.throwIfAborted()
  const rejected = results.find((result) => result.status === "rejected")
  if (rejected) throw failure.signal.reason ?? rejected.reason
  signal.throwIfAborted()
  if (upload.status === "completed") {
    progress(upload.id, 100)
    return upload.id
  }
  stage?.("正在合并")
  await retryUpload(
    () =>
      request(`/api/uploads/${upload.id}/complete`, {
        method: "POST",
        signal,
      }),
    signal,
  )
  progress(upload.id, 100)
  return upload.id
}

const PART_CONCURRENCY = 3

// Only retry idempotent part/complete requests. Creation is never automatically replayed.
async function retryUpload<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted()
    try {
      return await operation()
    } catch (error) {
      signal.throwIfAborted()
      const retryable =
        error instanceof TypeError ||
        (error instanceof ApiError &&
          (error.status === 408 || error.status === 429 || error.status >= 500))
      if (!retryable || attempt >= 2) throw error
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer)
          reject(signal.reason)
        }
        const timer = setTimeout(
          () => {
            signal.removeEventListener("abort", abort)
            resolve()
          },
          500 * 2 ** attempt + Math.random() * 250,
        )
        signal.addEventListener("abort", abort, { once: true })
      })
    }
  }
}

export type UploadPolicy = {
  multipart_threshold?: number
  max_single_file_size?: number
  min_part_size: number
  max_part_size: number
  default_part_size: number
  max_parts: number
  max_file_size: number
}

export function selectPartSize(
  fileSize: number,
  policy: UploadPolicy,
  device: { deviceMemory?: number; hardwareConcurrency?: number } = navigator,
) {
  if (fileSize > policy.max_file_size) throw new Error("文件超过上传大小上限")
  const mib = 1024 * 1024
  // Browser hints are approximate; missing hints retain the server default.
  let preferred = policy.default_part_size
  if (
    (device.deviceMemory && device.deviceMemory <= 2) ||
    (device.hardwareConcurrency && device.hardwareConcurrency <= 2)
  ) {
    preferred = 5 * mib
  } else if (
    (device.deviceMemory && device.deviceMemory <= 4) ||
    (device.hardwareConcurrency && device.hardwareConcurrency <= 4)
  ) {
    preferred = 8 * mib
  }
  const required = Math.ceil(fileSize / policy.max_parts)
  if (required > policy.max_part_size)
    throw new Error("文件需要的分片数超过上限")
  return Math.min(
    policy.max_part_size,
    Math.max(policy.min_part_size, preferred, required),
  )
}

async function hashChunk(chunk: Blob) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await chunk.arrayBuffer(),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

export function shouldUseSingleUpload(fileSize: number, policy?: UploadPolicy) {
  return fileSize < (policy?.multipart_threshold ?? 100_000_000)
}
