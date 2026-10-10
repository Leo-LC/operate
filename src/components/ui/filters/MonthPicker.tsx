"use client";

import { useState } from "react";
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
  jump = false,
  chrome = "full",
}: {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
  /** Defaults: current month - 11 … current month (challenges convention). */
  minMonth?: string;
  maxMonth?: string;
  className?: string;
  /** When true, clicking the month label opens a month/year jump grid. */
  jump?: boolean;
  /**
   * "full" (default): icon + chevrons + label, self-contained.
   * "label": prominent clickable label only (with jump grid) — pair it with
   * external prev/next buttons.
   */
  chrome?: "full" | "label";
}) {
  const current = currentMonth();
  const min = minMonth ?? addMonthsStr(current, -11);
  const max = maxMonth ?? current;
  const isAtMin = value <= min;
  const isAtMax = value >= max;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(Number(value.slice(0, 4)));
  const labelMode = chrome === "label";

  const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function pick(m: number) {
    const next = `${pickerYear}-${String(m + 1).padStart(2, "0")}`;
    if (next < min || next > max) return;
    setPickerOpen(false);
    onChange(next);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--r-sm)] border border-[var(--line)]",
        "bg-[var(--bg)] text-[13px] text-[var(--fg)]",
        labelMode ? "h-10 px-2" : "h-8 py-0 pl-[var(--s-3)] pr-1",
        "relative",
        className,
      )}
    >
      {!labelMode && <CalendarDaysIcon size={13} style={{ color: "var(--fg-3)", flexShrink: 0 }} />}
      {!labelMode && (
        <button
          type="button"
          onClick={() => onChange(addMonthsStr(value, -1))}
          disabled={isAtMin}
          className={chevronClass}
          aria-label="Previous month"
        >
          <ChevronLeftIcon size={14} />
        </button>
      )}
      {(jump || labelMode) ? (
        <button
          type="button"
          onClick={() => {
            setPickerYear(Number(value.slice(0, 4)));
            setPickerOpen((v) => !v);
          }}
          className={
            labelMode
              ? "min-w-[170px] rounded-[var(--r-sm)] px-2 text-center text-[15px] font-semibold tabular-nums hover:bg-[var(--row-hover)]"
              : "min-w-[110px] rounded-[var(--r-sm)] px-1 text-center font-medium tabular-nums hover:bg-[var(--row-hover)]"
          }
          aria-label="Jump to month"
          title="Jump to month"
        >
          {formatMonthLabel(value)}
        </button>
      ) : (
        <span className="min-w-[110px] text-center font-medium tabular-nums">
          {formatMonthLabel(value)}
        </span>
      )}
      {!labelMode && (
        <button
          type="button"
          onClick={() => onChange(addMonthsStr(value, 1))}
          disabled={isAtMax}
          className={chevronClass}
          aria-label="Next month"
        >
          <ChevronRightIcon size={14} />
        </button>
      )}

      {(jump || labelMode) && pickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} aria-hidden />
          <div
            className="absolute left-0 top-9 z-50 w-60 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-3"
            style={{ boxShadow: "var(--shadow-2)" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setPickerYear((y) => y - 1)} className={chevronClass} aria-label="Previous year">
                <ChevronLeftIcon size={14} />
              </button>
              <span className="text-[13px] font-semibold tabular-nums">{pickerYear}</span>
              <button type="button" onClick={() => setPickerYear((y) => y + 1)} className={chevronClass} aria-label="Next year">
                <ChevronRightIcon size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {SHORT_MONTHS.map((label, m) => {
                const candidate = `${pickerYear}-${String(m + 1).padStart(2, "0")}`;
                const disabled = candidate < min || candidate > max;
                const active = candidate === value;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(m)}
                    className={cn(
                      "h-8 rounded-[var(--r-sm)] text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-30",
                      active
                        ? "bg-[var(--accent)] font-semibold text-white"
                        : "text-[var(--fg-3)] hover:bg-[var(--row-hover)] hover:text-[var(--fg)]",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
