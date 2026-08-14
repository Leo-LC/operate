"use client";

import { useEffect, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { addDays, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { CalendarDaysIcon, ChevronDownIcon } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";

export interface DateRangeValue {
  from: string;
  to: string;
}

// ── Date helpers (local midnight, avoids timezone drift) ──────────────────────

function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
  { key: "this-month", label: "This month", range: (b) => ({ from: toDay(startOfMonth(b)), to: toDay(endOfMonth(b)) }) },
  { key: "last-month", label: "Last month", range: (b) => { const m = subMonths(b, 1); return { from: toDay(startOfMonth(m)), to: toDay(endOfMonth(m)) }; } },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const triggerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 32,
  minWidth: 150,
  padding: "0 var(--s-3)",
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  fontSize: 13,
  color: "var(--fg)",
  cursor: "pointer",
  transition: "background var(--dur) var(--ease)",
};

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
      <button
        type="button"
        onClick={() => {
          setViewMonth(startOfMonth(rangeFromValue(value)?.from ?? base));
          setOpen((v) => !v);
        }}
        style={triggerStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
      >
        <CalendarDaysIcon size={13} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>{label}</span>
        <ChevronDownIcon size={13} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
      </button>

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