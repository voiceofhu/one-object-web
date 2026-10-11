// Shared by every One web. Change it in one-template first, then copy it
// unchanged into each product (only Prettier formatting may differ).
//
// The build writes app-version.json with the same VITE_BUILD_TIME that is
// compiled into the bundle. A worker polls that manifest, so detection does not
// depend on HTTP validators such as ETag, which Cloudflare strips from HTML.

const CHECK_INTERVAL_MS = 60_000

type BuildEnv = {
  PROD: boolean
  BASE_URL: string
  VITE_BUILD_TIME?: string
}

type WorkerMessage = {
  type: "unchanged" | "changed" | "error"
  message?: string
}

/**
 * Starts update detection and calls `onUpdate` when a newer build is deployed
 * or a lazily loaded chunk of the running build has disappeared. Returns the
 * cleanup function; it is a no-op outside production browsers. `env` exists
 * for tests; callers rely on the default.
 */
export function startAppUpdateCheck(
  onUpdate: () => void,
  env: BuildEnv = import.meta.env,
): () => void {
  if (
    !env.PROD ||
    typeof Worker === "undefined" ||
    !["http:", "https:"].includes(window.location.protocol)
  )
    return () => {}

  const build = String(env.VITE_BUILD_TIME)
  const baseUrl = new URL(env.BASE_URL, window.location.origin)
  const manifestUrl = new URL("app-version.json", baseUrl).href
  const workerUrl = new URL("app-update-checker.worker.js", baseUrl)
  workerUrl.searchParams.set("build", build)
  let worker: Worker
  try {
    worker = new Worker(workerUrl, { name: "app-update-checker" })
  } catch (error) {
    console.debug("App update checker could not start.", error)
    return () => {}
  }

  const check = (source: string) => {
    if (document.visibilityState === "hidden") return
    worker.postMessage({ type: "check", source, url: manifestUrl, build })
  }
  const onMessage = ({ data }: MessageEvent<WorkerMessage>) => {
    if (data?.type === "changed") onUpdate()
    else if (data?.type === "error")
      console.debug("App update check failed.", data.message)
  }
  const onWorkerError = (event: ErrorEvent) =>
    console.debug("App update worker failed.", event.message)
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") check("visibilitychange")
  }
  const onOnline = () => check("online")
  // After a deploy, a route chunk of the running build may no longer exist.
  // Offer the reload instead of leaving the route broken.
  const onPreloadError = (event: Event) => {
    event.preventDefault()
    onUpdate()
  }

  worker.addEventListener("message", onMessage)
  worker.addEventListener("error", onWorkerError)
  document.addEventListener("visibilitychange", onVisibilityChange)
  window.addEventListener("online", onOnline)
  window.addEventListener("vite:preloadError", onPreloadError)
  const interval = window.setInterval(
    () => check("interval"),
    CHECK_INTERVAL_MS,
  )
  check("mount")

  return () => {
    window.clearInterval(interval)
    worker.removeEventListener("message", onMessage)
    worker.removeEventListener("error", onWorkerError)
    document.removeEventListener("visibilitychange", onVisibilityChange)
    window.removeEventListener("online", onOnline)
    window.removeEventListener("vite:preloadError", onPreloadError)
    worker.terminate()
  }
}

/** Reloads the current page past any cached HTML. */
export function reloadForUpdate() {
  const url = new URL(window.location.href)
  url.searchParams.set("t", Date.now().toString())
  window.location.replace(url.toString())
}
