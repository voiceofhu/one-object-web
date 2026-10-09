import { LogsPanel } from "@/views/dashboard/components/logs-panel"
import { listOperationLogs } from "./api"

export default function OperationLogsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <LogsPanel kind="operation" list={listOperationLogs} />
    </div>
  )
}
