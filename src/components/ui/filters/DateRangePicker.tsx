"use client";

import { useEffect, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { addDays, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
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

function rangeLabel(from: Date, to: Date, language: "en" | "fr"): string {
  const locale = language === "fr" ? "fr-FR" : "en-US";
  const fmt = (d: Date) => d.toLocaleDateString(locale, { month: "short", day: "numeric" });
  const fmtYear = (d: Date) => d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
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

function presets(language: "en" | "fr"): Preset[] {
  const labels = language === "fr"
    ? { today: "Aujourd’hui", yesterday: "Hier", mtd: "Mois en cours", sevenDays: "7 derniers jours", lastMonth: "Mois dernier" }
    : { today: "Today", yesterday: "Yesterday", mtd: "MTD", sevenDays: "Last 7 days", lastMonth: "Last month" };
  return [
    { key: "today", label: labels.today, range: (b) => ({ from: toDay(b), to: toDay(b) }) },
    { key: "yesterday", label: labels.yesterday, range: (b) => { const d = addDays(b, -1); return { from: toDay(d), to: toDay(d) }; } },
    { key: "7d", label: labels.sevenDays, range: (b) => ({ from: toDay(addDays(b, -6)), to: toDay(b) }) },
    { key: "mtd", label: labels.mtd, range: (b) => ({ from: toDay(startOfMonth(b)), to: toDay(b) }) },
    { key: "last-month", label: labels.lastMonth, range: (b) => { const m = subMonths(b, 1); return { from: toDay(startOfMonth(m)), to: toDay(endOfMonth(m)) }; } },
  ];
}

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
  language = "en",
}: {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  today?: string;
  align?: "start" | "end";
  language?: "en" | "fr";
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
  const availablePresets = presets(language);
  const label = committedFrom && committedTo ? rangeLabel(committedFrom, committedTo, language) : language === "fr" ? "Choisir les dates" : "Select dates";

  const activePresetKey = committedFrom && committedTo
    ? (availablePresets.find((p) => {
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
              {availablePresets.map((preset) => (
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
              {language === "fr" && (
                <p className="mb-1 text-[11px] font-medium text-[var(--fg-3)]">
                  Plage personnalisée{activePresetKey === null ? " · sélectionnée" : ""}
                </p>
              )}
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
                locale={language === "fr" ? fr : undefined}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
