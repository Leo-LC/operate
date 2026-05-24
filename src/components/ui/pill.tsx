import * as React from "react"
import { cn } from "@/lib/utils"

type PillTone = "neutral" | "bronze" | "good" | "warn" | "bad" | "info" | "outline"
type PillSize = "sm" | "md"

const TONE_STYLES: Record<PillTone, string> = {
  neutral: "bg-[var(--bg-2)] text-[var(--fg-3)] border-[var(--line)]",
  bronze:  "bg-[var(--bronze-soft)] text-[var(--bronze-2)] border-transparent",
  good:    "bg-[var(--good-soft)] text-[var(--good)] border-transparent",
  warn:    "bg-[var(--warn-soft)] text-[var(--warn)] border-transparent",
  bad:     "bg-[var(--bad-soft)] text-[var(--bad)] border-transparent",
  info:    "bg-[var(--info-soft)] text-[var(--info)] border-transparent",
  outline: "bg-transparent text-[var(--fg-3)] border-[var(--line-strong)]",
}

const DOT_COLORS: Record<PillTone, string> = {
  neutral: "bg-[var(--fg-4)]",
  bronze:  "bg-[var(--bronze)]",
  good:    "bg-[var(--good)]",
  warn:    "bg-[var(--warn)]",
  bad:     "bg-[var(--bad)]",
  info:    "bg-[var(--info)]",
  outline: "bg-[var(--fg-4)]",
}

interface PillProps extends React.ComponentProps<"span"> {
  tone?: PillTone
  size?: PillSize
  dot?: boolean
}

export function Pill({
  tone = "neutral",
  size = "md",
  dot = false,
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border font-medium whitespace-nowrap",
        "rounded-[var(--r-pill)]",
        size === "sm"
          ? "h-[18px] px-[6px] text-[11px]"
          : "h-[22px] px-[8px] text-[12px]",
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "rounded-full shrink-0",
            size === "sm" ? "size-1" : "size-1.5",
            DOT_COLORS[tone],
          )}
        />
      )}
      {children}
    </span>
  )
}
