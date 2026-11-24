"use client"

import type { ComponentProps, ReactNode } from "react"

import { PasswordInput, passwordStrength } from "@/components/ui/password-input"
import { cn } from "@/lib/utils"

type AppPasswordInputProps = ComponentProps<typeof PasswordInput> & {
  /** Leading icon, like an input-group addon on the fields next to it. */
  icon?: ReactNode
  /** `plain` drops the field's own fill and border, for rows that draw their own. */
  variant?: "default" | "plain"
}

/**
 * One UI PasswordInput styled like this project's shadcn Input
 * (`.app-password-input` in the global CSS). The strength meter sits out of
 * flow under the field, so space is reserved while it shows.
 */
export function AppPasswordInput({
  className,
  icon,
  strength = true,
  value,
  variant = "default",
  ...props
}: AppPasswordInputProps) {
  const meterShown = strength && passwordStrength(value ?? "") > 0

  return (
    <div
      className={cn(
        "app-password-input relative w-full",
        meterShown && "mb-10",
        className,
      )}
      data-icon={Boolean(icon)}
      data-variant={variant}
    >
      {icon ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-2.5 z-10 flex h-(--app-password-height) items-center text-muted-foreground [&>svg]:size-4"
        >
          {icon}
        </span>
      ) : null}
      <PasswordInput
        {...props}
        className="max-w-none"
        strength={strength}
        value={value}
      />
    </div>
  )
}
