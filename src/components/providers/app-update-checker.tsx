import { RefreshCwIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { reloadForUpdate, startAppUpdateCheck } from "@/lib/app-update"
import { SweepShine } from "@/components/sweep-shine"

export function AppUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => startAppUpdateCheck(() => setUpdateAvailable(true)), [])

  if (!updateAvailable) {
    return null
  }

  const updateApplication = () => {
    setIsPending(true)
    reloadForUpdate()
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
