import { ApiError, request } from "@/lib/http"

/**
 * PUTs a plain (non-OHTTP) upload body. Uses XHR because fetch exposes no upload byte events;
 * `onProgress` reports bytes handed to the network, `onSent` fires once the body is fully sent
 * and the server is forwarding it to the provider. Falls back to fetch where XHR is missing.
 */
export async function uploadPart<T = unknown>(
  path: string,
  body: Blob,
  signal: AbortSignal,
  onProgress: (sent: number) => void,
  onSent: () => void,
  timeoutMs = 160_000,
): Promise<T> {
  signal.throwIfAborted()
  const headers = { "Content-Type": "application/octet-stream" }
  if (typeof XMLHttpRequest === "undefined") {
    const result = await request<T>(
      path,
      { method: "PUT", body, signal, headers },
      timeoutMs,
    )
    onProgress(body.size)
    onSent()
    return result
  }
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    const done = () => signal.removeEventListener("abort", abort)
    xhr.open("PUT", path)
    xhr.withCredentials = true
    xhr.timeout = timeoutMs
    xhr.setRequestHeader("Content-Type", headers["Content-Type"])
    xhr.upload.onprogress = (event) =>
      onProgress(Math.min(event.loaded, body.size))
    xhr.upload.onload = () => {
      onProgress(body.size)
      onSent()
    }
    xhr.onload = () => {
      done()
      let data: unknown
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : undefined
      } catch {
        data = undefined
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data as T)
      const error = (data ?? {}) as { message?: string; code?: string }
      reject(
        new ApiError(
          xhr.status,
          error.message || `请求失败（${xhr.status}）`,
          error.code,
        ),
      )
    }
    // Network failures surface as TypeError, like fetch, so callers can retry them.
    xhr.onerror = () => {
      done()
      reject(new TypeError("网络连接中断"))
    }
    xhr.ontimeout = () => {
      done()
      reject(new ApiError(408, "上传超时"))
    }
    xhr.onabort = () => {
      done()
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"))
    }
    signal.addEventListener("abort", abort, { once: true })
    xhr.send(body)
  })
}
