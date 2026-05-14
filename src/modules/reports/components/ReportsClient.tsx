"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDownIcon } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";

// ── Types ────────────────────────────────────────────────────────────────────

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
}

interface AccountingData {
  period: { from: string; to: string };
  locations: { id: string; name: string }[];
  overview: ShopAgg;
  byShop: ShopAgg[];
}

// ── Formatting ───────────────────────────────────────────────────────────────

function fmtN(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().slice(0, 10);
}
function lastMonthRange(): [string, string] {
  const d = new Date();
  const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const m = d.getMonth() === 0 ? 12 : d.getMonth();
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const to = new Date(y, m, 0).toISOString().slice(0, 10);
  return [from, to];
}
function quarterStart() {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  return `${d.getFullYear()}-${String(q * 3 + 1).padStart(2, "0")}-01`;
}

// ── Shop Selector ────────────────────────────────────────────────────────────

function ShopSelector({
  locations,
  selected,
  onChange,
}: {
  locations: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === locations.length;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  function toggleAll() {
    onChange(allSelected ? [] : locations.map((l) => l.id));
  }

  const label = allSelected
    ? "All shops"
    : selected.length === 0
    ? "No shops"
    : selected.length === 1
    ? locations.find((l) => l.id === selected[0])?.name ?? "1 shop"
    : `${selected.length} shops`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 h-8 min-w-[120px] px-3 rounded-md border border-border bg-background text-xs font-medium hover:bg-muted/40 transition-colors"
      >
        {label}
        <ChevronDownIcon className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-20 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg p-1.5 flex flex-col gap-0.5">
            <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/40 cursor-pointer text-xs font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded"
              />
              All shops
            </label>
            <div className="h-px bg-border/50 my-1" />
            {locations.map((loc) => (
              <label
                key={loc.id}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/40 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(loc.id)}
                  onChange={() => toggle(loc.id)}
                  className="rounded"
                />
                {loc.name}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "green" | "red" | "blue";
}) {
  const valueColor =
    color === "green"
      ? "text-emerald-700 dark:text-emerald-400"
      : color === "red"
      ? "text-destructive"
      : color === "blue"
      ? "text-blue-600 dark:text-blue-400"
      : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Controls bar ─────────────────────────────────────────────────────────────

function Controls({
  from,
  to,
  onFromChange,
  onToChange,
  locations,
  selectedShops,
  onShopsChange,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  locations: { id: string; name: string }[];
  selectedShops: string[];
  onShopsChange: (ids: string[]) => void;
}) {
  const quickBtns: Array<{ label: string; fn: () => void }> = [
    { label: "Today", fn: () => { onFromChange(today()); onToChange(today()); } },
    { label: "This week", fn: () => { onFromChange(weekStart()); onToChange(today()); } },
    { label: "This month", fn: () => { onFromChange(monthStart()); onToChange(today()); } },
    {
      label: "Last month",
      fn: () => {
        const [f, t] = lastMonthRange();
        onFromChange(f);
        onToChange(t);
      },
    },
    { label: "This quarter", fn: () => { onFromChange(quarterStart()); onToChange(today()); } },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {quickBtns.map((b) => (
        <Button key={b.label} variant="outline" size="sm" className="h-8 text-xs" onClick={b.fn}>
          {b.label}
        </Button>
      ))}
      <div className="flex items-center gap-1 ml-1">
        <DateInput
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">–</span>
        <DateInput
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
      {locations.length > 0 && (
        <ShopSelector locations={locations} selected={selectedShops} onChange={onShopsChange} />
      )}
    </div>
  );
}

// ── Operations Tab ────────────────────────────────────────────────────────────

function OperationsView({ data }: { data: AccountingData }) {
  const { overview: o, byShop } = data;
  const totalPayments = o.cash + o.scan + o.creditCard;

  function pct(n: number) {
    return totalPayments > 0 ? fmtPct((n / totalPayments) * 100) : "—";
  }

  const sortedShops = [...byShop].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={`฿${fmtN(o.revenue)}`} />
        <KpiCard label="Total Expenses" value={`฿${fmtN(o.expenses + o.hrCosts)}`} color="red" />
        <KpiCard
          label="Net Profit"
          value={`฿${fmtN(o.netProfit)}`}
          color={o.netProfit >= 0 ? "green" : "red"}
        />
        <KpiCard
          label="Net Margin"
          value={fmtPct(o.margin)}
          color={o.margin >= 20 ? "green" : o.margin >= 0 ? "default" : "red"}
        />
      </div>

      {/* Revenue by category */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-emerald-500/[0.12]">
          <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Revenue by category</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Category</th>
                {sortedShops.map((s) => (
                  <th key={s.locationId} className="px-4 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                    {s.locationName}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-semibold text-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {[
                { key: "drinks" as const, label: "Drinks" },
                { key: "tickets" as const, label: "Tickets" },
                { key: "snacks" as const, label: "Snacks" },
                { key: "goodies" as const, label: "Goodies" },
                { key: "surcharge" as const, label: "Card surcharge" },
              ].map(({ key, label }) => (
                <tr key={key} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2 text-muted-foreground">{label}</td>
                  {sortedShops.map((s) => (
                    <td key={s.locationId} className="px-4 py-2 text-right tabular-nums">
                      {s[key] > 0 ? fmtN(s[key]) : <span className="text-muted-foreground/30">—</span>}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {fmtN(sortedShops.reduce((sum, s) => sum + s[key], 0))}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/20 font-semibold border-t-2 border-border">
                <td className="px-4 py-2">Total revenue</td>
                {sortedShops.map((s) => (
                  <td key={s.locationId} className="px-4 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                    {fmtN(s.revenue)}
                  </td>
                ))}
                <td className="px-4 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                  {fmtN(o.revenue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment method split */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-blue-500/[0.12]">
          <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Payment methods</h3>
        </div>
        <div className="p-4 grid grid-cols-3 gap-4">
          {[
            { label: "Cash", value: o.cash },
            { label: "Scan / QR", value: o.scan },
            { label: "Credit card", value: o.creditCard },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold tabular-nums">฿{fmtN(value)}</p>
              <p className="text-xs text-muted-foreground">{pct(value)} of payments</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses + HR */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-amber-500/[0.12]">
          <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Expenses &amp; HR</h3>
        </div>
        <div className="p-4 grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-lg font-bold tabular-nums text-destructive">฿{fmtN(o.expenses)}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">HR costs</p>
            <p className="text-lg font-bold tabular-nums text-destructive">฿{fmtN(o.hrCosts)}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Grand total costs</p>
            <p className="text-lg font-bold tabular-nums text-destructive">฿{fmtN(o.expenses + o.hrCosts)}</p>
          </div>
        </div>
      </div>

      {/* Per-shop comparison */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-slate-500/[0.12]">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Per-shop comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Shop</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Revenue</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Expenses</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">HR</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Net Profit</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sortedShops.map((s) => (
                <tr key={s.locationId} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2 font-medium">{s.locationName}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmtN(s.revenue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">฿{fmtN(s.expenses)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">฿{fmtN(s.hrCosts)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-medium ${s.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                    ฿{fmtN(s.netProfit)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                      s.margin >= 20
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : s.margin >= 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {fmtPct(s.margin)}
                    </span>
                  </td>
                </tr>
              ))}
              {sortedShops.length > 1 && (
                <tr className="bg-muted/20 font-semibold border-t-2 border-border text-xs">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmtN(o.revenue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">฿{fmtN(o.expenses)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">฿{fmtN(o.hrCosts)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-bold ${o.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                    ฿{fmtN(o.netProfit)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                      o.margin >= 20
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : o.margin >= 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {fmtPct(o.margin)}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── CEO View ──────────────────────────────────────────────────────────────────

function CeoView({ data }: { data: AccountingData }) {
  const { overview: o, byShop } = data;

  const sortedShops = [...byShop].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(...sortedShops.map((s) => s.revenue), 1);
  const top = sortedShops[0];
  const bottom = sortedShops[sortedShops.length - 1];

  return (
    <div className="flex flex-col gap-8">
      {/* 3 large KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Revenue</p>
          <p className="text-4xl font-extrabold tabular-nums">฿{fmtN(o.revenue)}</p>
        </div>
        <div className={`rounded-xl border border-border p-6 flex flex-col gap-2 ${o.netProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50" : "bg-destructive/5 border-destructive/20"}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest ${o.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>Net Profit</p>
          <p className={`text-4xl font-extrabold tabular-nums ${o.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>
            ฿{fmtN(o.netProfit)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Margin</p>
          <p className={`text-4xl font-extrabold tabular-nums ${o.margin >= 20 ? "text-emerald-700 dark:text-emerald-400" : o.margin >= 0 ? "text-foreground" : "text-destructive"}`}>
            {fmtPct(o.margin)}
          </p>
        </div>
      </div>

      {/* Revenue vs Expenses per shop — CSS bars */}
      {sortedShops.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground">Revenue vs. Expenses by shop</h3>
          <div className="flex flex-col gap-5">
            {sortedShops.map((s) => {
              const revPct = (s.revenue / maxRevenue) * 100;
              const expPct = (((s.expenses + s.hrCosts) / maxRevenue) * 100);
              return (
                <div key={s.locationId} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{s.locationName}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {o.revenue > 0 ? fmtPct((s.revenue / o.revenue) * 100) : "—"} of revenue
                      </span>
                    </div>
                    <span className={`text-xs font-semibold tabular-nums ${s.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                      {s.netProfit >= 0 ? "+" : ""}฿{fmtN(s.netProfit)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-14 text-right">฿{fmtN(s.revenue)}</span>
                      <div className="flex-1 h-4 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/80"
                          style={{ width: `${revPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10">Rev</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-14 text-right">฿{fmtN(s.expenses + s.hrCosts)}</span>
                      <div className="flex-1 h-4 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-400/80"
                          style={{ width: `${expPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10">Exp+HR</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 pt-1 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-400/80" />
              <span className="text-xs text-muted-foreground">Expenses + HR</span>
            </div>
          </div>
        </div>
      )}

      {/* Top / bottom callouts */}
      {sortedShops.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {top && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 p-5">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">Top performer</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{top.locationName}</p>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1">฿{fmtN(top.revenue)} revenue · {fmtPct(top.margin)} margin</p>
            </div>
          )}
          {bottom && bottom.locationId !== top?.locationId && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-5">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Needs attention</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{bottom.locationName}</p>
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">฿{fmtN(bottom.revenue)} revenue · {fmtPct(bottom.margin)} margin</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportsClient() {
  const [activeTab, setActiveTab] = useState<"operations" | "ceo">("operations");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (f: string, t: string, shops: string[], locs: { id: string; name: string }[]) => {
    setLoading(true);
    try {
      const locParam = shops.length === locs.length ? "all" : shops.join(",");
      const res = await fetch(`/api/reports/accounting?from=${f}&to=${t}&locations=${locParam}`);
      if (!res.ok) return;
      const json = await res.json() as AccountingData;
      setData(json);
      if (locs.length === 0 && json.locations.length > 0) {
        setLocations(json.locations);
        setSelectedShops(json.locations.map((l) => l.id));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchData(from, to, [], []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch on param changes (skip initial)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) { setInitialized(true); return; }
    void fetchData(from, to, selectedShops, locations);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, selectedShops]);

  return (
    <div className="flex flex-col gap-6 p-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Financial performance across all shops</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-md border border-border overflow-hidden text-xs w-fit">
        {(["operations", "ceo"] as const).map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 ${i > 0 ? "border-l border-border" : ""} ${
              activeTab === tab
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {tab === "operations" ? "Operations" : "CEO View"}
          </button>
        ))}
      </div>

      {/* Controls */}
      <Controls
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        locations={locations}
        selectedShops={selectedShops}
        onShopsChange={setSelectedShops}
      />

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading…
        </div>
      )}
      {!loading && !data && (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          No data
        </div>
      )}
      {!loading && data && (
        activeTab === "operations"
          ? <OperationsView data={data} />
          : <CeoView data={data} />
      )}
    </div>
  );
}
