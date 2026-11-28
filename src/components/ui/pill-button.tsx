import * as React from "react"
import { cn } from "@/lib/utils"

interface PillButtonProps extends React.ComponentProps<"button"> {
  active?: boolean
}

/**
 * Filter chip — the rectangular counterpart of a status badge (Pill).
 * Selected state is a quiet accent-soft surface with an accent border,
 * never a heavy solid accent fill.
 */
export function PillButton({ active = false, type = "button", className, ...props }: PillButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap",
        "rounded-[var(--ui-radius-sm)] px-2.5 text-[12.5px] transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        active
          ? "border border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] font-semibold text-[var(--ui-accent-text)]"
          : "border border-[var(--ui-line-strong)] bg-[var(--ui-panel)] text-[var(--ui-fg-2)] hover:border-[var(--ui-control-line)] hover:text-[var(--ui-fg-1)]",
        className,
      )}
      {...props}
    />
  )
}
