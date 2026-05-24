import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
}

export function Empty({ icon, title, body, action, className, ...props }: EmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="text-[var(--fg-4)] mb-1">{icon}</div>
      )}
      <div>
        <p className="text-[14px] font-medium text-[var(--fg-2)]">{title}</p>
        {body && (
          <p className="mt-1 text-[13px] text-[var(--fg-4)] max-w-[320px]">{body}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
