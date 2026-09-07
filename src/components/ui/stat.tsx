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
    <div className={cn("flex flex-col flex-1", className)} {...props} style={{ minHeight: 72, ...props.style }}>
      <div className="flex items-center gap-1.5">
        {icon && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 14,
              height: 14,
              color: "var(--fg-4)",
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
            lineHeight: 1,
          }}
        >
          {label}
        </span>
      </div>
      <span
        className="mono tabular-nums"
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--fg)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          marginTop: 8,
        }}
      >
        {value}
      </span>
      {delta ? (
        <span
          className="mono tabular-nums"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: deltaColor,
            lineHeight: 1,
            marginTop: 4,
          }}
        >
          {delta}
        </span>
      ) : (
        <span style={{ marginTop: 4, height: 11 }} aria-hidden />
      )}
      {sparkline && <div style={{ marginTop: 6 }}>{sparkline}</div>}
      {hint && <span style={{ fontSize: 11, color: "var(--fg-4)", lineHeight: 1.3, marginTop: "auto", paddingTop: 8 }}>{hint}</span>}
    </div>
  )
}
