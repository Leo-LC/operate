"use client";

import { cn } from "@/lib/utils";

interface AllNoneToggleProps {
  allSelected: boolean;
  noneSelected: boolean;
  disabled?: boolean;
  onSelectAll: () => void;
  onSelectNone: () => void;
  className?: string;
}

export function AllNoneToggle({
  allSelected,
  noneSelected,
  disabled,
  onSelectAll,
  onSelectNone,
  className,
}: AllNoneToggleProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span>Select:</span>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelectAll}
        className={cn(
          "rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] transition-colors",
          allSelected
            ? "border-primary/70 bg-primary/10 text-foreground"
            : "hover:bg-muted/60"
        )}
      >
        All
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelectNone}
        className={cn(
          "rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] transition-colors",
          noneSelected
            ? "border-primary/70 bg-primary/10 text-foreground"
            : "hover:bg-muted/60"
        )}
      >
        None
      </button>
    </div>
  );
}

