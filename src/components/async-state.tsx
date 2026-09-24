import { useEffect, useId, useRef, type ReactNode } from "react"
import { useObjectTranslation } from "@/local/object"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { LoadingState } from "@/components/loading-state"
import { ApiError } from "@/lib/http"
import { toast } from "@/lib/toast"
export function Loading() {
  const tx = useObjectTranslation()

  return <LoadingState>{tx("正在加载…")}</LoadingState>
}
export function Failure({
  error,
  retry,
}: {
  error: Error
  retry?: () => void
}) {
  const tx = useObjectTranslation()
  const id = useId()
  const retryRef = useRef(retry)

  useEffect(() => {
    retryRef.current = retry
  }, [retry])

  useEffect(() => {
    toast.error(tx("请求未完成"), {
      id,
      description: `${tx(error.message)}${error instanceof ApiError ? ` (HTTP ${error.status})` : ""}`,
      action:
        error instanceof ApiError && error.status === 401
          ? { label: tx("重新登录"), onClick: () => window.location.assign("/api/auth/oidc/start") }
          : retryRef.current
            ? { label: tx("重试"), onClick: () => retryRef.current?.() }
            : undefined,
    })
  }, [error, id, tx])

  return null
}
export function NoItems({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  )
}
