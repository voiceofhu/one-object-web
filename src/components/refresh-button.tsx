import { useRef, useState, type ComponentProps, type MouseEvent } from "react"
import { RefreshCw } from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RefreshButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  onClick: (event: MouseEvent<HTMLButtonElement>) => unknown | Promise<unknown>
}

export function RefreshButton({
  onClick,
  children,
  disabled,
  className,
  ...props
}: RefreshButtonProps) {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const icon = useRef<SVGSVGElement>(null)
  async function refresh(event: MouseEvent<HTMLButtonElement>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    const animation = icon.current?.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      { duration: 700, iterations: Infinity },
    )
    let error: unknown
    try {
      const result = await onClick(event)
      const results = Array.isArray(result) ? result : [result]
      const failed = results.find(
        (value) =>
          value &&
          typeof value === "object" &&
          (value.isError === true || value.status === "rejected"),
      )
      if (failed) error = failed.error ?? failed.reason ?? new Error("请求失败")
    } catch (reason) {
      error = reason
    }
    if (animation) {
      animation.effect?.updateTiming({
        iterations: Math.max(
          1,
          Math.ceil(Number(animation.currentTime ?? 0) / 700),
        ),
      })
      await animation.finished.catch(() => {})
      animation.cancel()
    }
    lock.current = false
    setBusy(false)
    if (error)
      toast.error(
        "刷新失败：" + (error instanceof Error ? error.message : String(error)),
      )
    else toast.success("刷新完成")
  }
  return (
    <Button
      {...props}
      type="button"
      className={cn("order-last shrink-0", className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-label={props["aria-label"] ?? "刷新"}
      title={props.title ?? "刷新"}
      onClick={(event) => void refresh(event)}
    >
      <RefreshCw ref={icon} />
      {children}
    </Button>
  )
}
