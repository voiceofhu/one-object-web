import { rootRequest } from "@/lib/request"

export type Log = {
  id: string
  owner_sub: string | null
  app_id?: string | null
  status: number
  success?: boolean
  method?: string
  route?: string
  duration_ms?: number
  peer_ip: string | null
  created_at: string
}

export function listLogs(kind: "login" | "operation", offset: number) {
  return rootRequest<{ items: Log[]; total: number }>(
    `/api/admin/${kind}-logs?offset=${offset}`,
  )
}
