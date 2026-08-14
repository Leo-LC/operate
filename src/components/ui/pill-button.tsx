import * as React from "react"
import { cn } from "@/lib/utils"

interface PillButtonProps extends React.ComponentProps<"button"> {
  active?: boolean
}

export function PillButton({ active = false, type = "button", className, ...props }: PillButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap",
        "rounded-[var(--r-sm)] px-3 py-2 text-[12px] transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        active
          ? "border border-[var(--bronze)] bg-[var(--bronze-soft)] text-[var(--bronze)]"
          : "border border-[var(--line)] bg-[var(--bg)] text-[var(--fg-3)] hover:border-[var(--line-strong)] hover:text-[var(--fg-2)]",
        className,
      )}
      {...props}
    />
  )
}