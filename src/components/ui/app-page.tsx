import * as React from "react"
import { cn } from "@/lib/utils"

export function AppPage({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />
}

export function Section({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col", className)} {...props} />
}

export function SectionHeader({
  title,
  actions,
  description,
  className,
  ...props
}: React.ComponentProps<"div"> & { title: string; actions?: React.ReactNode; description?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 pb-2 border-b border-[var(--line)] mb-3", className)} {...props}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--fg)]">{title}</h2>
        {description && <p className="text-[12px] text-[var(--fg-3)] leading-none">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function DataPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-md)]",
        className
      )}
      {...props}
    />
  )
}

export function DataPanelHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center justify-between gap-3 px-4 h-9 border-b border-[var(--line)] bg-[var(--surface-2)] shrink-0", className)} {...props} />
}

export function MetricRow({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)} {...props} />
}

export function Toolbar({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />
}

export function EmptyState({
  title = "No data",
  description,
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center border border-dashed border-[var(--line)] rounded-[var(--r-md)] bg-[var(--surface)]">
      <p className="text-[13px] font-medium text-[var(--fg-2)]">{title}</p>
      {description && <p className="text-[12px] text-[var(--fg-4)] max-w-[320px]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
