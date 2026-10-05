"use client";
import { useCallback, useEffect, useState } from "react";
import { MonthPicker } from "@/components/ui/filters";
import type { DrinksRateRow } from "@/modules/challenges/drinks-rate";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

function Cell({ drinks, adults, rate }: { drinks: number; adults: number; rate: number | null }) {
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right">
      <p className="font-mono text-sm font-semibold tabular-nums text-[var(--fg)]">{fmtRate(rate)}</p>
      <p className="font-mono text-[10px] tabular-nums text-[var(--fg-4)]">
        {fmtInt(drinks)} / {fmtInt(adults)}
      </p>
    </td>
  );
}

export function DrinksLab() {
  const [month, setMonth] = useState(currentMonth);
  const [rows, setRows] = useState<DrinksRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/challenges/drinks-rate?month=${m}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { rows: DrinksRateRow[] };
      setRows(json.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month);
  }, [month, fetchData]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <MonthPicker value={month} onChange={setMonth} />
        {!loading && !error && rows.length > 0 && (
          <p className="text-[13px] text-[var(--fg-3)]">
            Taux = <span className="font-mono font-semibold text-[var(--fg)]">boissons / adultes</span>{" "}
            <span className="text-[var(--fg-4)]">(quantités Loyverse, détail boissons / adultes sous chaque taux)</span>
          </p>
        )}
      </div>

      {error ? (
        <div className="flex h-32 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)]">
          <span className="text-sm text-[var(--bad)]">{error}</span>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="h-48 animate-pulse rounded-[var(--r-md)] border border-[var(--line)]" />
      ) : rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)]">
          <span className="text-sm text-[var(--fg-4)]">No data for this month yet.</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--line)]">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--fg-4)]">Shop</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium text-[var(--fg-4)]">P1 · 1–10</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium text-[var(--fg-4)]">P2 · 11–20</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium text-[var(--fg-4)]">P3 · 21–fin</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium text-[var(--fg-4)]">Total mois</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.locationId} className="border-b border-[var(--line)] last:border-b-0">
                  <td className="px-3 py-2 text-[13px] font-medium text-[var(--fg)]">{r.locationTitle}</td>
                  <Cell drinks={r.p1.drinks} adults={r.p1.adults} rate={r.p1.rate} />
                  <Cell drinks={r.p2.drinks} adults={r.p2.adults} rate={r.p2.rate} />
                  <Cell drinks={r.p3.drinks} adults={r.p3.adults} rate={r.p3.rate} />
                  <Cell drinks={r.total.drinks} adults={r.total.adults} rate={r.total.rate} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="max-w-3xl text-[11px] leading-relaxed text-[var(--fg-4)]">
        Expérimentation — source <span className="font-mono">loyverse_daily_sales.sales_by_item</span> (quantités
        Loyverse, remboursements déduits). Adultes = items d&apos;entrée contenant « adult » (Adult, AA ADULT, A.Adult,
        A ENTRY adult — enfants Kid/Child exclus, merch « Tshirt Adult » exclu). Boissons = items{" "}
        <span className="font-mono">drinks</span> (règles Samui dédiées, lignes de frais carte « 3% Card » exclues). « — » = aucun adulte sur la période.
      </p>
    </div>
  );
}
