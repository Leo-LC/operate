"use client";
import { useState, useMemo, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationMeta { id: string; name: string }

interface LocationSummary {
  location_id: string;
  location_name: string;
  accounting: { sales_net: number; expenses: number; net_profit: number };
  animals: { total: number; sick: number; capybaras: number; meerkats: number };
  documents: { total: number; expired: number; expiring: number; valid: number };
  staffing: { active_employees: number };
}

interface OverviewData {
  month: string;
  locations: LocationMeta[];
  summaries: LocationSummary[];
}

function fmt(n: number) {
  return n === 0 ? "0" : n.toLocaleString("en", { maximumFractionDigits: 0 });
}

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
}

interface Props {
  initialLocations: LocationMeta[];
}

export function OverviewClient({ initialLocations }: Props) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedLocIds, setSelectedLocIds] = useState<Set<string>>(new Set(initialLocations.map((l) => l.id)));
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ids = Array.from(selectedLocIds);
    if (ids.length === 0) { setData(null); return; }
    setLoading(true);
    const params = new URLSearchParams({ month });
    ids.forEach((id) => params.append("location_id", id));
    fetch(`/api/overview?${params.toString()}`)
      .then((r) => r.ok ? r.json() as Promise<OverviewData> : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [month, selectedLocIds]);

  function toggleLoc(id: string) {
    setSelectedLocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const summaries = useMemo(() => data?.summaries ?? [], [data]);

  const totals = useMemo(() => summaries.reduce(
    (acc, s) => ({
      sales: acc.sales + s.accounting.sales_net,
      expenses: acc.expenses + s.accounting.expenses,
      profit: acc.profit + s.accounting.net_profit,
      animals: acc.animals + s.animals.total,
      sick: acc.sick + s.animals.sick,
      docsExpired: acc.docsExpired + s.documents.expired,
      docsExpiring: acc.docsExpiring + s.documents.expiring,
      employees: acc.employees + s.staffing.active_employees,
    }),
    { sales: 0, expenses: 0, profit: 0, animals: 0, sick: 0, docsExpired: 0, docsExpiring: 0, employees: 0 },
  ), [summaries]);

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMonth(prevMonth)}><ChevronLeftIcon className="size-4" /></Button>
          <span className="text-base font-semibold w-44 text-center">{monthLabel(month)}</span>
          <Button variant="ghost" size="sm" onClick={() => setMonth(nextMonth)}><ChevronRightIcon className="size-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {initialLocations.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => toggleLoc(l.id)}
              className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${selectedLocIds.has(l.id) ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-foreground"}`}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>}

      {!loading && summaries.length > 0 && (
        <>
          {/* Top-level KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total sales net", value: `฿ ${fmt(totals.sales)}`, color: "" },
              { label: "Net profit", value: `฿ ${fmt(totals.profit)}`, color: totals.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive" },
              { label: "Animals total", value: String(totals.animals), suffix: totals.sick > 0 ? `${totals.sick} need attention` : undefined, suffixColor: "text-destructive" },
              { label: "Documents issues", value: String(totals.docsExpired + totals.docsExpiring), color: totals.docsExpired > 0 ? "text-destructive" : totals.docsExpiring > 0 ? "text-amber-600" : "" },
            ].map(({ label, value, color, suffix, suffixColor }) => (
              <div key={label} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className={`text-xl font-semibold ${color ?? ""}`}>{value}</p>
                {suffix && <p className={`text-[10px] ${suffixColor ?? "text-muted-foreground"}`}>{suffix}</p>}
              </div>
            ))}
          </div>

          {/* Per-shop breakdown */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Per shop</h2>
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Shop</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Sales net</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Expenses</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net profit</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Animals</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Docs issues</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summaries.map((s) => (
                    <tr key={s.location_id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{s.location_name}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">฿ {fmt(s.accounting.sales_net)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">฿ {fmt(s.accounting.expenses)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${s.accounting.net_profit >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                        ฿ {fmt(s.accounting.net_profit)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span>{s.animals.total}</span>
                        {s.animals.sick > 0 && <span className="ml-1 text-xs text-destructive">({s.animals.sick} sick)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {s.documents.expired > 0 && <span className="text-destructive font-medium">{s.documents.expired} exp.</span>}
                        {s.documents.expiring > 0 && <span className="text-amber-600 ml-1">{s.documents.expiring} soon</span>}
                        {s.documents.expired === 0 && s.documents.expiring === 0 && <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{s.staffing.active_employees}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && summaries.length === 0 && selectedLocIds.size > 0 && (
        <div className="rounded-lg border border-border px-6 py-12 text-center text-sm text-muted-foreground">
          No data for the selected shops and month.
        </div>
      )}
      {selectedLocIds.size === 0 && (
        <div className="rounded-lg border border-border px-6 py-12 text-center text-sm text-muted-foreground">
          Select at least one shop above.
        </div>
      )}
    </div>
  );
}
