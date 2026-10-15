import { afterEach, expect, it, vi } from "vitest"

import { startLogin } from "./redirect"

afterEach(() => vi.unstubAllGlobals())

function loginUrl(search: string) {
  const replace = vi.fn()
  vi.stubGlobal("sessionStorage", { setItem: vi.fn() })
  vi.stubGlobal("window", { location: { search, replace } })
  startLogin("/dashboard/files")
  return new URL(replace.mock.calls[0][0], "https://app.example")
}

it("reuses the One User session for normal login", () => {
  expect(loginUrl("").searchParams.has("prompt")).toBe(false)
})

it("preserves explicit account selection", () => {
  expect(loginUrl("?prompt=select_account").searchParams.get("prompt")).toBe(
    "select_account",
  )
})

it("does not forward other prompt values", () => {
  expect(loginUrl("?prompt=login").searchParams.has("prompt")).toBe(false)
})
