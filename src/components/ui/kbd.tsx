import * as React from "react"
import { cn } from "@/lib/utils"

export function Kbd({ className, children, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center",
        "font-mono text-[11px] text-[var(--fg-3)]",
        "bg-[var(--bg-2)] border border-[var(--line)]",
        "rounded-[var(--r-sm)] px-[5px] py-[2px]",
        "leading-none select-none",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
