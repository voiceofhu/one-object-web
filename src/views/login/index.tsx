import { useEffect, useState } from "react"
import { useObjectTranslation } from "@/local/object"
import { Loading } from "@/components/async-state"
import { Button } from "@/components/ui/button"
import { recentlyRedirected, startLogin } from "./redirect"

export function LoginPage() {
  const tx = useObjectTranslation()
  const from = window.location.pathname + window.location.search
  const [blocked] = useState(recentlyRedirected)

  useEffect(() => {
    if (!blocked) startLogin(from)
  }, [blocked, from])

  if (!blocked) return <Loading />

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <p role="alert" className="text-destructive">
        {tx("登录未能完成，请确认账号已开通此应用后重新登录。")}
      </p>
      <Button onClick={() => startLogin(from)}>{tx("重新登录")}</Button>
    </main>
  )
}
