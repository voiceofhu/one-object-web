import { rootRequest } from "@/lib/request"
import type { Log } from "@/views/dashboard/components/logs-panel"

export function listOperationLogs(offset: number) {
  return rootRequest<{ items: Log[]; total: number }>(
    `/api/admin/operation-logs?offset=${offset}`,
  )
}
