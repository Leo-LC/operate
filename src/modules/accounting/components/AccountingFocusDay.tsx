"use client";
import { useState, useMemo } from "react";
import { Pill } from "@/components/ui/pill";
import {
  salesNetTotal,
  expTotal,
  hrTotal,
  type DailyEntry,
} from "@/modules/accounting/types";

function thb(n: number): string {
  if (n === 0) return "—";
  return (n < 0 ? "−" : "") + "฿" + Math.round(Math.abs(n)).toLocaleString("en");
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

interface BarProps {
  label: string;
  value: number;
  max: number;
  tone: string;
}

function BreakdownBar({ label, value, max, tone }: BarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: "var(--fg-3)" }}>{label}</span>
        <span className="mono tabular-nums" style={{ fontWeight: 500 }}>{thb(value)}</span>
      </div>
      <div style={{ height: 8, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: tone, borderRadius: 4 }} />
      </div>
    </div>
  );
}

interface Props {
  year: number;
  month: number;
  entries: DailyEntry[];
}

export function AccountingFocusDay({ year, month, entries }: Props) {
  const days = daysInMonth(year, month);
  const today = new Date();
  const defaultDay = year === today.getFullYear() && month === today.getMonth() + 1
    ? today.getDate()
    : days;

  const [selectedDay, setSelectedDay] = useState(defaultDay);

  const entryMap = useMemo(() => {
    const m = new Map<string, DailyEntry>();
    for (const e of entries) m.set(e.entry_date, e);
    return m;
  }, [entries]);

  const entry = entryMap.get(isoDate(year, month, selectedDay));

  const sales    = entry ? salesNetTotal(entry) : 0;
  const expenses = entry ? expTotal(entry) : 0;
  const hr       = entry ? hrTotal(entry) : 0;
  const payments = entry ? entry.payment_cash + entry.payment_scan + entry.payment_credit_card : 0;
  const net      = sales - expenses - hr;

  const allDays = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div>
      {/* Day strip */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: "var(--s-5)", padding: "4px 0" }}>
        {allDays.map((day) => {
          const active = day === selectedDay;
          const hasEntry = entryMap.has(isoDate(year, month, day));
          const dayEntry = entryMap.get(isoDate(year, month, day));
          const daySales = dayEntry ? salesNetTotal(dayEntry) : 0;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              style={{
                flexShrink: 0,
                padding: "10px 12px",
                background: active ? "var(--bronze)" : "var(--surface)",
                color: active ? "#fff8ee" : hasEntry ? "var(--fg)" : "var(--fg-4)",
                border: `1px solid ${active ? "var(--bronze)" : "var(--line)"}`,
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 2,
                minWidth: 72,
                fontFamily: "inherit",
                transition: "all var(--dur) var(--ease)",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500, textAlign: "left" }}>{weekdayShort(year, month, day)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: "left" }}>{String(day).padStart(2, "0")}</span>
              <span className="mono tabular-nums" style={{ fontSize: 10, opacity: 0.85, textAlign: "left" }}>
                {hasEntry ? "฿" + Math.round(daySales / 1000) + "k" : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Focus content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: Net hero + breakdown bars */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)", padding: "var(--s-5)",
        }}>
          <div className="eyebrow" style={{ color: "var(--fg-4)" }}>
            Net — {weekdayShort(year, month, selectedDay)} {selectedDay}
          </div>
          <div className="mono tabular-nums" style={{
            fontSize: 44, fontWeight: 500, marginTop: 6, letterSpacing: "-0.02em",
            color: net < 0 ? "var(--bad)" : "var(--fg)",
          }}>
            {entry ? thb(net) : "—"}
          </div>
          {entry && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Pill tone={net >= 0 ? "good" : "bad"}>
                {net >= 0 ? "Positive" : "Negative"}
              </Pill>
              <Pill tone="neutral">{entry ? "Entry recorded" : "No data"}</Pill>
            </div>
          )}

          <div style={{ marginTop: "var(--s-5)", display: "flex", flexDirection: "column", gap: 12 }}>
            <BreakdownBar label="Sales" value={sales} max={sales || 1} tone="var(--good)" />
            <BreakdownBar label="Payments collected" value={payments} max={sales || 1} tone="var(--info)" />
            <BreakdownBar label="Expenses" value={expenses} max={sales || 1} tone="var(--bad)" />
            <BreakdownBar label="HR cost" value={hr} max={sales || 1} tone="var(--warn)" />
          </div>
        </div>

        {/* Right: Key metrics */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)", overflow: "hidden",
        }}>
          <div style={{ padding: "14px var(--s-5)", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Breakdown</div>
            <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>
              {isoDate(year, month, selectedDay)}
            </div>
          </div>
          <div style={{ padding: "var(--s-3) var(--s-5)" }}>
            {[
              { label: "Gross sales",  value: sales,    tone: "var(--good)"   },
              { label: "Payments in",  value: payments, tone: "var(--info)"   },
              { label: "Expenses out", value: expenses, tone: "var(--bad)"    },
              { label: "HR payroll",   value: hr,       tone: "var(--warn)"   },
              { label: "Net result",   value: net,      tone: net < 0 ? "var(--bad)" : "var(--bronze)" },
            ].map(({ label, value, tone }, i) => (
              <div
                key={label}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < 4 ? "1px solid var(--line-2)" : "none",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{label}</span>
                <span
                  className="mono tabular-nums"
                  style={{ fontSize: 13, fontWeight: i === 4 ? 600 : 400, color: entry ? tone : "var(--fg-4)" }}
                >
                  {entry ? thb(value) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!entry && (
        <div style={{
          marginTop: "var(--s-4)",
          padding: "var(--s-4)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          fontSize: 13,
          color: "var(--fg-4)",
          textAlign: "center",
        }}>
          No entry recorded for this day. Switch to Smart table to add one.
        </div>
      )}
    </div>
  );
}
