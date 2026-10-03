import * as React from "react";
import { CalendarDaysIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Visible label (already formatted date / range / month). */
  label: string;
  /** True when a value is set — full-contrast text, otherwise muted. */
  filled?: boolean;
  /** Minimum trigger width in px (default 150, matches DateRangePicker). */
  minWidth?: number;
  /** When provided, an X replaces the chevron to clear the value. */
  onClear?: () => void;
  clearLabel?: string;
}

/**
 * Canonical trigger for every date/shop filter (single date, date range,
 * month). One look everywhere: h-8, `var(--line)` border, `var(--r-sm)`
 * radius, `var(--bg)` background, calendar icon + label + chevron.
 */
export const FilterTrigger = React.forwardRef<HTMLButtonElement, FilterTriggerProps>(function FilterTrigger(
  {
    label,
    filled = true,
    minWidth = 150,
    onClear,
    clearLabel = "Clear",
    className,
    disabled,
    style,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-[7px] rounded-[var(--r-sm)] border border-[var(--line)]",
        "bg-[var(--bg)] px-[var(--s-3)] text-left text-[13px] text-[var(--fg)]",
        "transition-colors hover:bg-[var(--row-hover)]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        disabled && "cursor-not-allowed opacity-50",
        !filled && "text-[var(--fg-4)]",
        className,
      )}
      style={{ minWidth, ...style }}
      {...rest}
    >
      <CalendarDaysIcon size={13} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
      {onClear ? (
        <span
          role="button"
          tabIndex={-1}
          aria-label={clearLabel}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          style={{ color: "var(--fg-4)", display: "flex", padding: 2, borderRadius: 4 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-3)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-4)")}
        >
          <XIcon style={{ width: 12, height: 12 }} />
        </span>
      ) : (
        <ChevronDownIcon size={13} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
      )}
    </button>
  );
});
