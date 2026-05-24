import * as React from "react"
import { cn } from "@/lib/utils"

interface StatProps extends React.ComponentProps<"div"> {
  label: string
  value: React.ReactNode
  delta?: string
  deltaDir?: "up" | "down" | "neutral"
  hint?: string
  sparkline?: React.ReactNode
}

export function Stat({
  label,
  value,
  delta,
  deltaDir = "neutral",
  hint,
  sparkline,
  className,
  ...props
}: StatProps) {
  const deltaColor =
    deltaDir === "up"
      ? "var(--good)"
      : deltaDir === "down"
        ? "var(--bad)"
        : "var(--fg-4)"

  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: "var(--fg-4)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {label}
      </span>
      <div className="flex items-end gap-2">
        <span
          className="mono tabular-nums"
          style={{
            fontSize: "var(--t-24)",
            fontWeight: 600,
            color: "var(--fg)",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {delta && (
          <span
            className="mono tabular-nums"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: deltaColor,
              lineHeight: 1,
              paddingBottom: 1,
            }}
          >
            {delta}
          </span>
        )}
        {sparkline && <div className="ml-auto">{sparkline}</div>}
      </div>
      {hint && (
        <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{hint}</span>
      )}
    </div>
  )
}
