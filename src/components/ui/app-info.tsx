"use client"

import { useEffect } from "react"

const DEFAULT_COLOR = "#61dafb"
const KEY = "background:#20232a;color:#fff;padding:1px 5px;border-radius:3px"
const KEY_JOINED = `${KEY} 0 0 3px`

const seen = new Set<string>()

function buildParts(value: string | undefined, timeZone: string) {
  const date = new Date(value ?? "")
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date)
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    // utc comes back as a bare "GMT"
    offset: get("timeZoneName").replace("GMT", "") || "+00:00",
  }
}

// a fixed time zone keeps both strings the same for every visitor
export function formatBuildTime(value: string | undefined, timeZone = "UTC") {
  const p = buildParts(value, timeZone)
  if (!p) return "unknown"
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${p.offset}`
}

export function buildVersion(value: string | undefined, timeZone = "UTC") {
  const p = buildParts(value, timeZone)
  if (!p) return "unknown"
  return `${p.year}.${p.month}.${p.day}.${p.hour}${p.minute}`
}

export function printInfo(key: string, value: unknown, color = DEFAULT_COLOR) {
  const expandable =
    typeof value === "function" || (typeof value === "object" && value !== null)
  // objects go in as their own argument so the console keeps them expandable
  if (expandable) return console.log(`%c${key}`, KEY, value)
  console.log(
    `%c${key}%c${String(value)}`,
    KEY_JOINED,
    `background:${color};color:#20232a;font-weight:bold;padding:1px 5px;border-radius:0 3px 3px 0`,
  )
}

export type AppInfoProps = {
  info: Record<string, unknown>
  enabled?: boolean
  color?: string
}

export function AppInfo({ info, enabled = true, color }: AppInfoProps) {
  useEffect(() => {
    if (!enabled) return
    for (const [key, value] of Object.entries(info)) {
      // strict mode and route remounts would print it again
      if (seen.has(key)) continue
      seen.add(key)
      printInfo(key, value, color)
    }
  }, [info, enabled, color])

  return null
}

export default AppInfo
