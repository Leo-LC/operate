import * as React from "react"
import { cn } from "@/lib/utils"

interface StatProps extends React.ComponentProps<"div"> {
  label: string
  value: React.ReactNode
  delta?: string
  deltaDir?: "up" | "down" | "neutral"
  hint?: string
  sparkline?: React.ReactNode
  icon?: React.ReactNode
  iconColor?: string
}

export function Stat({
  label,
  value,
  delta,
  deltaDir = "neutral",
  hint,
  sparkline,
  icon,
  iconColor = "var(--accent)",
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
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <div className="flex items-center gap-1.5">
        {icon && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "var(--r-sm)",
              background: `color-mix(in srgb, ${iconColor} 14%, transparent)`,
              color: iconColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            fontWeight: 500,
            color: "var(--fg-4)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {label}
        </span>
      </div>
      <span
        className="mono tabular-nums"
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "var(--fg)",
          lineHeight: 1.1,
          letterSpacing: "-0.015em",
        }}
      >
        {value}
      </span>
      {delta && (
        <span
          className="mono tabular-nums"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: deltaColor,
            lineHeight: 1,
          }}
        >
          {delta}
        </span>
      )}
      {sparkline && <div className="mt-1">{sparkline}</div>}
      {hint && <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{hint}</span>}
    </div>
  )
}
