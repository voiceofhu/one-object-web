import { fromUnixTime } from "date-fns"
import { relativeTime } from "@/lib/format"
import type { Locale } from "@/local"

export function formatKeyTime(timestamp: number, now: Date, locale: Locale) {
  return relativeTime(fromUnixTime(timestamp), now, locale)
}

export function maskToken(token: string) {
  return token.length > 12
    ? `${token.slice(0, 8)}••••••••${token.slice(-4)}`
    : "••••••••"
}
