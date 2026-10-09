import { RefreshCwIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { SweepShine } from "@/components/sweep-shine"

type AppUpdateCheckerWorkerMessage = {
  type: "baseline" | "unchanged" | "unavailable" | "changed" | "error"
  url: string
  source?: string
  message?: string
}

export function AppUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (
      !import.meta.env.PROD ||
      typeof Worker === "undefined" ||
      !isHttpProtocol(window.location.protocol)
    ) {
      return
    }

    let worker: Worker

    try {
      const workerUrl = new URL(
        `${import.meta.env.BASE_URL}app-update-checker.worker.js`,
        window.location.origin,
      )
      worker = new Worker(workerUrl, {
        name: "app-update-checker",
        type: "module",
      })
    } catch (error) {
      console.warn("App update checker worker failed to start.", error)
      return
    }

    const requestCheck = (source: string) => {
      if (document.visibilityState === "hidden") {
        return
      }

      worker.postMessage({
        type: "check",
        source,
        url: new URL(import.meta.env.BASE_URL, window.location.origin).href,
      })
    }

    const handleWorkerMessage = (
      event: MessageEvent<AppUpdateCheckerWorkerMessage>,
    ) => {
      if (event.data?.type === "changed") {
        setUpdateAvailable(true)
      } else if (event.data?.type === "error") {
        console.debug("App update check failed.", event.data.message)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestCheck("visibilitychange")
      }
    }

    worker.addEventListener("message", handleWorkerMessage)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    const onOnline = () => requestCheck("online")
    window.addEventListener("online", onOnline)
    const interval = window.setInterval(() => requestCheck("interval"), 60_000)
    requestCheck("mount")

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("online", onOnline)
      worker.removeEventListener("message", handleWorkerMessage)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      worker.terminate()
    }
  }, [])

  if (!updateAvailable) {
    return null
  }

  const updateApplication = () => {
    setIsPending(true)
    reloadWithTimestamp()
  }

  return (
    <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 w-[calc(100%-2rem)] max-w-sm sm:right-6 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:w-full">
      <div
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        aria-label="新版本已发布"
        className="relative animate-in gap-0 rounded-xl border-0 bg-card px-4 py-4 shadow-lg ring-1 ring-foreground/5 duration-300 fade-in slide-in-from-bottom-3 motion-reduce:animate-none text-card-foreground"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RefreshCwIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-primary"
            />
            <p className="text-base leading-6 font-semibold">新版本已发布</p>
          </div>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            点击更新，刷新页面后即可使用新版本。
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={updateApplication}
              disabled={isPending}
              aria-busy={isPending || undefined}
            >
              <SweepShine
                active={isPending}
                className={isPending ? "text-primary-foreground/70" : undefined}
              >
                {isPending ? "正在更新…" : "立即更新"}
              </SweepShine>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-0 text-xs text-muted-foreground hover:bg-transparent"
              onClick={() => setUpdateAvailable(false)}
              disabled={isPending}
              aria-label="稍后提醒"
            >
              稍后提醒
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function reloadWithTimestamp() {
  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set("t", Date.now().toString())
  window.location.replace(nextUrl.toString())
}

function isHttpProtocol(protocol: string) {
  return protocol === "http:" || protocol === "https:"
}
