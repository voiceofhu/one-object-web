import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 overflow-hidden rounded-[24%] bg-white",
        className,
      )}
    >
      <img
        src={`${import.meta.env.BASE_URL}one-object-logo.svg`}
        alt=""
        width={48}
        height={48}
        className="size-full object-contain"
      />
    </span>
  )
}
