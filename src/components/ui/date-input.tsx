import * as React from "react"
import { cn } from "@/lib/utils"

export function DateInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="date"
      className={cn(
        "h-8 rounded-md border border-input bg-white dark:bg-zinc-800 px-2 text-xs text-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "[color-scheme:light] dark:[color-scheme:dark]",
        className
      )}
      {...props}
    />
  )
}
