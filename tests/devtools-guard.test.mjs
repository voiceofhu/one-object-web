import disableDevtool from "disable-devtool"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { startDevtoolsGuard } from "../src/lib/devtools-guard.ts"

// Runs under both `node --test` and Vitest, whichever the product uses.
const { afterEach, test } = process.env.VITEST
  ? await import("vitest")
  : await import("node:test")

const env = { PROD: true, MODE: "production" }
const md5 = (value) => createHash("md5").update(value).digest("hex")

function browser({
  touch = 0,
  coarse = false,
  search = "",
  openOnStart = false,
  pausedOnStart = false,
} = {}) {
  const listeners = { window: new Map(), document: new Map() }
  const timers = new Map()
  const samples = pausedOnStart ? [0, 500] : []
  const writes = []
  const navigations = []
  let nextTimer = 0
  let options
  const add = (target) => (type, callback) => {
    const handlers = listeners[target].get(type) ?? new Set()
    handlers.add(callback)
    listeners[target].set(type, handlers)
  }
  const remove = (target) => (type, callback) =>
    listeners[target].get(type)?.delete(callback)
  const emit = (target, type, event = {}) => {
    for (const handler of listeners[target].get(type) ?? []) handler(event)
  }
  globalThis.window = {
    navigator: { maxTouchPoints: touch },
    matchMedia: () => ({ matches: coarse }),
    location: {
      search,
      replace: (url) => {
        assert.deepEqual(writes, [""])
        navigations.push(url)
      },
    },
    performance: { now: () => samples.shift() ?? 0 },
    addEventListener: add("window"),
    removeEventListener: remove("window"),
    setTimeout: (callback, delay) => {
      const id = ++nextTimer
      timers.set(id, { callback, delay })
      return id
    },
    clearTimeout: (id) => timers.delete(id),
  }
  globalThis.document = {
    visibilityState: "visible",
    activeElement: null,
    body: {
      set innerHTML(value) {
        writes.push(value)
      },
    },
    addEventListener: add("document"),
    removeEventListener: remove("document"),
  }
  const detector = (config) => {
    options = config
    if (openOnStart)
      config.ondevtoolopen(disableDevtool.DetectorType.DebugLib, () =>
        assert.fail("must not close the tab"),
      )
    return { success: true, reason: "" }
  }
  Object.assign(detector, {
    DetectorType: disableDevtool.DetectorType,
    md5: disableDevtool.md5,
    isSuspend: false,
  })
  const key = (values) => {
    const event = {
      key: "i",
      code: "KeyI",
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      target: null,
      ...values,
    }
    event.preventDefault = () => {
      event.prevented = true
    }
    event.stopImmediatePropagation = () => {
      event.stopped = true
    }
    emit("window", "keydown", event)
    return event
  }
  const tick = (...times) => {
    samples.push(...times)
    const [id, { callback }] = [...timers][0]
    timers.delete(id)
    callback()
  }
  return {
    timers,
    writes,
    navigations,
    listeners,
    detector,
    emit,
    key,
    tick,
    options: () => options,
  }
}

afterEach(() => {
  delete globalThis.window
  delete globalThis.document
})

test("dev, stage and touch devices install neither native checks nor library detectors", () => {
  for (const [config, device] of [
    [{ ...env, PROD: false }, {}],
    [{ ...env, MODE: "stage" }, {}],
    [env, { touch: 5 }],
    [env, { coarse: true }],
  ]) {
    const page = browser(device)
    assert.equal(startDevtoolsGuard(config, page.detector), true)
    assert.equal(page.options(), undefined)
    assert.equal(page.timers.size, 0)
    assert.equal(page.listeners.window.size, 0)
  }
})

test("the configured production token bypasses both layers, wrong or unconfigured tokens do not", () => {
  const token = "guard-test+token"
  for (const [config, search, bypass] of [
    [
      { ...env, VITE_DEVTOOLS_BYPASS_MD5: ` ${md5(token).toUpperCase()} ` },
      `?debug=${encodeURIComponent(token)}`,
      true,
    ],
    [{ ...env, VITE_DEVTOOLS_BYPASS_MD5: md5(token) }, "?debug=wrong", false],
    [{ ...env, VITE_DEVTOOLS_BYPASS_MD5: md5(token) }, "", false],
    [env, `?debug=${encodeURIComponent(token)}`, false],
  ]) {
    const page = browser({ search })
    assert.equal(startDevtoolsGuard(config, page.detector), true)
    assert.equal(page.options() === undefined, bypass)
    assert.equal(page.timers.size, bypass ? 0 : 1)
  }
})

test("F12 and cross-platform I/J/C/K shortcuts block, ordinary keys stay usable", () => {
  for (const code of ["KeyI", "KeyJ", "KeyC", "KeyK"])
    for (const modifiers of [
      { ctrlKey: true, shiftKey: true },
      { ctrlKey: true, altKey: true },
      { metaKey: true, shiftKey: true },
      { metaKey: true, altKey: true },
    ]) {
      const page = browser()
      startDevtoolsGuard(env, page.detector)
      const event = page.key({ code, ...modifiers })
      assert.equal(event.prevented, true)
      assert.equal(event.stopped, true)
      assert.deepEqual(page.writes, [""])
      assert.deepEqual(page.navigations, ["about:blank"])
      assert.equal(page.timers.size, 0)
    }
  const page = browser()
  startDevtoolsGuard(env, page.detector)
  assert.equal(page.key({ ctrlKey: true, code: "KeyA" }).prevented, undefined)
  assert.equal(page.writes.length, 0)
  page.key({ key: "F12" })
  assert.equal(page.writes.length, 1)
})

test("editable fields preserve letter shortcuts and library key handling, but F12 still blocks", () => {
  for (const target of [
    { tagName: "INPUT" },
    { tagName: "TEXTAREA" },
    { tagName: "DIV", isContentEditable: true },
  ]) {
    const page = browser()
    startDevtoolsGuard(env, page.detector)
    document.activeElement = target
    assert.equal(
      page.key({ target, ctrlKey: true, altKey: true }).prevented,
      undefined,
    )
    // The detection loop runs outside any event and must not be paused by focus.
    assert.equal(page.options().ignore(), false)
    window.event = { type: "keydown", target }
    assert.equal(page.options().ignore(), true)
    window.event = { type: "contextmenu", target }
    assert.equal(page.options().ignore(), true)
    window.event = { type: "keydown", target: null }
    assert.equal(page.options().ignore(), false)
    delete window.event
    assert.equal(page.writes.length, 0)
    page.key({ target, key: "F12" })
    assert.equal(page.writes.length, 1)
  }
})

test("the native probe reschedules normally and blocks a pause strictly above 120ms", () => {
  const page = browser()
  startDevtoolsGuard(env, page.detector)
  assert.equal([...page.timers.values()][0].delay, 2400)
  page.tick(0, 1)
  assert.equal(page.timers.size, 1)
  page.tick(1000, 1120)
  assert.equal(page.writes.length, 0)
  page.tick(2000, 2121)
  assert.equal(page.writes.length, 1)
  assert.deepEqual(page.navigations, ["about:blank"])
  assert.equal(page.timers.size, 0)
  assert.equal(page.detector.isSuspend, true)
})

test("hidden and departed pages pause, returning to the page schedules only one probe", () => {
  const page = browser()
  startDevtoolsGuard(env, page.detector)
  document.visibilityState = "hidden"
  page.emit("document", "visibilitychange")
  assert.equal(page.timers.size, 0)
  assert.equal(page.options().ignore(), true)
  document.visibilityState = "visible"
  page.emit("document", "visibilitychange")
  page.emit("window", "pageshow")
  assert.equal(page.timers.size, 1)
  page.emit("window", "pagehide")
  assert.equal(page.timers.size, 0)
  page.emit("window", "pageshow")
  assert.equal(page.timers.size, 1)
})

test("library detections use the same one-shot blocker and detach native listeners", () => {
  const page = browser()
  startDevtoolsGuard(env, page.detector)
  const config = page.options()
  assert.deepEqual(config.detectors, [1, 3, 4, 7])
  assert.equal(config.clearLog, false)
  assert.equal(config.disableIframeParents, false)
  config.ondevtoolopen(1)
  config.ondevtoolopen(3)
  assert.equal(page.writes.length, 1)
  assert.equal(page.timers.size, 0)
  for (const target of Object.values(page.listeners))
    for (const handlers of target.values()) assert.equal(handlers.size, 0)
})

test("a detector firing during startup prevents React from mounting", () => {
  const page = browser({ openOnStart: true })
  assert.equal(startDevtoolsGuard(env, page.detector), false)
  assert.equal(page.writes.length, 1)
  assert.equal(page.timers.size, 0)
})

test("DevTools already open on load blanks the page before React or detectors start", () => {
  const page = browser({ pausedOnStart: true })
  assert.equal(startDevtoolsGuard(env, page.detector), false)
  assert.deepEqual(page.writes, [""])
  assert.deepEqual(page.navigations, ["about:blank"])
  assert.equal(page.options(), undefined)
  assert.equal(page.timers.size, 0)
  assert.equal(page.listeners.window.size, 0)
})
