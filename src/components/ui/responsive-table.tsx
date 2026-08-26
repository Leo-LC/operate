import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveTableProps extends React.ComponentProps<"div"> {
  minWidth?: number | string
}

/**
 * ResponsiveTable — wraps a wide <table> with horizontal scroll on mobile.
 * Use alongside `hidden md:block` table + `md:hidden` card fallback for heavy modules.
 */
export function ResponsiveTable({
  className,
  minWidth = 560,
  style,
  children,
  ...props
}: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto -mx-3 md:mx-0 rounded-[var(--r-lg)] border border-[var(--line)]",
        "[&>table]:w-full [&>table]:min-w-[var(--rt-min)]",
        className
      )}
      style={
        {
          "--rt-min": typeof minWidth === "number" ? `${minWidth}px` : minWidth,
          WebkitOverflowScrolling: "touch",
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  )
}
