"use client";

import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { addMonthsStr, currentMonth, formatMonthLabel } from "./dates";

const chevronClass =
  "flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-3)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--fg)] disabled:pointer-events-none disabled:opacity-30";

export function MonthPicker({
  value,
  onChange,
  minMonth,
  maxMonth,
  className,
}: {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
  /** Defaults: current month - 11 … current month (challenges convention). */
  minMonth?: string;
  maxMonth?: string;
  className?: string;
}) {
  const current = currentMonth();
  const min = minMonth ?? addMonthsStr(current, -11);
  const max = maxMonth ?? current;
  const isAtMin = value <= min;
  const isAtMax = value >= max;

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-[var(--r-sm)] border border-[var(--line)]",
        "bg-[var(--bg)] py-0 pl-[var(--s-3)] pr-1 text-[13px] text-[var(--fg)]",
        className,
      )}
    >
      <CalendarDaysIcon size={13} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
      <button
        type="button"
        onClick={() => onChange(addMonthsStr(value, -1))}
        disabled={isAtMin}
        className={chevronClass}
        aria-label="Previous month"
      >
        <ChevronLeftIcon size={14} />
      </button>
      <span className="min-w-[110px] text-center font-medium tabular-nums">
        {formatMonthLabel(value)}
      </span>
      <button
        type="button"
        onClick={() => onChange(addMonthsStr(value, 1))}
        disabled={isAtMax}
        className={chevronClass}
        aria-label="Next month"
      >
        <ChevronRightIcon size={14} />
      </button>
    </div>
  );
}
