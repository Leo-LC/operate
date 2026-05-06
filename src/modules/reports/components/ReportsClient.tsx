"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileTextIcon, PawPrintIcon, CalculatorIcon, CalendarDaysIcon, AlertTriangleIcon, CheckCircle2Icon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtB(n: number) {
  return `฿ ${fmt(n)}`;
}

type Summary = {
  period: { from: string; to: string };
  documents: { total: number; valid: number; expiring: number; expired: number; attention: number };
  animals: { total: number; active: number; attention: number };
  accounting: {
    salesNet: number; expenses: number; hrCosts: number; totalExpenses: number;
    netProfit: number; margin: number; daysWithEntries: number; daysInRange: number;
  };
};

function todayIso() { return new Date().toISOString().split("T")[0]; }
function firstOfMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}
function offsetDate(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function firstOfLastMonth() {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() - 1, 1);
  return d.toISOString().split("T")[0];
}
function lastOfLastMonth() {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth(), 0);
  return d.toISOString().split("T")[0];
}
function firstOfQuarter() {
  const n = new Date();
  const q = Math.floor(n.getMonth() / 3);
  return `${n.getFullYear()}-${String(q * 3 + 1).padStart(2, "0")}-01`;
}

const QUICK_PERIODS = [
  { label: "Today",      from: () => todayIso(),      to: () => todayIso() },
  { label: "This week",  from: () => { const n = new Date(); return offsetDate(n, -n.getDay()); }, to: () => todayIso() },
  { label: "This month", from: firstOfMonth,           to: todayIso },
  { label: "Last month", from: firstOfLastMonth,       to: lastOfLastMonth },
  { label: "This quarter", from: firstOfQuarter,       to: todayIso },
];

export function ReportsClient() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayIso());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async (f: string, t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/summary?from=${f}&to=${t}`);
      if (!res.ok) return;
      setSummary(await res.json() as Summary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSummary(from, to); }, [from, to, fetchSummary]);

  const { documents: docs, animals, accounting: acc } = summary ?? {
    documents: { total: 0, valid: 0, expiring: 0, expired: 0, attention: 0 },
    animals: { total: 0, active: 0, attention: 0 },
    accounting: { salesNet: 0, expenses: 0, hrCosts: 0, totalExpenses: 0, netProfit: 0, margin: 0, daysWithEntries: 0, daysInRange: 1 },
  };

  const docsAlert = docs.expired > 0 || docs.attention > 0;
  const animalsAlert = animals.attention > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header + period picker */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Reports</h1>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          />
          <div className="flex flex-wrap gap-1">
            {QUICK_PERIODS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { setFrom(p.from()); setTo(p.to()); }}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  from === p.from() && to === p.to()
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
      </div>

      {/* KPI banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Sales net" value={fmtB(acc.salesNet)} color="emerald" />
        <KpiCard label="Total expenses" value={fmtB(acc.totalExpenses)} color="amber" />
        <KpiCard
          label="Net profit"
          value={fmtB(acc.netProfit)}
          color={acc.netProfit >= 0 ? "emerald" : "red"}
          trend={acc.netProfit >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Net margin"
          value={`${acc.margin.toFixed(1)}%`}
          color={acc.margin >= 0 ? "emerald" : "red"}
          trend={acc.margin >= 15 ? "up" : acc.margin < 0 ? "down" : "neutral"}
        />
      </div>

      {/* Compliance + Operations grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Documents */}
        <Link
          href="/dashboard/documents"
          className={`group flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30 ${docsAlert ? "border-red-200 bg-red-50/40 dark:border-red-800/30 dark:bg-red-950/10" : "border-border bg-card"}`}
        >
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${docsAlert ? "bg-red-100 dark:bg-red-900/30" : "bg-purple-100 dark:bg-purple-900/30"}`}>
              <FileTextIcon className={`size-3.5 ${docsAlert ? "text-red-600 dark:text-red-400" : "text-purple-600 dark:text-purple-400"}`} />
            </div>
            <span className="text-xs font-semibold">Documents</span>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <StatLine label="Total" value={docs.total} />
            <StatLine label="Valid" value={docs.valid} />
            {docs.expiring > 0 && <StatLine label="Expiring soon" value={docs.expiring} variant="warn" />}
            {docs.expired > 0 && <StatLine label="Expired" value={docs.expired} variant="danger" />}
            {docs.attention > 0 && <StatLine label="Need attention" value={docs.attention} variant="danger" />}
          </div>
          {docsAlert
            ? <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400"><AlertTriangleIcon className="size-3" />Action required</div>
            : docs.total > 0 ? <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400"><CheckCircle2Icon className="size-3" />All in order</div>
            : null}
        </Link>

        {/* Animals */}
        <Link
          href="/dashboard/animals"
          className={`group flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30 ${animalsAlert ? "border-amber-200 bg-amber-50/40 dark:border-amber-800/30 dark:bg-amber-950/10" : "border-border bg-card"}`}
        >
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${animalsAlert ? "bg-amber-100 dark:bg-amber-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
              <PawPrintIcon className={`size-3.5 ${animalsAlert ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`} />
            </div>
            <span className="text-xs font-semibold">Animals</span>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <StatLine label="Total" value={animals.total} />
            <StatLine label="Active" value={animals.active} />
            {animals.attention > 0 && <StatLine label="Need attention" value={animals.attention} variant="warn" />}
          </div>
          {animalsAlert
            ? <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400"><AlertTriangleIcon className="size-3" />Sick / quarantine</div>
            : animals.total > 0 ? <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400"><CheckCircle2Icon className="size-3" />All healthy</div>
            : null}
        </Link>

        {/* Accounting */}
        <Link
          href="/dashboard/accounting"
          className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <CalculatorIcon className="size-3.5 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-xs font-semibold">Accounting</span>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <StatLine label="Sales net" value={fmtB(acc.salesNet)} />
            <StatLine label="Total expenses" value={fmtB(acc.totalExpenses)} />
            <StatLine label="Net profit" value={fmtB(acc.netProfit)} variant={acc.netProfit >= 0 ? "default" : "danger"} />
            <StatLine
              label="Coverage"
              value={`${acc.daysWithEntries}/${acc.daysInRange} days`}
              variant={acc.daysWithEntries < acc.daysInRange * 0.5 ? "warn" : "default"}
            />
          </div>
        </Link>

        {/* Schedules */}
        <Link
          href="/dashboard/scheduling"
          className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CalendarDaysIcon className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-semibold">Schedules</span>
          </div>
          <p className="text-xs text-muted-foreground">
            View shift schedules, employee assignments and weekly planning.
          </p>
        </Link>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, trend }: { label: string; value: string; color: string; trend?: "up" | "down" | "neutral" }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30",
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30",
    red: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30",
    default: "bg-card border-border",
  };
  const valueColors: Record<string, string> = {
    emerald: "text-emerald-700 dark:text-emerald-400",
    amber: "text-amber-700 dark:text-amber-400",
    red: "text-red-700 dark:text-red-400",
    default: "text-foreground",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[color] ?? colors.default}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <p className={`text-xl font-bold ${valueColors[color] ?? valueColors.default}`}>{value}</p>
        {trend === "up" && <TrendingUpIcon className="size-4 text-emerald-500 shrink-0" />}
        {trend === "down" && <TrendingDownIcon className="size-4 text-red-500 shrink-0" />}
      </div>
    </div>
  );
}

function StatLine({ label, value, variant = "default" }: { label: string; value: string | number; variant?: "default" | "warn" | "danger" | "muted" }) {
  const cls = variant === "danger" ? "text-red-600 dark:text-red-400 font-medium"
    : variant === "warn" ? "text-amber-600 dark:text-amber-400 font-medium"
    : variant === "muted" ? "text-muted-foreground/60"
    : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}
