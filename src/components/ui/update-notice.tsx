"use client"

import { useEffect, useState } from "react"
import type { ComponentProps } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  isUpdateSnoozed,
  reloadForUpdate,
  snoozeUpdateForToday,
  startAppUpdateCheck,
} from "@/lib/app-update"
import { cn } from "@/lib/utils"

const EASE = [0.32, 0.72, 0, 1] as const
const ENTER = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.8,
} as const
const EXIT = { duration: 0.2, ease: EASE } as const
const FADE = { duration: 0.15 } as const
const SPIN = { duration: 0.9, ease: "linear", repeat: Infinity } as const

const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 dark:focus-visible:ring-[#0A84FF]/60"

export type UpdateNoticeLabels = {
  title: string
  description: string
  action: string
  updating: string
  later: string
}

const DEFAULT_LABELS: UpdateNoticeLabels = {
  title: "New version available",
  description: "Update to reload the page on the latest version.",
  action: "Update now",
  updating: "Updating…",
  later: "Later",
}

export type UpdateNoticeProps = Omit<
  ComponentProps<"div">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  open?: boolean
  onUpdate?: () => void
  onLater?: () => void
  labels?: Partial<UpdateNoticeLabels>
}

type CardProps = Omit<UpdateNoticeProps, "open" | "labels"> & {
  text: UpdateNoticeLabels
}

// its own component so the updating state resets each time the notice reopens
function Card({ className, text, onUpdate, onLater, ...props }: CardProps) {
  const reduced = useReducedMotion() ?? false
  const [updating, setUpdating] = useState(false)

  return (
    <motion.div
      data-slot="update-notice"
      data-state={updating ? "updating" : "idle"}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: reduced ? FADE : ENTER,
      }}
      exit={{
        ...(reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }),
        transition: reduced ? FADE : EXIT,
      }}
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm origin-bottom-right gap-3 rounded-3xl bg-white p-4 text-black shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_12px_32px_-8px_rgba(0,0,0,0.18)] sm:bottom-6 sm:right-6 dark:bg-[#1C1C1E] dark:text-white dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_32px_-8px_rgba(0,0,0,0.6)]",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-full bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/15 dark:text-[#0A84FF]"
      >
        <motion.svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={updating && !reduced ? { rotate: 360 } : { rotate: 0 }}
          transition={updating && !reduced ? SPIN : FADE}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </motion.svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-5">{text.title}</p>
        <p className="mt-1 text-[13px] font-medium leading-[18px] text-[#868593] dark:text-[#9B9AA7]">
          {text.description}
        </p>
        <div className="mt-3 flex items-center justify-end gap-1">
          <button
            type="button"
            disabled={updating}
            onClick={onLater}
            className={cn(
              "h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium text-[#868593] transition-colors hover:text-black disabled:cursor-default disabled:opacity-60 motion-reduce:transition-none dark:text-[#9B9AA7] dark:hover:text-white",
              FOCUS,
            )}
          >
            {text.later}
          </button>
          <button
            type="button"
            disabled={updating}
            aria-busy={updating || undefined}
            onClick={() => {
              setUpdating(true)
              ;(onUpdate ?? reloadForUpdate)()
            }}
            className={cn(
              "h-8 cursor-pointer rounded-full bg-black px-3.5 text-[13px] font-semibold text-white transition-[opacity,transform] hover:opacity-85 active:scale-95 disabled:cursor-default disabled:opacity-60 disabled:active:scale-100 motion-reduce:transition-none dark:bg-white dark:text-black",
              FOCUS,
            )}
          >
            {updating ? text.updating : text.action}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function UpdateNotice({
  open,
  onLater,
  labels,
  ...props
}: UpdateNoticeProps) {
  const controlled = open !== undefined
  const [detected, setDetected] = useState(false)

  // checks keep running while snoozed, so the notice returns on the first check after midnight
  useEffect(() => {
    if (controlled) return
    return startAppUpdateCheck(() => {
      if (!isUpdateSnoozed()) setDetected(true)
    })
  }, [controlled])

  return (
    <AnimatePresence>
      {(open ?? detected) && (
        <Card
          key="notice"
          text={{ ...DEFAULT_LABELS, ...labels }}
          onLater={() => {
            if (!controlled) {
              snoozeUpdateForToday()
              setDetected(false)
            }
            onLater?.()
          }}
          {...props}
        />
      )}
    </AnimatePresence>
  )
}

export default UpdateNotice
