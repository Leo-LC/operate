"use client";
import { useMemo } from "react";
import { DAILY_ENTRY_SECTIONS, resolveField } from "@/modules/accounting/config";
import type { DailyEntry } from "@/modules/accounting/types";

interface Props {
  year: number;
  month: number;
  entries: DailyEntry[];
  onOpenDay: (day: number) => void;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function weekdayShort(y: number, m: number, d: number) {
  return new Date(y, m - 1, d).toLocaleDateString("en", { weekday: "short" });
}

function fmt(n: number): string {
  if (n === 0) return "—";
  return (n < 0 ? "−" : "") + Math.round(Math.abs(n)).toLocaleString("en");
}

const FIELDS = DAILY_ENTRY_SECTIONS.flatMap((s) => s.fields.filter((f) => f.exportable));

export function EntryLedgerTable({ year, month, entries, onOpenDay }: Props) {
  const days = daysInMonth(year, month);

  const entryMap = useMemo(() => {
    const m = new Map<string, DailyEntry>();
    for (const e of entries) m.set(e.entry_date, e);
    return m;
  }, [entries]);

  const monthTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const f of FIELDS) totals[f.key as string] = 0;
    for (let d = 1; d <= days; d++) {
      const e = entryMap.get(isoDate(year, month, d));
      if (!e) continue;
      for (const f of FIELDS) totals[f.key as string] = (totals[f.key as string] ?? 0) + resolveField(e, f.key);
    }
    return totals;
  }, [days, year, month, entryMap]);

  const thBase: React.CSSProperties = {
    padding: "6px 8px",
    textAlign: "right",
    fontSize: 10,
    fontWeight: 500,
    color: "var(--fg-4)",
    whiteSpace: "nowrap",
    borderRight: "1px solid var(--line)",
    borderBottom: "1px solid var(--line)",
  };
  const tdBase: React.CSSProperties = {
    padding: "5px 8px",
    textAlign: "right",
    fontSize: 11,
    whiteSpace: "nowrap",
    borderRight: "1px solid var(--line-2)",
    borderBottom: "1px solid var(--line-2)",
  };

  return (
    <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "auto", background: "var(--surface)" }}>
      <table style={{ borderCollapse: "collapse", tableLayout: "auto" }}>
        <thead>
          <tr>
            <th style={{ padding: "4px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-4)", background: "var(--bg-2)", borderBottom: "1px solid var(--line)", borderRight: "1px solid var(--line)", width: 96, minWidth: 96 }}>
              Day
            </th>
            {DAILY_ENTRY_SECTIONS.map((s) => {
              const count = s.fields.filter((f) => f.exportable).length;
              if (count === 0) return null;
              return (
                <th
                  key={s.id}
                  colSpan={count}
                  style={{
                    padding: "4px 12px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: s.headerColor,
                    background: s.headerBg,
                    borderBottom: "1px solid var(--line)",
                    borderRight: "1px solid var(--line)",
                  }}
                >
                  {s.label}
                </th>
              );
            })}
          </tr>
          <tr style={{ background: "var(--bg-2)" }}>
            <th style={{ ...thBase, textAlign: "left", width: 96, minWidth: 96, position: "sticky", left: 0, zIndex: 3, background: "var(--bg-2)" }}>
              Day
            </th>
            {FIELDS.map((f) => (
              <th
                key={f.key as string}
                title={f.label}
                style={{
                  ...thBase,
                  fontStyle: f.calculated ? "italic" : "normal",
                  minWidth: 64,
                  background: f.calculated ? "var(--bg-2)" : undefined,
                  color: f.calculated ? "var(--fg-2)" : "var(--fg-4)",
                }}
              >
                {f.shortLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1;
            const e = entryMap.get(isoDate(year, month, day));
            return (
              <tr
                key={day}
                onClick={() => onOpenDay(day)}
                style={{ cursor: "pointer", transition: "background var(--dur) var(--ease)" }}
                onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--row-hover)")}
                onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
              >
                <td style={{ ...tdBase, textAlign: "left", position: "sticky", left: 0, zIndex: 2, background: "var(--surface)", fontWeight: 500 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{weekdayShort(year, month, day)}</span>
                  <span style={{ color: "var(--fg-4)", marginLeft: 6, fontSize: 10 }}>{String(day).padStart(2, "0")}</span>
                </td>
                {FIELDS.map((f) => {
                  const value = e ? resolveField(e, f.key) : 0;
                  return (
                    <td
                      key={f.key as string}
                      className="mono tabular-nums"
                      style={{
                        ...tdBase,
                        color: e ? (f.calculated ? "var(--fg-2)" : "var(--fg)") : "var(--fg-4)",
                        background: f.calculated ? "var(--bg-2)" : undefined,
                        fontStyle: f.calculated ? "italic" : "normal",
                        fontWeight: f.calculated ? 500 : 400,
                      }}
                    >
                      {e ? fmt(value) : "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--bronze-soft)" }}>
            <td style={{ ...tdBase, textAlign: "left", position: "sticky", left: 0, zIndex: 2, background: "var(--bronze-soft)", fontWeight: 600, color: "var(--bronze)" }}>
              Total
            </td>
            {FIELDS.map((f) => (
              <td
                key={f.key as string}
                className="mono tabular-nums"
                style={{
                  ...tdBase,
                  fontWeight: 600,
                  color: f.calculated ? "var(--bronze-2, var(--bronze))" : "var(--fg)",
                  background: f.calculated ? "var(--bg-2)" : undefined,
                  fontStyle: f.calculated ? "italic" : "normal",
                }}
              >
                {fmt(monthTotals[f.key as string] ?? 0)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      {entries.length === 0 && (
        <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>
          No entries this month. Click any day to start.
        </div>
      )}
    </div>
  );
}