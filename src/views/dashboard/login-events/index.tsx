import { LogsPanel } from "@/views/dashboard/components/logs-panel"
import { listLoginLogs } from "./api"

export default function LoginEventsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <LogsPanel kind="login" list={listLoginLogs} />
    </div>
  )
}
