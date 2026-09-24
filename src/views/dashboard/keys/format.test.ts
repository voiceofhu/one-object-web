import { getUnixTime, subMonths } from "date-fns"
import { expect, it } from "vitest"
import { formatKeyTime, maskToken } from "./format"

const now = new Date(2026, 8, 8, 12)

it("shows relative creation times in the selected language", () => {
  const timestamp = getUnixTime(new Date(2026, 8, 8, 10))
  expect(formatKeyTime(timestamp, now, "zh-CN")).toBe("2 小时前")
  expect(formatKeyTime(timestamp, now, "en-US")).toBe("2 hours ago")
})

it("switches to full dates at one calendar month, including month ends", () => {
  expect(formatKeyTime(getUnixTime(subMonths(now, 1)), now, "zh-CN")).toBe(
    "2026-08-08 12:00",
  )
  expect(
    formatKeyTime(getUnixTime(subMonths(now, 1)) + 1, now, "en-US"),
  ).toContain("ago")
  const march = new Date(2026, 2, 31, 12)
  expect(
    formatKeyTime(getUnixTime(new Date(2026, 1, 28, 12)), march, "zh-CN"),
  ).toBe("2026-02-28 12:00")
})

it("shows full dates for future timestamps", () => {
  expect(
    formatKeyTime(getUnixTime(new Date(2026, 8, 9, 12)), now, "zh-CN"),
  ).toBe("2026-09-09 12:00")
})

it("masks tokens without exposing short values", () => {
  expect(maskToken("ook_1234567890abcdefghijklmnop")).toBe(
    "ook_1234••••••••mnop",
  )
  expect(maskToken("ook_short")).toBe("••••••••")
  expect(maskToken("")).toBe("••••••••")
})
