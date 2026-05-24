import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.ComponentProps<"div"> {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  eyebrow?: string
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 pb-6",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        {eyebrow && (
          <span className="eyebrow mb-1">{eyebrow}</span>
        )}
        <h1
          style={{
            fontSize: "var(--t-28)",
            fontWeight: 500,
            color: "var(--fg)",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: "var(--t-13)",
              color: "var(--fg-3)",
              marginTop: 2,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {actions}
        </div>
      )}
    </div>
  )
}
