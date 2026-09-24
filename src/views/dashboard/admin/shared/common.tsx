import { useObjectTranslation } from "@/local/object"
import { useEffect, useId } from "react"
import { LoadingState } from "@/components/loading-state"
import { HttpError } from "@/lib/request"
import { toast } from "@/lib/toast"
export function AdminErrorAlert({ error }: { error: unknown }) {
  const tx = useObjectTranslation()
  const id = useId()

  const details =
    error instanceof HttpError
      ? (error.details as { message?: string } | null)
      : null
  useEffect(() => {
    if (!error) return
    toast.error(tx("操作未完成"), {
      id,
      description: `${
        details?.message ||
        (error instanceof Error ? tx(error.message) : tx("请求失败，请重试"))
      }${error instanceof HttpError ? ` (HTTP ${error.status})` : ""}`,
    })
  }, [details?.message, error, id, tx])

  return null
}
export function AdminLoading() {
  const tx = useObjectTranslation()

  return <LoadingState>{tx("加载中")}</LoadingState>
}
