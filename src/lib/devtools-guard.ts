import disableDevtool from "disable-devtool"

// Production-only deterrent against casual DevTools use, built on disable-devtool.
// Everything that runs in the browser can be bypassed by a determined user, so
// never rely on this for security; keep secrets and authorization on the server.
//
// Library detectors and native checks share one blocker and one debug bypass.
// Detection clears the body and replaces the page with about:blank, so the
// tab keeps no app content or history entry. DevTools that is already open on
// load is caught by a synchronous probe before React mounts. To debug
// production, set VITE_DEVTOOLS_BYPASS_MD5 to the MD5 of a random token and
// open any page with ?debug=<token>. Leaving it empty disables the bypass.

type GuardEnv = {
  PROD: boolean
  MODE: string
  VITE_DEVTOOLS_BYPASS_MD5?: string
}

const PROBE_INTERVAL_MS = 2400
const PAUSE_THRESHOLD_MS = 120

function isEditable(target: EventTarget | null) {
  const element = target as HTMLElement | null
  return (
    element?.tagName === "INPUT" ||
    element?.tagName === "TEXTAREA" ||
    element?.isContentEditable === true
  )
}

/** True when a `debugger` statement paused, i.e. DevTools is open. */
function pausedByDebugger() {
  const start = window.performance.now()
  // A single breakpoint per call; never spin on debugger statements.
  // oxlint-disable-next-line no-debugger
  debugger
  return window.performance.now() - start > PAUSE_THRESHOLD_MS
}

function blankPage() {
  document.body.innerHTML = ""
  window.location.replace("about:blank")
}

/** Lets the library's key/context-menu blocking skip editable fields only. */
function isEditingEvent() {
  // oxlint-disable-next-line typescript/no-deprecated
  const event = window.event
  return (
    (event?.type === "keydown" || event?.type === "contextmenu") &&
    isEditable(event.target)
  )
}

/** Returns false if a synchronous detector blocked startup before React mounts. */
export function startDevtoolsGuard(
  env: GuardEnv = import.meta.env,
  detector = disableDevtool,
): boolean {
  // Production builds only (`vite build`); stage builds use `--mode stage`.
  if (!env.PROD || env.MODE !== "production") return true
  // The desktop app hosts this page in its own webview.
  if ("__TAURI_INTERNALS__" in window) return true
  if (
    window.navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  )
    return true

  const md5 = env.VITE_DEVTOOLS_BYPASS_MD5?.trim().toLowerCase()
  const token = new URLSearchParams(window.location.search).get("debug")
  if (md5 && token && detector.md5(token) === md5) return true
  if (pausedByDebugger()) {
    blankPage()
    return false
  }

  let blocked = false
  let active = true
  let timer: number | undefined
  const cancel = () => {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = undefined
  }
  const stop = () => {
    active = false
    cancel()
    window.removeEventListener("keydown", onKeyDown, true)
    window.removeEventListener("pagehide", onPageHide)
    window.removeEventListener("pageshow", onPageShow)
    document.removeEventListener("visibilitychange", schedule)
  }
  const block = () => {
    if (blocked) return
    blocked = true
    detector.isSuspend = true
    stop()
    blankPage()
  }
  const schedule = () => {
    cancel()
    if (!active || blocked || document.visibilityState !== "visible") return
    timer = window.setTimeout(() => {
      timer = undefined
      if (!active || blocked || document.visibilityState !== "visible") return
      if (
        pausedByDebugger() &&
        active &&
        document.visibilityState === "visible"
      )
        block()
      schedule()
    }, PROBE_INTERVAL_MS)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    const f12 = event.key === "F12"
    if (!f12 && isEditable(event.target)) return
    const shortcut =
      (event.ctrlKey || event.metaKey) &&
      (event.shiftKey || event.altKey) &&
      ["KeyI", "KeyJ", "KeyC", "KeyK"].includes(event.code)
    if (!f12 && !shortcut) return
    event.preventDefault()
    event.stopImmediatePropagation()
    block()
  }
  const onPageHide = () => {
    active = false
    cancel()
  }
  const onPageShow = () => {
    active = true
    schedule()
  }

  window.addEventListener("keydown", onKeyDown, true)
  window.addEventListener("pagehide", onPageHide)
  window.addEventListener("pageshow", onPageShow)
  document.addEventListener("visibilitychange", schedule)
  const { DetectorType } = detector
  detector({
    // Size and large-console-object timing can misfire on zoom or slow devices.
    // The native probe above measures only a debugger pause.
    detectors: [
      DetectorType.DefineId,
      DetectorType.DateToString,
      DetectorType.FuncToString,
      DetectorType.DebugLib,
    ],
    disableMenu: true,
    disableIframeParents: false,
    clearLog: false,
    interval: 1000,
    clearIntervalWhenDevOpenTrigger: true,
    // The library calls ignore() from its detection loop and its key and
    // context-menu handlers; only the handlers may skip editable fields, so a
    // focused input never pauses detection.
    ignore: () =>
      blocked || document.visibilityState !== "visible" || isEditingEvent(),
    ondevtoolopen: block,
  })
  schedule()
  return !blocked
}
