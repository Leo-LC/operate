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
        "h-8 rounded-md border border-input bg-background px-2 text-xs",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "[color-scheme:light] dark:[color-scheme:dark]",
        // Force calendar icon to be dark in light mode, light in dark mode
        "[&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:opacity-40",
        "dark:[&::-webkit-calendar-picker-indicator]:brightness-100 dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:opacity-60",
        className
      )}
      {...props}
    />
  )
}
