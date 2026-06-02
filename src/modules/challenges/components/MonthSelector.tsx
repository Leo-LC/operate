"use client";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface MonthSelectorProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
}

function formatLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function addMonths(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const minMonth = addMonths(currentMonth, -11);
  const isAtMin = value <= minMonth;
  const isAtMax = value >= currentMonth;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(addMonths(value, -1))}
        disabled={isAtMin}
        className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-3)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--fg)] disabled:pointer-events-none disabled:opacity-30"
        aria-label="Previous month"
      >
        <ChevronLeftIcon size={14} />
      </button>
      <span className="min-w-[130px] text-center text-sm font-medium tabular-nums text-[var(--fg)]">
        {formatLabel(value)}
      </span>
      <button
        onClick={() => onChange(addMonths(value, 1))}
        disabled={isAtMax}
        className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-3)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--fg)] disabled:pointer-events-none disabled:opacity-30"
        aria-label="Next month"
      >
        <ChevronRightIcon size={14} />
      </button>
    </div>
  );
}
