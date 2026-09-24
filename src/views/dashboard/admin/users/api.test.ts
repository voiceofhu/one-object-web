import { beforeEach, describe, expect, it, vi } from "vitest"
import { rootRequest } from "@/lib/request"
import { updateUser } from "./api"

vi.mock("@/lib/request", () => ({ rootRequest: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

describe("updateUser", () => {
  it.each(["active", "disabled"] as const)(
    "updates user status to %s while preserving the name",
    async (status) => {
      await updateUser({ user_id: "102", display_name: "Alice" }, status)
      expect(rootRequest).toHaveBeenCalledWith("/api/admin/users/102", {
        method: "PUT",
        body: JSON.stringify({ display_name: "Alice", status }),
      })
    },
  )
})
