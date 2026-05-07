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
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">Daily sales vs expenses</p>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-0.5 min-w-max" style={{ height: `${BAR_H + 24}px` }}>
          {data.map(({ day, sales, exp }) => (
            <div key={day} className="flex flex-col items-center gap-0" style={{ width: "20px" }}>
              <div className="flex items-end gap-0.5" style={{ height: `${BAR_H}px` }}>
                {/* Sales bar */}
                <div
                  title={sales != null ? `Day ${day}: Sales ${fmt(sales)}` : `Day ${day}: no data`}
                  style={{ height: `${barH(sales)}px`, width: "8px" }}
                  className={`rounded-t transition-all ${sales != null ? "bg-green-500 dark:bg-green-500" : "bg-muted/30"}`}
                />
                {/* Expenses bar */}
                <div
                  title={exp != null ? `Day ${day}: Expenses ${fmt(exp)}` : ""}
                  style={{ height: `${barH(exp)}px`, width: "8px" }}
                  className={`rounded-t transition-all ${exp != null ? "bg-red-400 dark:bg-red-500" : "bg-muted/20"}`}
                />
              </div>
              {(day === 1 || day % 5 === 0 || day === days) && (
                <span className="text-[9px] text-muted-foreground/60 mt-0.5">{day}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" /> Sales net</div>
        <div className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400" /> Expenses + HR</div>
      </div>
    </div>
  );
}
