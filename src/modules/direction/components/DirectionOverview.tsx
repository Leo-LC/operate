"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { DateRangePicker } from "@/modules/reports/components/DateRangePicker";

// ── Helpers ──────────────────────────────────────────────────────────────
function fmtN(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtMoney(n: number) {
  return `฿${fmtN(Math.abs(n))}`;
}
function bangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const o: Record<string, string> = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${o.year}-${o.month}-${o.day}`;
}
function toDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const r = new Date(d);
  r.setDate(d.getDate() + diff);
  return r;
}
function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

type PeriodKey = "today" | "yesterday" | "this-week" | "this-month" | "last-month";
function periodRange(key: PeriodKey, base: Date): { from: string; to: string; label: string } {
  if (key === "today") return { from: toDay(base), to: toDay(base), label: "Today" };
  if (key === "yesterday") {
    const d = new Date(base); d.setDate(base.getDate() - 1);
    return { from: toDay(d), to: toDay(d), label: "Yesterday" };
  }
  if (key === "this-week") return { from: toDay(startOfWeek(base)), to: toDay(endOfWeek(base)), label: "This week" };
  if (key === "this-month") return { from: toDay(startOfMonth(base)), to: toDay(base), label: "This month" };
  if (key === "last-month") {
    const m = new Date(base.getFullYear(), base.getMonth() - 1, 1);
    return { from: toDay(startOfMonth(m)), to: toDay(endOfMonth(m)), label: "Last month" };
  }
  return { from: toDay(base), to: toDay(base), label: "Today" };
}

// ── Types mirroring /api/reports/accounting ───────────────────────────
interface ShopAgg {
  locationId: string;
  locationName: string;
  revenue: number;
  expenses: number;
  hrCosts: number;
  netProfit: number;
  margin: number;
  drinks: number;
  tickets: number;
  snacks: number;
  goodies: number;
  surcharge: number;
  cash: number;
  scan: number;
  creditCard: number;
  expStaffFoodCash: number;
  expDrinksCash: number;
  expGoodiesCash: number;
  expAnimalsCash: number;
  expSupplyCash: number;
  expOtherCash: number;
  expMakroBank: number;
  expOtherBank: number;
  hrSalaryCash: number;
  hrServiceChargeCash: number;
  hrChallengeCash: number;
  vat: number;
  cashToBoss: number;
  closingCashSafe: number;
}
interface AccountingData {
  period: { from: string; to: string };
  locations: { id: string; name: string }[];
  overview: ShopAgg;
  byShop: ShopAgg[];
  previousPeriod: { period: { from: string; to: string }; overview: ShopAgg; byShop?: ShopAgg[] };
  dailyTotals: { date: string; revenue: number }[];
  monthlyExpenses: { categories: { key: string; label: string }[]; totals: Record<string, number>; entered: boolean };
  completeness: { totalExpected: number; totalFilled: number; percent: number; shopsIncomplete: string[] };
}

function pctChange(curr: number, prev: number): { pct: number | null; dir: "up" | "down" | "neutral" } {
  if (!prev) return { pct: null, dir: "neutral" };
  const v = ((curr - prev) / Math.abs(prev)) * 100;
  const dir = v > 0.05 ? "up" : v < -0.05 ? "down" : "neutral";
  return { pct: v, dir };
}

function MoneyBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-2)]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Main Overview ─────────────────────────────────────────────────────
export function DirectionOverview() {
  const [period, setPeriod] = useState<PeriodKey | "custom">("this-month");
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMoneyOutBreakdown, setShowMoneyOutBreakdown] = useState(false);
  const [shopSort, setShopSort] = useState<"profit" | "sales" | "margin">("profit");

  // date range derived from period
  const base = useMemo(() => parseDay(bangkokToday()), []);
  const range = useMemo(() => {
    if (period === "custom" && customRange) return { ...customRange, label: "Custom" };
    return periodRange(period as PeriodKey, base);
  }, [period, customRange, base]);
  const { from, to } = range;

  const fetchData = useCallback(async (f: string, t: string, shops: string[], locs: { id: string; name: string }[]) => {
    setLoading(true);
    try {
      const locParam = locs.length > 0 && shops.length !== locs.length && shops.length > 0 ? shops.join(",") : "all";
      const res = await fetch(`/api/reports/accounting?from=${f}&to=${t}&locations=${locParam}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as AccountingData;
      setData(json);
      // init selectedShops on first load
      if (locs.length === 0 && json.locations.length > 0 && shops.length === 0) {
        setSelectedShops(json.locations.map((l) => l.id));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // initial fetch when period changes — we need locations already fetched once
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    // if we have locations, refetch with current selection; otherwise fetch all
    if (locations.length > 0) {
      void fetchData(from, to, selectedShops, locations);
    } else {
      void (async () => {
        setLoading(true);
        const res = await fetch(`/api/reports/accounting?from=${from}&to=${to}&locations=all`, { cache: "no-store" });
        const json = (await res.json()) as AccountingData;
        setData(json);
        setLocations(json.locations);
        setSelectedShops(json.locations.map((l) => l.id));
        setLoading(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // when shop pills change, refetch
  useEffect(() => {
    if (locations.length === 0) return;
    // avoid double fetch on init already done
    void fetchData(from, to, selectedShops, locations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShops.join(",")]);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--line-2)]" />
        ))}
      </div>
    );
  }
  if (!data) return <div className="py-10 text-center text-sm text-[var(--fg-4)]">Pas de données</div>;

  const o = data.overview;
  const prev = data.previousPeriod.overview;

  // Boss Expenses = operating + HR (spec aggregates aggressively)
  const bossExpenses = o.expenses + o.hrCosts;
  const prevExpenses = prev.expenses + prev.hrCosts;
  const bossProfit = o.revenue - bossExpenses;
  const prevProfit = prev.revenue - prevExpenses;
  const bossMargin = o.revenue > 0 ? (bossProfit / o.revenue) * 100 : 0;

  const salesDelta = pctChange(o.revenue, prev.revenue);
  const expDelta = pctChange(bossExpenses, prevExpenses);
  const profitDelta = pctChange(bossProfit, prevProfit);

  // Money in breakdown — 5 bars
  const moneyInRows = [
    { label: "Tickets", value: o.tickets, color: "var(--info)" },
    { label: "Drinks", value: o.drinks, color: "var(--bronze)" },
    { label: "Snacks", value: o.snacks, color: "var(--good)" },
    { label: "Goods", value: o.goodies, color: "var(--warn)" },
    { label: "Other", value: o.surcharge, color: "var(--fg-4)" },
  ].filter((r) => r.value !== 0).sort((a, b) => b.value - a.value);
  const moneyInMax = Math.max(...moneyInRows.map((r) => r.value), 1);

  // Money out — aggressive grouping per spec
  const operating = o.expStaffFoodCash + o.expDrinksCash + o.expGoodiesCash + o.expAnimalsCash + o.expSupplyCash + o.expOtherCash + o.expMakroBank + o.expOtherBank;
  const salaries = o.hrSalaryCash;
  const serviceBonus = o.hrServiceChargeCash + o.hrChallengeCash;
  const fixedTotal = Object.values(data.monthlyExpenses.totals).reduce((s, v) => s + (v as number), 0);
  const moneyOutRows = [
    { label: "Salaries", value: salaries, color: "var(--purple)" },
    { label: "Operations", value: operating, color: "var(--warn)" },
    { label: "Fixed costs", value: fixedTotal, color: "var(--fg-3)" },
    { label: "Service / Bonus", value: serviceBonus, color: "var(--info)" },
  ].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const moneyOutMax = Math.max(...moneyOutRows.map((r) => r.value), 1);

  // Detailed breakdown for "View breakdown"
  const detailedOutRows = [
    { label: "Staff food", value: o.expStaffFoodCash },
    { label: "Drinks cash", value: o.expDrinksCash },
    { label: "Goodies cash", value: o.expGoodiesCash },
    { label: "Animals", value: o.expAnimalsCash },
    { label: "Supply", value: o.expSupplyCash },
    { label: "Other cash", value: o.expOtherCash },
    { label: "Makro bank", value: o.expMakroBank },
    { label: "Other bank", value: o.expOtherBank },
  ].filter((r) => r.value > 0);

  // Shops ranking
  const shopsAll = data.byShop.map((s) => {
    const sExp = s.expenses + s.hrCosts;
    const sProfit = s.revenue - sExp;
    const sMargin = s.revenue > 0 ? (sProfit / s.revenue) * 100 : 0;
    return { ...s, _exp: sExp, _profit: sProfit, _margin: sMargin };
  });
  // filter by selectedShops
  const shops = selectedShops.length === 0 || selectedShops.length === locations.length
    ? shopsAll
    : shopsAll.filter((s) => selectedShops.includes(s.locationId));
  const sortedShops = [...shops].sort((a, b) => {
    if (shopSort === "profit") return b._profit - a._profit;
    if (shopSort === "sales") return b.revenue - a.revenue;
    return b._margin - a._margin;
  });
  const shopProfitMax = Math.max(...sortedShops.map((s) => s._profit), 1);

  return (
    <div className="flex flex-col gap-5">
      {/* Période + Boutiques */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={{ from, to }}
            onChange={({ from: f, to: t }) => {
              const baseD = base;
              const match = (["today", "yesterday", "this-week", "this-month", "last-month"] as PeriodKey[]).find((k) => {
                const r = periodRange(k, baseD);
                return r.from === f && r.to === t;
              });
              if (match) setPeriod(match);
              else {
                setCustomRange({ from: f, to: t });
                setPeriod("custom" as PeriodKey);
              }
            }}
            today={bangkokToday()}
          />
        </div>
        {locations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <PillButton active={selectedShops.length === locations.length} onClick={() => setSelectedShops(locations.map((l) => l.id))}>
              Toutes les boutiques
            </PillButton>
            {locations.map((loc) => (
              <PillButton
                key={loc.id}
                active={selectedShops.includes(loc.id)}
                onClick={() => {
                  // When "All shops" is active, clicking a shop selects ONLY that shop (deselects all others)
                  if (selectedShops.length === locations.length) {
                    setSelectedShops([loc.id]);
                    return;
                  }
                  setSelectedShops((prev) =>
                    prev.includes(loc.id) ? prev.filter((s) => s !== loc.id) : [...prev, loc.id]
                  );
                }}
              >
                {shortShopName(loc.name)}
              </PillButton>
            ))}
          </div>
        )}
      </div>

      {/* KPI — 4 chiffres clés */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Ventes" value={fmtMoney(o.revenue)} delta={salesDelta} sub={`${data.dailyTotals.length} jours`} />
        <KpiCard label="Dépenses" value={fmtMoney(bossExpenses)} delta={expDelta} sub="Exploitation + Personnel" tone={expDelta.dir === "down" ? "good" : expDelta.dir === "up" ? "bad" : "neutral"} />
        <KpiCard
          label="Bénéfice net"
          value={fmtMoney(bossProfit)}
          delta={profitDelta}
          sub={`${bossMargin.toFixed(1)}% de marge`}
          hero
        />
        <KpiCard label="Marge" value={`${bossMargin.toFixed(1)}%`} delta={pctChange(bossMargin, prev.revenue > 0 ? (prevProfit / prev.revenue) * 100 : 0)} sub="vs préc." />
      </div>

      {/* Money in / Money out */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--fg-3)]">Entrées — Répartition</h3>
          <div className="flex flex-col gap-3">
            {moneyInRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--fg-4)]">Pas de chiffre d’affaires</p>
            ) : (
              moneyInRows.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-[var(--fg-3)]">{r.label === "Tickets" ? "Tickets" : r.label === "Drinks" ? "Boissons" : r.label === "Snacks" ? "Snacks" : r.label === "Goods" ? "Goodies" : "Autres"}</span>
                  <MoneyBar value={r.value} max={moneyInMax} color={r.color} />
                  <span className="w-20 text-right font-mono text-xs tabular-nums">{fmtMoney(r.value)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between border-t border-[var(--line)] pt-3 text-xs font-semibold">
              <span>Total ventes</span>
              <span className="font-mono">{fmtMoney(o.revenue)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--fg-3)]">Sorties — Dépenses</h3>
          <div className="flex flex-col gap-3">
            {moneyOutRows.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-24 text-xs text-[var(--fg-3)]">{r.label === "Salaries" ? "Salaires" : r.label === "Operations" ? "Exploitation" : r.label === "Fixed costs" ? "Charges fixes" : "Primes / Bonus"}</span>
                <MoneyBar value={r.value} max={moneyOutMax} color={r.color} />
                <span className="w-20 text-right font-mono text-xs tabular-nums">{fmtMoney(r.value)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-[var(--line)] pt-3 text-xs font-semibold">
              <span>Total dépenses</span>
              <span className="font-mono">{fmtMoney(bossExpenses)}</span>
            </div>
            {showMoneyOutBreakdown && detailedOutRows.length > 0 && (
              <div className="mt-2 rounded bg-[var(--bg-2)] p-3">
                <p className="mb-2 text-[11px] font-medium uppercase text-[var(--fg-4)]">Détail</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {detailedOutRows.map((r) => (
                    <div key={r.label} className="flex justify-between">
                      <span className="text-[var(--fg-4)]">{r.label === "Staff food" ? "Repas staff" : r.label === "Drinks cash" ? "Boissons" : r.label === "Goodies cash" ? "Goodies" : r.label === "Animals" ? "Animaux" : r.label === "Supply" ? "Fournitures" : r.label === "Other cash" ? "Autres cash" : r.label === "Makro bank" ? "Makro banque" : "Autres banque"}</span>
                      <span className="font-mono">{fmtMoney(r.value)}</span>
                    </div>
                  ))}
                </div>
                {data.monthlyExpenses.categories.length > 0 && (
                  <div className="mt-3 border-t border-[var(--line)] pt-2">
                    <p className="mb-1 text-[11px] font-medium uppercase text-[var(--fg-4)]">Charges fixes</p>
                    {data.monthlyExpenses.categories.map((c) => (
                      <div key={c.key} className="flex justify-between text-xs">
                        <span className="text-[var(--fg-4)]">{c.label}</span>
                        <span className="font-mono">{fmtMoney(data.monthlyExpenses.totals[c.key] ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowMoneyOutBreakdown((v) => !v)}
              className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-2)] px-3 py-1.5 text-xs font-medium text-[var(--fg-3)] hover:bg-[var(--surface-2)]"
            >
              {showMoneyOutBreakdown ? "Masquer le détail" : "Voir le détail"}
              <span className="text-[10px] leading-none">{showMoneyOutBreakdown ? "▲" : "▼"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Boutiques — classement */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-3)]">Boutiques</h3>
          <div className="flex gap-1">
            {(["profit", "sales", "margin"] as const).map((k) => (
              <PillButton key={k} active={shopSort === k} onClick={() => setShopSort(k)} className="capitalize">
                {k === "profit" ? "Bénéfice" : k === "sales" ? "Ventes" : "Marge"}
              </PillButton>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--fg-4)]">
                <th className="py-2 font-medium">Boutique</th>
                <th className="py-2 text-right font-medium">Ventes</th>
                <th className="py-2 text-right font-medium">Bénéfice</th>
                <th className="py-2 text-right font-medium">Marge</th>
                <th className="py-2 w-24 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {sortedShops.map((s) => (
                <tr key={s.locationId} className="border-b border-[var(--line-2)] last:border-0">
                  <td className="py-2.5 font-medium">{shortShopName(s.locationName)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{fmtMoney(s.revenue)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums" style={{ color: s._profit < 0 ? "var(--bad)" : "var(--good)" }}>
                    {fmtMoney(s._profit)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums">{s._margin.toFixed(1)}%</td>
                  <td className="py-2.5">
                    <div className="h-1.5 w-full rounded-full bg-[var(--line-2)]">
                      <div className="h-full rounded-full bg-[var(--good)]" style={{ width: `${shopProfitMax > 0 ? (Math.max(0, s._profit) / shopProfitMax) * 100 : 0}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function KpiCard({ label, value, delta, sub, hero, tone }: { label: string; value: string; delta: { pct: number | null; dir: "up" | "down" | "neutral" }; sub?: string; hero?: boolean; tone?: "good" | "bad" | "neutral" }) {
  const deltaTone = tone ?? delta.dir;
  return (
    <div
      className={`rounded-[var(--r-lg)] border p-4 ${hero ? "bg-[var(--accent)] text-white border-[var(--accent)] lg:col-span-1" : "bg-[var(--surface)] border-[var(--line)]"}`}
      style={hero ? { background: "var(--accent)", color: "#fff" } : undefined}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${hero ? "text-white/70" : "text-[var(--fg-4)]"}`}>{label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-1">
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${hero ? "text-white/80" : ""}`} style={!hero ? { color: deltaTone === "up" ? "var(--good)" : deltaTone === "down" ? "var(--bad)" : "var(--fg-4)" } : undefined}>
          {delta.pct === null ? (
            "— vs préc."
          ) : (
            <>
              {delta.dir === "up" ? <ArrowUpIcon size={11} /> : delta.dir === "down" ? <ArrowDownIcon size={11} /> : <MinusIcon size={11} />}
              {Math.abs(delta.pct).toFixed(1)}% vs préc.
            </>
          )}
        </span>
      </div>
      {sub && <p className={`mt-1 text-xs ${hero ? "text-white/60" : "text-[var(--fg-4)]"}`}>{sub}</p>}
    </div>
  );
}

function shortShopName(name: string): string {
  return name.replace(/^Capybara Coffee\s*/i, "").trim() || name;
}
