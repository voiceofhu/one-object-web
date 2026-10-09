import { rootRequest } from "@/lib/request"
import type { Log } from "@/views/dashboard/components/logs-panel"

export function listLoginLogs(offset: number) {
  return rootRequest<{ items: Log[]; total: number }>(
    `/api/admin/login-logs?offset=${offset}`,
  )
}
