"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { startOfMonth } from "date-fns";
import { FilterTrigger } from "@/components/ui/filter-trigger";
import { addDaysStr, mondayOf } from "@/modules/scheduling/lib/math";

function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toDay(d: Date): string {
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/**
 * Elegant week label for a Monday (YYYY-MM-DD):
 * "5 – 11 Oct 2026" · "28 Sep – 4 Oct 2026" · "29 Dec 2025 – 4 Jan 2026".
 */
export function formatWeekLabel(monday: string): string {
  const start = parseDay(monday);
  if (!start) return monday;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const day = (d: Date) => d.getDate();
  const mon = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });
  if (start.getMonth() === end.getMonth()) {
    return `${day(start)} – ${day(end)} ${mon(end)} ${end.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${day(start)} ${mon(start)} – ${day(end)} ${mon(end)} ${end.getFullYear()}`;
  }
  return `${day(start)} ${mon(start)} ${start.getFullYear()} – ${day(end)} ${mon(end)} ${end.getFullYear()}`;
}

export function WeekPicker({
  week,
  onChange,
  className,
}: {
  /** Monday of the selected week (YYYY-MM-DD). */
  week: string;
  onChange: (monday: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mondayDate = parseDay(week) ?? new Date();
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(mondayDate));
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open) {
      const d = parseDay(week) ?? new Date();
      setViewMonth(startOfMonth(d));
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    }
  }, [open, week]);

  // follow trigger on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    function upd() {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    }
    window.addEventListener("scroll", upd, true);
    window.addEventListener("resize", upd);
    return () => {
      window.removeEventListener("scroll", upd, true);
      window.removeEventListener("resize", upd);
    };
  }, [open]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysStr(week, i)).map((iso) => parseDay(iso) as Date),
    [week],
  );

  const panel =
    open && rect
      ? createPortal(
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 70 }} onClick={() => setOpen(false)} />
            <div
              className="nexus-dp"
              style={{
                position: "fixed",
                zIndex: 71,
                top: Math.min(rect.bottom + 6, typeof window !== "undefined" ? window.innerHeight - 360 : rect.bottom + 6),
                left: Math.max(8, Math.min(rect.left, typeof window !== "undefined" ? window.innerWidth - 340 - 8 : rect.left)),
                borderRadius: "var(--r-lg)",
                border: "1px solid var(--line)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-2)",
                padding: "var(--s-3)",
                width: 320,
              }}
            >
              <DayPicker
                mode="single"
                weekStartsOn={1}
                showOutsideDays
                today={new Date()}
                month={viewMonth}
                onMonthChange={setViewMonth}
                selected={mondayDate}
                modifiers={{ inWeek: weekDays, inWeek_first: weekDays[0], inWeek_last: weekDays[6] }}
                modifiersClassNames={{ inWeek: "rdp-in-week", inWeek_first: "rdp-in-week_first", inWeek_last: "rdp-in-week_last" }}
                onSelect={(d) => {
                  if (d) onChange(mondayOf(toDay(d)));
                  setOpen(false);
                }}
              />
              <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: 11, color: "var(--fg-4)" }}>
                Pick any day — its Monday–Sunday week opens.
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <FilterTrigger
        ref={triggerRef}
        label={formatWeekLabel(week)}
        filled
        minWidth={190}
        onClick={() => setOpen((v) => !v)}
        className={className}
        aria-label="Choose week"
      />
      {panel}
    </>
  );
}
