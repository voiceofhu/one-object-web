import { afterEach, expect, it, vi } from "vitest"
import { uploadPart } from "./upload-part"
afterEach(() => vi.unstubAllGlobals())
it("falls back to fetch and reports bytes once confirmed when XHR is missing", async () => {
  let finish!: (response: Response) => void
  const fetch = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve
      }),
  )
  vi.stubGlobal("fetch", fetch)
  const progress = vi.fn(),
    sent = vi.fn()
  const body = new Blob(["abcdef"])
  const pending = uploadPart(
    "/part",
    body,
    new AbortController().signal,
    progress,
    sent,
  )
  expect(progress).not.toHaveBeenCalled()
  expect(fetch.mock.calls[0]).toBeDefined()
  finish(new Response(null, { status: 204 }))
  await pending
  expect(progress).toHaveBeenCalledWith(6)
  expect(sent).toHaveBeenCalledOnce()
})
it("does not send an aborted upload and preserves provider errors", async () => {
  const fetch = vi.fn(async () =>
    Response.json({ message: "没有上传权限" }, { status: 403 }),
  )
  vi.stubGlobal("fetch", fetch)
  const controller = new AbortController()
  controller.abort()
  await expect(
    uploadPart("/part", new Blob(["x"]), controller.signal, vi.fn(), vi.fn()),
  ).rejects.toMatchObject({ name: "AbortError" })
  expect(fetch).not.toHaveBeenCalled()
  await expect(
    uploadPart(
      "/part",
      new Blob(["x"]),
      new AbortController().signal,
      vi.fn(),
      vi.fn(),
    ),
  ).rejects.toMatchObject({ status: 403, message: "没有上传权限" })
})

it("reports byte progress through XHR before the server responds", async () => {
  const instances: FakeXhr[] = []
  class FakeXhr {
    upload: {
      onprogress?: (e: { loaded: number }) => void
      onload?: () => void
    } = {}
    status = 0
    responseText = ""
    withCredentials = false
    timeout = 0
    onload?: () => void
    onerror?: () => void
    ontimeout?: () => void
    onabort?: () => void
    open = vi.fn()
    setRequestHeader = vi.fn()
    abort = vi.fn(() => this.onabort?.())
    send = vi.fn()
    constructor() {
      instances.push(this)
    }
  }
  vi.stubGlobal("XMLHttpRequest", FakeXhr)
  const progress = vi.fn(),
    sent = vi.fn()
  const pending = uploadPart(
    "/part",
    new Blob(["abcdef"]),
    new AbortController().signal,
    progress,
    sent,
  )
  const xhr = instances[0]
  xhr.upload.onprogress?.({ loaded: 3 })
  expect(progress).toHaveBeenLastCalledWith(3)
  xhr.upload.onload?.()
  expect(sent).toHaveBeenCalledOnce()
  xhr.status = 200
  xhr.responseText = JSON.stringify({ part: { part_number: 1 } })
  xhr.onload?.()
  await expect(pending).resolves.toEqual({ part: { part_number: 1 } })
  expect(progress).toHaveBeenLastCalledWith(6)
})
