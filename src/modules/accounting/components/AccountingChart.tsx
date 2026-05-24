"use client";
import { useMemo } from "react";
import { salesNetTotal, expTotal, hrTotal, type DailyEntry } from "@/modules/accounting/types";

interface Props {
  entries: DailyEntry[];
  year: number;
  month: number;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const BAR_H = 80; // px max bar height

export function AccountingChart({ entries, year, month }: Props) {
  const days = daysInMonth(year, month);
  const entryMap = useMemo(() => {
    const m = new Map<string, DailyEntry>();
    for (const e of entries) m.set(e.entry_date, e);
    return m;
  }, [entries]);

  const data = useMemo(() =>
    Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      const e = entryMap.get(isoDate(year, month, d));
      return {
        day: d,
        sales: e ? salesNetTotal(e) : null,
        exp: e ? expTotal(e) + hrTotal(e) : null,
      };
    }),
  [days, entryMap, year, month]);

  const maxVal = useMemo(() => {
    const all = data.flatMap((d) => [d.sales ?? 0, d.exp ?? 0]);
    return Math.max(...all, 1);
  }, [data]);

  const barH = (v: number | null) => v == null ? 0 : Math.max(2, Math.round((v / maxVal) * BAR_H));

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p className="eyebrow" style={{ color: "var(--fg-4)" }}>Daily sales vs expenses</p>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, minWidth: "max-content", height: BAR_H + 24 }}>
          {data.map(({ day, sales, exp }) => (
            <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: BAR_H }}>
                <div
                  title={sales != null ? `Day ${day}: Sales ${fmt(sales)}` : `Day ${day}: no data`}
                  style={{ height: barH(sales), width: 8, borderRadius: "2px 2px 0 0", background: sales != null ? "var(--good)" : "var(--bg-2)", transition: "height 200ms" }}
                />
                <div
                  title={exp != null ? `Day ${day}: Expenses ${fmt(exp)}` : ""}
                  style={{ height: barH(exp), width: 8, borderRadius: "2px 2px 0 0", background: exp != null ? "var(--bad)" : "var(--bg-2)", transition: "height 200ms" }}
                />
              </div>
              {(day === 1 || day % 5 === 0 || day === days) && (
                <span style={{ fontSize: 9, color: "var(--fg-4)", marginTop: 2, opacity: 0.6 }}>{day}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 10, color: "var(--fg-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--good)" }} />
          Sales net
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--bad)" }} />
          Expenses + HR
        </div>
      </div>
    </div>
  );
}
