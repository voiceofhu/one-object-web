import { useObjectTranslation } from "@/local/object"
import { useEffect, useRef, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "@/lib/toast"

import { Button } from "@/components/ui/button"

type CopyButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "onClick"
> & {
  value: string
  successMessage?: string
  errorMessage?: string
  resetDelay?: number
}

function CopyButton({
  value,
  successMessage = "已复制",
  errorMessage = "复制失败",
  resetDelay = 2000,
  ...props
}: CopyButtonProps) {
  const tx = useObjectTranslation()

  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(tx(successMessage))
      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setCopied(false), resetDelay)
    } catch {
      toast.error(tx(errorMessage))
    }
  }

  return (
    <Button
      {...props}
      onClick={() => void copy()}
      type={props.type ?? "button"}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}

export { CopyButton }
