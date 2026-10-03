"use client";

import { useEffect, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { addDays, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { PillButton } from "@/components/ui/pill-button";
import { FilterTrigger } from "@/components/ui/filter-trigger";
import { parseDay, toDay } from "./dates";
import type { DateRangeValue } from "./types";

export type { DateRangeValue };

function rangeFromValue(value: DateRangeValue): DateRange | undefined {
  const from = parseDay(value.from);
  const to = parseDay(value.to);
  if (!from || !to) return undefined;
  return { from, to };
}

function rangeLabel(from: Date, to: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtYear = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const thisYear = new Date().getFullYear();
  if (from.getTime() === to.getTime()) return from.getFullYear() === thisYear ? fmt(from) : fmtYear(from);
  if (from.getFullYear() === to.getFullYear()) {
    return from.getFullYear() === thisYear ? `${fmt(from)} – ${fmt(to)}` : `${fmtYear(from)} – ${fmtYear(to)}`;
  }
  return `${fmtYear(from)} – ${fmtYear(to)}`;
}

// ── Presets ───────────────────────────────────────────────────────────────────

interface Preset {
  key: string;
  label: string;
  range: (base: Date) => DateRangeValue;
}

const PRESETS: Preset[] = [
  { key: "today", label: "Today", range: (b) => ({ from: toDay(b), to: toDay(b) }) },
  { key: "yesterday", label: "Yesterday", range: (b) => { const d = addDays(b, -1); return { from: toDay(d), to: toDay(d) }; } },
  { key: "mtd", label: "MTD", range: (b) => ({ from: toDay(startOfMonth(b)), to: toDay(b) }) },
  { key: "7d", label: "Last 7 days", range: (b) => ({ from: toDay(addDays(b, -6)), to: toDay(b) }) },
  { key: "last-month", label: "Last month", range: (b) => { const m = subMonths(b, 1); return { from: toDay(startOfMonth(m)), to: toDay(endOfMonth(m)) }; } },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  zIndex: 50,
  width: "max-content",
  maxWidth: "min(92vw, 640px)",
  overflowX: "auto",
  borderRadius: "var(--r-lg)",
  border: "1px solid var(--line)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-2)",
  padding: "var(--s-4)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

// ── Component ────────────────────────────────────────────────────────────────

export function DateRangePicker({
  value,
  onChange,
  today,
  align = "start",
}: {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  today?: string;
  align?: "start" | "end";
}) {
  const base = today ? (parseDay(today) ?? new Date()) : new Date();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DateRange | undefined>(() => rangeFromValue(value));
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(rangeFromValue(value)?.from ?? base));

  // Keep the local selection in sync with props while the popover is closed.
  useEffect(() => {
    if (!open) setSelected(rangeFromValue(value));
  }, [open, value]);

  function handleSelect(range: DateRange | undefined) {
    setSelected(range);
    if (range?.from && range.to) {
      onChange({ from: toDay(range.from), to: toDay(range.to) });
    }
  }

  function applyPreset(preset: Preset) {
    onChange(preset.range(base));
    close();
  }

  function close() {
    setOpen(false);
    setSelected(rangeFromValue(value));
  }

  const committedFrom = parseDay(value.from);
  const committedTo = parseDay(value.to);
  const label = committedFrom && committedTo ? rangeLabel(committedFrom, committedTo) : "Select dates";

  const activePresetKey = committedFrom && committedTo
    ? (PRESETS.find((p) => {
        const r = p.range(base);
        return r.from === value.from && r.to === value.to;
      })?.key ?? null)
    : null;

  return (
    <div style={{ position: "relative" }}>
      <FilterTrigger
        label={label}
        onClick={() => {
          setViewMonth(startOfMonth(rangeFromValue(value)?.from ?? base));
          setOpen((v) => !v);
        }}
      />

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={close} />
          <div
            style={{
              ...panelStyle,
              left: align === "start" ? 0 : "auto",
              right: align === "end" ? 0 : "auto",
            }}
          >
            {/* Presets */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESETS.map((preset) => (
                <PillButton
                  key={preset.key}
                  active={activePresetKey === preset.key}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </PillButton>
              ))}
            </div>

            {/* Calendar */}
            <div className="nexus-dp">
              <DayPicker
                mode="range"
                required
                numberOfMonths={2}
                weekStartsOn={1}
                showOutsideDays
                today={base}
                month={viewMonth}
                onMonthChange={setViewMonth}
                selected={selected}
                onSelect={handleSelect}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
