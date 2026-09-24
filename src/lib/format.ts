import {
  format,
  formatDistanceStrict,
  fromUnixTime,
  isValid,
  parseISO,
  subMonths,
} from "date-fns"
import { enUS, zhCN } from "date-fns/locale"
import type { Locale } from "@/local"
export function bytes(size: number) {
  if (size < 1024) return `${size} B`
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 4)
  return `${(size / 1024 ** index).toFixed(1)} ${["B", "KiB", "MiB", "GiB", "TiB"][index]}`
}
export function dateTime(value: string | Date) {
  const parsed = typeof value === "string" ? parseISO(value) : value
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd HH:mm:ss") : "—"
}
export const date = (seconds: number) => dateTime(fromUnixTime(seconds))

export function relativeTime(value: string | Date, now: Date, locale: Locale) {
  const parsed = typeof value === "string" ? parseISO(value) : value
  if (!isValid(parsed)) return "—"
  if (Math.abs(now.getTime() - parsed.getTime()) < 60_000) {
    return locale === "zh-CN" ? "刚刚" : "just now"
  }
  if (parsed <= subMonths(now, 1) || parsed > now) {
    return format(parsed, "yyyy-MM-dd HH:mm")
  }
  return formatDistanceStrict(parsed, now, {
    addSuffix: true,
    roundingMethod: "floor",
    locale: locale === "zh-CN" ? zhCN : enUS,
  })
}
