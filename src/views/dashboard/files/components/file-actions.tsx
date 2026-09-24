import { useObjectTranslation } from "@/local/object"
import { useEffect, useRef, useState } from "react"
import {
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function FileActions({
  name,
  href,
  onDelete,
  pending = false,
}: {
  name: string
  href: string
  onDelete?: () => void
  pending?: boolean
}) {
  const tx = useObjectTranslation()

  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelClose = () => clearTimeout(timer.current)
  const closeSoon = () => {
    cancelClose()
    timer.current = setTimeout(() => setOpen(false), 180)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={tx("{0} 更多操作", { 0: name })}
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse") return
            cancelClose()
            setOpen(true)
          }}
          onPointerLeave={closeSoon}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-36"
        onPointerEnter={cancelClose}
        onPointerLeave={closeSoon}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => {
              void navigator.clipboard
                .writeText(new URL(href, window.location.origin).href)
                .then(() => toast.success(tx("地址已复制")))
                .catch(() => toast.error(tx("复制失败，请检查剪贴板权限")))
            }}
          >
            <CopyIcon />
            {tx("复制地址")}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={href}>
              <DownloadIcon />
              {tx("下载")}
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              onSelect={onDelete}
            >
              <Trash2Icon />
              {tx("删除")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
