import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

// Shared by every One web together with src/lib/app-update.ts and
// public/app-update-checker.worker.js; copy all three from one-template.
// Runs under both `node --test` and Vitest, whichever the product uses.
const { test } = process.env.VITEST
  ? await import("vitest")
  : await import("node:test")

const env = { PROD: true, BASE_URL: "/", VITE_BUILD_TIME: "build-1" }

function fakeBrowser() {
  const listeners = { window: {}, document: {}, worker: {} }
  const add = (target) => (type, handler) => {
    ;(listeners[target][type] ??= new Set()).add(handler)
  }
  const remove = (target) => (type, handler) =>
    listeners[target][type]?.delete(handler)
  const emit = (target, type, event) =>
    [...(listeners[target][type] ?? [])].forEach((handler) => handler(event))
  const state = {
    posts: [],
    intervals: new Set(),
    terminated: false,
    url: null,
  }
  globalThis.window = {
    location: {
      origin: "https://app.example",
      protocol: "https:",
      href: "https://app.example/x",
    },
    addEventListener: add("window"),
    removeEventListener: remove("window"),
    setInterval: (callback) => {
      state.intervals.add(callback)
      return callback
    },
    clearInterval: (callback) => state.intervals.delete(callback),
  }
  globalThis.document = {
    visibilityState: "visible",
    addEventListener: add("document"),
    removeEventListener: remove("document"),
  }
  globalThis.Worker = class {
    constructor(url) {
      state.url = String(url)
    }
    postMessage(message) {
      state.posts.push(message)
    }
    addEventListener = add("worker")
    removeEventListener = remove("worker")
    terminate() {
      state.terminated = true
    }
  }
  return { state, listeners, emit }
}

const { startAppUpdateCheck } = await import("../src/lib/app-update.ts")

test("checks the deployed manifest on mount, interval and return to the tab", () => {
  const { state, emit } = fakeBrowser()
  const stop = startAppUpdateCheck(() => {}, env)
  assert.equal(
    state.url,
    "https://app.example/app-update-checker.worker.js?build=build-1",
  )
  assert.deepEqual(state.posts[0], {
    type: "check",
    source: "mount",
    url: "https://app.example/app-version.json",
    build: "build-1",
  })
  assert.equal(state.intervals.size, 1)
  ;[...state.intervals][0]()
  emit("document", "visibilitychange")
  assert.deepEqual(
    state.posts.map((post) => post.source),
    ["mount", "interval", "visibilitychange"],
  )
  document.visibilityState = "hidden"
  ;[...state.intervals][0]()
  assert.equal(state.posts.length, 3, "hidden tabs are not polled")
  stop()
})

test("reports a new build and a missing lazy chunk, then cleans up", () => {
  const { state, listeners, emit } = fakeBrowser()
  let updates = 0
  const stop = startAppUpdateCheck(() => (updates += 1), env)
  emit("worker", "message", { data: { type: "unchanged" } })
  emit("worker", "message", { data: { type: "error", message: "offline" } })
  assert.equal(updates, 0)
  emit("worker", "message", { data: { type: "changed" } })
  let prevented = false
  emit("window", "vite:preloadError", {
    preventDefault: () => (prevented = true),
  })
  assert.equal(updates, 2)
  assert.ok(prevented, "the chunk error is handled instead of thrown")
  stop()
  assert.ok(state.terminated)
  assert.equal(state.intervals.size, 0)
  for (const target of Object.values(listeners))
    for (const handlers of Object.values(target)) assert.equal(handlers.size, 0)
})

test("does nothing outside production", () => {
  const { state } = fakeBrowser()
  startAppUpdateCheck(() => {}, { ...env, PROD: false })()
  assert.equal(state.url, null)
})

async function runWorker(response, build) {
  let handler
  let resolve
  const result = new Promise((done) => (resolve = done))
  runInNewContext(readFileSync("public/app-update-checker.worker.js", "utf8"), {
    URL,
    AbortSignal,
    Date,
    Error,
    Set,
    fetch: async () => response,
    self: {
      addEventListener: (_type, callback) => (handler = callback),
      postMessage: (value) => resolve(value),
    },
  })
  handler({
    data: { type: "check", url: "https://app.example/app-version.json", build },
  })
  return result
}

test("worker compares builds and never reports bad manifests as updates", async () => {
  assert.equal(
    (await runWorker(Response.json({ build: "b" }), "b")).type,
    "unchanged",
  )
  assert.equal(
    (await runWorker(Response.json({ build: "c" }), "b")).type,
    "changed",
  )
  assert.equal(
    (await runWorker(new Response("missing", { status: 404 }), "b")).type,
    "error",
  )
  assert.equal((await runWorker(Response.json({}), "b")).type, "error")
})
