import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-[13px] transition-colors outline-none placeholder:text-[var(--fg-4)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:opacity-50 aria-invalid:border-[var(--bad)] aria-invalid:ring-2 aria-invalid:ring-[var(--bad)]/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
