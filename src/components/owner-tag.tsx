import { useQuery } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import { useObjectTranslation } from "@/local/object"
import { authPermissionsQuery } from "@/views/dashboard/account/permissions-api"

// Super admins see every user's data; label whose row it is.
export function OwnerTag({
  name,
  className,
}: {
  name?: string | null
  className?: string
}) {
  const tx = useObjectTranslation()
  const access = useQuery(authPermissionsQuery)
  if (!name || access.data?.super_admin !== true) return null
  return (
    <span
      className={cn("truncate text-xs text-muted-foreground", className)}
      title={`${tx("所属用户")} · ${name}`}
    >
      {tx("所属用户")} · {name}
    </span>
  )
}
