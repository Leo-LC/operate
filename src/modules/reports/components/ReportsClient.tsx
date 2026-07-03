"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  WalletIcon,
  FileTextIcon,
  UsersIcon,
  PercentIcon,
  LockIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  BarChart3Icon,
  ActivityIcon,
  CreditCardIcon,
  ReceiptIcon,
  ClipboardListIcon,
  PercentCircleIcon,
} from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Stat } from "@/components/ui/stat";

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

interface DailyTotal {
  date: string;
  revenue: number;
}

interface MonthlyExpensesData {
  categories: { key: string; label: string }[];
  totals: Record<string, number>;
  entered: boolean;
}

interface AccountingData {
  period: { from: string; to: string };
  locations: { id: string; name: string }[];
  overview: ShopAgg;
  byShop: ShopAgg[];
  previousPeriod: { period: { from: string; to: string }; overview: ShopAgg };
  dailyTotals: DailyTotal[];
  monthlyExpenses: MonthlyExpensesData;
  completeness?: {
    totalExpected: number;
    totalFilled: number;
    percent: number;
    shopsIncomplete: string[];
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

function fmtN(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtMoney(n: number) {
  return n < 0 ? `(฿${fmtN(Math.abs(n))})` : `฿${fmtN(n)}`;
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function monthShortLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function pctChangeParts(curr: number, prev: number): { delta: string; dir: "up" | "down" | "neutral" } {
  if (!prev) return { delta: "—", dir: "neutral" };
  const change = ((curr - prev) / Math.abs(prev)) * 100;
  const dir = change > 0.05 ? "up" : change < -0.05 ? "down" : "neutral";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
  return { delta: `${arrow} ${Math.abs(change).toFixed(1)}%`, dir };
}

function ppChangeParts(curr: number, prev: number): { delta: string; dir: "up" | "down" | "neutral" } {
  const diff = curr - prev;
  const dir = diff > 0.05 ? "up" : diff < -0.05 ? "down" : "neutral";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
  return { delta: `${arrow} ${Math.abs(diff).toFixed(1)}pp`, dir };
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function countDaysInRange(fromStr: string, toStr: string): number {
  const d1 = new Date(fromStr);
  const d2 = new Date(toStr);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}
function daysInMonth(dateStr: string): number {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
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
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          height: 32, minWidth: 120, padding: "0 var(--s-3)",
          borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
          background: "var(--bg)", fontSize: 13, color: "var(--fg)",
          cursor: "pointer", transition: "background var(--dur) var(--ease)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        <ChevronDownIcon style={{ width: 13, height: 13, color: "var(--fg-4)", flexShrink: 0 }} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "absolute", left: 0, top: 36, zIndex: 20,
              minWidth: 160, borderRadius: "var(--r-md)", border: "1px solid var(--line)",
              background: "var(--surface)", boxShadow: "var(--shadow-2)",
              padding: "var(--s-1)", display: "flex", flexDirection: "column", gap: 2,
            }}
          >
            <label
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px var(--s-3)", borderRadius: "var(--r-sm)",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
            >
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              All shops
            </label>
            <div style={{ height: 1, background: "var(--line)", margin: "2px 0" }} />
            {locations.map((loc) => (
              <label
                key={loc.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px var(--s-3)", borderRadius: "var(--r-sm)",
                  fontSize: 13, cursor: "pointer",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
              >
                <input type="checkbox" checked={selected.includes(loc.id)} onChange={() => toggle(loc.id)} />
                {loc.name}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 64;
  const h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible", flexShrink: 0 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  deltaDir = "neutral",
  hint,
  icon,
  iconColor = "var(--bronze)",
  sparklineData,
  footer,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down" | "neutral";
  hint?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  sparklineData?: number[];
  footer?: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
        background: "var(--surface)", padding: "var(--s-5)",
        display: "flex", flexDirection: "column", gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <Stat label={label} value={value} delta={delta} deltaDir={deltaDir} hint={hint} icon={icon} iconColor={iconColor} />
        {sparklineData && sparklineData.length >= 2 && <Sparkline data={sparklineData} color={iconColor} />}
      </div>
      {footer}
    </div>
  );
}

// ── Section card + header ─────────────────────────────────────────────────────

function SectionHeader({ label, bg, color, icon }: { label: string; bg: string; color: string; icon?: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px var(--s-5)", borderBottom: "1px solid var(--line)",
        background: bg, display: "flex", alignItems: "center", gap: 8,
      }}
    >
      {icon && <span style={{ color, display: "inline-flex" }}>{icon}</span>}
      <h3 className="eyebrow" style={{ color, margin: 0 }}>{label}</h3>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
        background: "var(--surface)", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

// ── Bar list row (used by Revenue Mix / Cost Drivers / HR Breakdown / Payments) ──

function MetricBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ height: 4, borderRadius: 9999, background: "var(--bg-2)", overflow: "hidden", position: "relative" }}>
      <div
        style={{
          position: "absolute", top: 0, left: 0,
          width: `${pct}%`, height: "100%", borderRadius: 9999,
          background: color, transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function BarListRow({
  index,
  label,
  amount,
  pctOfTotal,
  color,
}: {
  index: number;
  label: string;
  amount: number;
  pctOfTotal: number;
  color: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "18px 1fr 96px 56px", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>{index}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: "var(--fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <MetricBar value={pctOfTotal} max={100} color={color} />
      </div>
      <span className="mono" style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(amount)}</span>
      <span style={{ textAlign: "right", fontSize: 12, color: "var(--fg-4)" }}>{fmtPct(pctOfTotal)}</span>
    </div>
  );
}

function BarListHeader() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "18px 1fr 96px 56px", gap: 10, paddingBottom: 4, borderBottom: "1px solid var(--line)" }}>
      <span />
      <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-4)" }}>Category</span>
      <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-4)", textAlign: "right" }}>Amount</span>
      <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-4)", textAlign: "right" }}>% of sales</span>
    </div>
  );
}

// ── Rule-based insights ───────────────────────────────────────────────────────

interface NeedsActionItem { label: string; tone: "bad" | "warn" | "info" }

function computeNeedsAction(
  o: ShopAgg,
  monthlyExpenses: MonthlyExpensesData,
  completeness: AccountingData["completeness"]
): NeedsActionItem[] {
  const items: NeedsActionItem[] = [];

  if (o.closingCashSafe < 0) {
    items.push({ label: `Closing cash safe is negative (${fmtMoney(o.closingCashSafe)})`, tone: "bad" });
  }
  if (!monthlyExpenses.entered) {
    items.push({ label: "Monthly expenses not entered", tone: "warn" });
  }
  if (o.cashToBoss > 0) {
    items.push({ label: `Verify cash sent to boss (฿${fmtN(o.cashToBoss)})`, tone: "info" });
  }
  const otherExp = o.expOtherCash + o.expOtherBank;
  if (o.revenue > 0 && otherExp / o.revenue > 0.05) {
    items.push({ label: `High "Other" expense (฿${fmtN(otherExp)})`, tone: "warn" });
  }
  if (completeness && completeness.percent < 100) {
    items.push({ label: `Enter missing daily entries (${completeness.percent}% complete)`, tone: "warn" });
  }

  return items;
}

function computeManagementNotes(o: ShopAgg): string[] {
  const notes: string[] = [];
  if (o.revenue <= 0) return notes;

  const cats = [
    { label: "Ticket sales", value: o.tickets },
    { label: "Drink sales", value: o.drinks },
    { label: "Snack sales", value: o.snacks },
    { label: "Goodies sales", value: o.goodies },
  ];
  const top = [...cats].sort((a, b) => b.value - a.value)[0];
  if (top.value > 0) {
    notes.push(`${top.label} drive ${fmtPct((top.value / o.revenue) * 100)} of total revenue.`);
  }

  const hrPct = (o.hrCosts / o.revenue) * 100;
  notes.push(
    hrPct <= 30
      ? `HR ratio (${fmtPct(hrPct)}) is in a healthy range.`
      : `HR ratio (${fmtPct(hrPct)}) is above target — review staffing costs.`
  );

  const secondaryPct = cats.filter((c) => c.label !== top.label).reduce((s, c) => s + c.value, 0) / o.revenue * 100;
  if (secondaryPct < 25) {
    notes.push("Secondary categories remain a smaller share of revenue — opportunity to grow.");
  }

  return notes.slice(0, 3);
}

// ── Controls bar ─────────────────────────────────────────────────────────────

function monthPickerValue(from: string): string {
  return from.slice(0, 7);
}

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
  function selectMonth(y: number, m: number) {
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const last = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    onFromChange(first);
    onToChange(last);
  }

  const [pickerYear, pickerMonth] = monthPickerValue(from).split("-").map(Number);
  const monthName = new Date(pickerYear, pickerMonth - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });

  function prevMonth() {
    if (pickerMonth === 1) selectMonth(pickerYear - 1, 12);
    else selectMonth(pickerYear, pickerMonth - 1);
  }

  function nextMonth() {
    if (pickerMonth === 12) selectMonth(pickerYear + 1, 1);
    else selectMonth(pickerYear, pickerMonth + 1);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--s-2)" }}>
      <Button variant="secondary" size="sm" onClick={() => { onFromChange(today()); onToChange(today()); }}>
        Today
      </Button>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <button
          type="button"
          onClick={prevMonth}
          style={{
            width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
            borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--surface)",
            color: "var(--fg-3)", cursor: "pointer",
          }}
        >
          <ChevronLeftIcon size={14} />
        </button>
        <span
          className="mono tabular-nums"
          style={{ fontSize: 13, fontWeight: 500, width: 140, textAlign: "center", color: "var(--fg)" }}
        >
          {monthName}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          style={{
            width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
            borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--surface)",
            color: "var(--fg-3)", cursor: "pointer",
          }}
        >
          <ChevronRightIcon size={14} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
        <DateInput value={from} onChange={(e) => onFromChange(e.target.value)} />
        <span style={{ fontSize: 12, color: "var(--fg-4)" }}>–</span>
        <DateInput value={to} onChange={(e) => onToChange(e.target.value)} />
      </div>
      {locations.length > 0 && (
        <ShopSelector locations={locations} selected={selectedShops} onChange={onShopsChange} />
      )}
    </div>
  );
}

// ── Performance Metrics ───────────────────────────────────────────────────────

interface MetricDef {
  key: string;
  label: string;
  getValue: (s: ShopAgg) => number | null;
  color: (ratio: number) => string;
  target: string;
  barMax: number;
  lowerIsBetter?: boolean;
}

const PERF_METRICS: MetricDef[] = [
  {
    key: "goodies",
    label: "% Goodies",
    getValue: (s) => s.revenue > 0 ? (s.goodies / s.revenue) * 100 : null,
    color: (v) => v >= 9 ? "var(--good)" : v >= 8 ? "var(--good)" : v >= 7 ? "var(--warn)" : "var(--bad)",
    target: "target ≥ 7%",
    barMax: 12,
  },
  {
    key: "opex",
    label: "Opex variable",
    getValue: (s) => s.revenue > 0 ? (s.expenses / s.revenue) * 100 : null,
    color: (v) => v < 9.5 ? "var(--good)" : v < 12 ? "var(--warn)" : "var(--bad)",
    target: "target < 9.5%",
    barMax: 20,
    lowerIsBetter: true,
  },
  {
    key: "drinks",
    label: "% Drinks",
    getValue: (s) => s.revenue > 0 ? (s.drinks / s.revenue) * 100 : null,
    color: () => "var(--info)",
    target: "of revenue",
    barMax: 100,
  },
  {
    key: "snacks",
    label: "% Snacks rev.",
    getValue: (s) => s.revenue > 0 ? (s.snacks / s.revenue) * 100 : null,
    color: () => "var(--info)",
    target: "of revenue",
    barMax: 30,
  },
];

function PerformanceMetrics({ shops }: { shops: ShopAgg[] }) {
  const activeShops = shops.filter((s) => s.revenue > 0);
  if (activeShops.length === 0) return null;

  return (
    <Card>
      <SectionHeader label="Performance metrics" bg="var(--bronze-soft)" color="var(--bronze-2)" />
      <div style={{ overflowX: "auto" }}>
        <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-2)" }}>
              <th style={{ padding: "8px var(--s-5)", textAlign: "left", color: "var(--fg-3)", fontWeight: 500, borderTop: "1px solid var(--line)", minWidth: 120 }}>
                Metric
              </th>
              {activeShops.map((s) => (
                <th
                  key={s.locationId}
                  style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontWeight: 500, borderTop: "1px solid var(--line)", whiteSpace: "nowrap", minWidth: 110 }}
                >
                  {s.locationName.replace(/^Capybara Coffee\s*/i, "").trim() || s.locationName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERF_METRICS.map((metric) => (
              <tr
                key={metric.key}
                style={{ borderTop: "1px solid var(--line)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
              >
                <td style={{ padding: "10px var(--s-5)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 500, color: "var(--fg)" }}>{metric.label}</span>
                    <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{metric.target}</span>
                  </div>
                </td>
                {activeShops.map((s) => {
                  const val = metric.getValue(s);
                  if (val === null) {
                    return (
                      <td key={s.locationId} style={{ padding: "10px var(--s-5)", textAlign: "right", color: "var(--fg-4)" }}>—</td>
                    );
                  }
                  const color = metric.color(val);
                  return (
                    <td key={s.locationId} style={{ padding: "10px var(--s-5)", textAlign: "right" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span className="mono" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color }}>{fmtPct(val)}</span>
                        <MetricBar value={val} max={metric.barMax} color={color} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Operations Tab ────────────────────────────────────────────────────────────

function OperationsView({ data }: { data: AccountingData }) {
  const { overview: o, byShop, completeness, previousPeriod, dailyTotals, monthlyExpenses } = data;
  const p = previousPeriod.overview;
  const prevMonthName = monthShortLabel(previousPeriod.period.to);

  const totalPayments = o.cash + o.scan + o.creditCard;
  function paymentPct(n: number) {
    return totalPayments > 0 ? (n / totalPayments) * 100 : 0;
  }

  const sortedShops = [...byShop].sort((a, b) => b.revenue - a.revenue);

  // ── KPI derived values ──────────────────────────────────────────────────────
  const netAfterExpenses = o.revenue - o.expenses;
  const prevNetAfterExpenses = p.revenue - p.expenses;
  const hrPctOfSales = o.revenue > 0 ? (o.hrCosts / o.revenue) * 100 : 0;
  const prevHrPctOfSales = p.revenue > 0 ? (p.hrCosts / p.revenue) * 100 : 0;

  const revenueDelta = pctChangeParts(o.revenue, p.revenue);
  const netAfterExpDelta = pctChangeParts(netAfterExpenses, prevNetAfterExpenses);
  const netAfterHrDelta = pctChangeParts(o.netProfit, p.netProfit);
  const hrPctDelta = ppChangeParts(hrPctOfSales, prevHrPctOfSales);

  const dailySeries = dailyTotals.map((d) => d.revenue);

  // ── Needs action / management notes ─────────────────────────────────────────
  const needsAction = computeNeedsAction(o, monthlyExpenses, completeness);
  const managementNotes = computeManagementNotes(o);
  const allGood = needsAction.length === 0 && (!completeness || completeness.percent >= 100);

  // ── Daily rhythm ─────────────────────────────────────────────────────────────
  const activeDays = dailyTotals.filter((d) => d.revenue > 0);
  const elapsedDays = countDaysInRange(data.period.from, data.period.to);
  const avgPerDay = elapsedDays > 0 ? o.revenue / elapsedDays : 0;
  const bestDay = activeDays.length > 0 ? [...activeDays].sort((a, b) => b.revenue - a.revenue)[0] : null;
  const worstDay = activeDays.length > 0 ? [...activeDays].sort((a, b) => a.revenue - b.revenue)[0] : null;
  const projectedFullMonth = avgPerDay * daysInMonth(data.period.to);
  const monthPace = p.revenue > 0 ? (projectedFullMonth / p.revenue) * 100 : null;

  // ── Revenue mix / cost drivers / HR breakdown rows ──────────────────────────
  const revenueRows = [
    { label: "Sales drinks net", value: o.drinks },
    { label: "Sales ticket net", value: o.tickets },
    { label: "Sales snack net", value: o.snacks },
    { label: "Sales goodies net", value: o.goodies },
    { label: "Sales card surcharge", value: o.surcharge },
  ].filter((r) => r.value !== 0).sort((a, b) => b.value - a.value);

  const costRows = [
    { label: "Staff food cash", value: o.expStaffFoodCash },
    { label: "Drinks cash", value: o.expDrinksCash },
    { label: "Goodies cash", value: o.expGoodiesCash },
    { label: "Animals cash", value: o.expAnimalsCash },
    { label: "Supply cash", value: o.expSupplyCash },
    { label: "Other cash", value: o.expOtherCash },
    { label: "Makro bank", value: o.expMakroBank },
    { label: "Other bank", value: o.expOtherBank },
  ].filter((r) => r.value !== 0).sort((a, b) => b.value - a.value);
  const totalOpex = costRows.reduce((s, r) => s + r.value, 0);

  const hrRows = [
    { label: "Salary (cash + bank)", value: o.hrSalaryCash },
    { label: "Service charge (cash)", value: o.hrServiceChargeCash },
    { label: "Challenge (cash)", value: o.hrChallengeCash },
  ].filter((r) => r.value !== 0).sort((a, b) => b.value - a.value);

  const grandTotalCosts = o.expenses + o.hrCosts;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      {/* Status banner */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
          gap: 12, padding: "10px 16px", borderRadius: "var(--r-md)",
          border: `1px solid ${allGood ? "var(--good)" : "var(--warn)"}`,
          background: allGood ? "var(--good-soft)" : "var(--warn-soft)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill tone={allGood ? "good" : "warn"} dot>{allGood ? "All data looks good" : "Needs attention"}</Pill>
          <span style={{ fontSize: 13, color: allGood ? "var(--good)" : "var(--warn)" }}>
            {allGood
              ? `All key data has been entered for this period.`
              : `${needsAction.length} item${needsAction.length === 1 ? "" : "s"} need${needsAction.length === 1 ? "s" : ""} attention.`}
          </span>
        </div>
        {completeness && (
          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>
            Data as of {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {completeness.percent}% complete
          </span>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <KpiCard
          label="Total Sales Net"
          value={`฿${fmtN(o.revenue)}`}
          delta={revenueDelta.delta}
          deltaDir={revenueDelta.dir}
          hint={`vs ${prevMonthName}`}
          icon={<WalletIcon style={{ width: 17, height: 17 }} />}
          iconColor="var(--good)"
          sparklineData={dailySeries}
        />
        <KpiCard
          label="Net After Expenses"
          value={`฿${fmtN(netAfterExpenses)}`}
          delta={netAfterExpDelta.delta}
          deltaDir={netAfterExpDelta.dir}
          hint={`vs ${prevMonthName}`}
          icon={<FileTextIcon style={{ width: 17, height: 17 }} />}
          iconColor="var(--info)"
          sparklineData={dailySeries}
        />
        <KpiCard
          label="Net After HR"
          value={`฿${fmtN(o.netProfit)}`}
          delta={netAfterHrDelta.delta}
          deltaDir={netAfterHrDelta.dir}
          hint={`vs ${prevMonthName}`}
          icon={<UsersIcon style={{ width: 17, height: 17 }} />}
          iconColor="var(--purple)"
          sparklineData={dailySeries}
        />
        <KpiCard
          label="HR % of Sales"
          value={fmtPct(hrPctOfSales)}
          delta={hrPctDelta.delta}
          deltaDir={hrPctDelta.dir}
          hint={`vs ${prevMonthName}`}
          icon={<PercentIcon style={{ width: 17, height: 17 }} />}
          iconColor="var(--warn)"
        />
        <KpiCard
          label="Closing Cash Safe"
          value={fmtMoney(o.closingCashSafe)}
          icon={<LockIcon style={{ width: 17, height: 17 }} />}
          iconColor={o.closingCashSafe < 0 ? "var(--bad)" : "var(--good)"}
          footer={
            <Pill tone={o.closingCashSafe < 0 ? "bad" : "good"} size="sm">
              {o.closingCashSafe < 0 ? "Needs attention" : "Healthy"}
            </Pill>
          }
        />
      </div>

      {/* Revenue Mix + Cost Drivers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <SectionHeader label="Revenue Mix" bg="var(--good-soft)" color="var(--good)" icon={<BarChart3Icon style={{ width: 14, height: 14 }} />} />
          <div style={{ padding: "var(--s-4) var(--s-5)" }}>
            <BarListHeader />
            {revenueRows.map((r, i) => (
              <BarListRow key={r.label} index={i + 1} label={r.label} amount={r.value} pctOfTotal={o.revenue > 0 ? (r.value / o.revenue) * 100 : 0} color="var(--good)" />
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTop: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--good)" }}>Total Sales Net</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--good)" }}>฿{fmtN(o.revenue)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader label="Cost Drivers (Operating Expenses)" bg="var(--warn-soft)" color="var(--warn)" icon={<ReceiptIcon style={{ width: 14, height: 14 }} />} />
          <div style={{ padding: "var(--s-4) var(--s-5)" }}>
            <BarListHeader />
            {costRows.map((r, i) => (
              <BarListRow key={r.label} index={i + 1} label={r.label} amount={r.value} pctOfTotal={o.revenue > 0 ? (r.value / o.revenue) * 100 : 0} color="var(--warn)" />
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTop: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--warn)" }}>Total Operating Expenses</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--warn)" }}>฿{fmtN(totalOpex)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* HR Breakdown + Needs Action */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <SectionHeader label="HR Breakdown" bg="var(--purple-soft)" color="var(--purple)" icon={<UsersIcon style={{ width: 14, height: 14 }} />} />
          <div style={{ padding: "var(--s-4) var(--s-5)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "18px 1fr 96px 56px", gap: 10, paddingBottom: 4, borderBottom: "1px solid var(--line)" }}>
              <span />
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-4)" }}>Item</span>
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-4)", textAlign: "right" }}>Amount</span>
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-4)", textAlign: "right" }}>% of HR</span>
            </div>
            {hrRows.map((r, i) => (
              <BarListRow key={r.label} index={i + 1} label={r.label} amount={r.value} pctOfTotal={o.hrCosts > 0 ? (r.value / o.hrCosts) * 100 : 0} color="var(--purple)" />
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTop: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--purple)" }}>Total HR Cost</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--purple)" }}>฿{fmtN(o.hrCosts)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader label="Needs Action" bg="var(--bad-soft)" color="var(--bad)" icon={<AlertTriangleIcon style={{ width: 14, height: 14 }} />} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {needsAction.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fg-4)", padding: "var(--s-4) var(--s-5)" }}>Nothing needs attention right now.</p>
            ) : (
              needsAction.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                    padding: "10px var(--s-5)", borderTop: i === 0 ? "none" : "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        width: 6, height: 6, borderRadius: "var(--r-pill)", flexShrink: 0,
                        background: item.tone === "bad" ? "var(--bad)" : item.tone === "warn" ? "var(--warn)" : "var(--info)",
                      }}
                    />
                    <span style={{ fontSize: 13, color: "var(--fg-2)" }}>{item.label}</span>
                  </div>
                  <ChevronRightIcon style={{ width: 14, height: 14, color: "var(--fg-4)", flexShrink: 0 }} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Daily Rhythm + Management Notes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <SectionHeader label="Daily Rhythm" bg="var(--bg-2)" color="var(--fg-3)" icon={<ActivityIcon style={{ width: 14, height: 14 }} />} />
          <div style={{ padding: "var(--s-4) var(--s-5)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--s-4)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Avg / Day</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>฿{fmtN(avgPerDay)}</span>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>vs {prevMonthName} ฿{fmtN(elapsedDays > 0 ? p.revenue / Math.max(1, countDaysInRange(previousPeriod.period.from, previousPeriod.period.to)) : 0)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Best Day</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--good)" }}>{bestDay ? `฿${fmtN(bestDay.revenue)}` : "—"}</span>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{bestDay ? dayLabel(bestDay.date) : ""}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Worst Day</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--bad)" }}>{worstDay ? `฿${fmtN(worstDay.revenue)}` : "—"}</span>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{worstDay ? dayLabel(worstDay.date) : ""}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Month Pace</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{monthPace !== null ? `${monthPace.toFixed(0)}%` : "—"}</span>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>vs {prevMonthName}</span>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader label="Management Notes" bg="var(--bronze-soft)" color="var(--bronze-2)" icon={<LightbulbIcon style={{ width: 14, height: 14 }} />} />
          <div style={{ padding: "var(--s-4) var(--s-5)", display: "flex", flexDirection: "column", gap: 8 }}>
            {managementNotes.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fg-4)" }}>Not enough data yet to generate notes.</p>
            ) : (
              managementNotes.map((note, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: "var(--bronze)", flexShrink: 0, lineHeight: "20px" }}>○</span>
                  <span style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: "20px" }}>{note}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <SectionHeader label="Payment Methods" bg="var(--info-soft)" color="var(--info)" icon={<CreditCardIcon style={{ width: 14, height: 14 }} />} />
        <div style={{ padding: "var(--s-4) var(--s-5)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "18px 1fr 96px 56px", gap: 10, paddingBottom: 4, borderBottom: "1px solid var(--line)" }}>
            <span />
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-4)" }}>Type</span>
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-4)", textAlign: "right" }}>Amount</span>
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-4)", textAlign: "right" }}>% of sales</span>
          </div>
          {[
            { label: "Cash", value: o.cash },
            { label: "Scan / QR", value: o.scan },
            { label: "Credit Card", value: o.creditCard },
          ].map((row, i) => (
            <BarListRow key={row.label} index={i + 1} label={row.label} amount={row.value} pctOfTotal={paymentPct(row.value)} color="var(--info)" />
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--info)" }}>Total Payments</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--info)" }}>฿{fmtN(totalPayments)}</span>
          </div>
        </div>
      </Card>

      {/* Monthly Expenses + HR Ratios & Pending */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <SectionHeader label="Monthly Expenses" bg="var(--bronze-soft)" color="var(--bronze-2)" icon={<ClipboardListIcon style={{ width: 14, height: 14 }} />} />
          <div style={{ overflowX: "auto" }}>
            <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-2)" }}>
                  <th style={{ padding: "8px var(--s-5)", textAlign: "left", color: "var(--fg-3)", fontWeight: 500 }}>Item</th>
                  <th style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontWeight: 500 }}>Amount (THB)</th>
                  <th style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontWeight: 500 }}>% of Monthly Exp.</th>
                  <th style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyExpenses.categories.map((cat) => {
                  const val = monthlyExpenses.totals[cat.key] ?? 0;
                  const total = Object.values(monthlyExpenses.totals).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={cat.key} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "8px var(--s-5)", color: "var(--fg-3)" }}>Expense {cat.label}</td>
                      <td className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right" }}>{val > 0 ? fmtN(val) : "–"}</td>
                      <td className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right" }}>{total > 0 && val > 0 ? fmtPct((val / total) * 100) : "0.00%"}</td>
                      <td style={{ padding: "8px var(--s-5)", textAlign: "right" }}>
                        <Pill tone={val > 0 ? "good" : "bad"} size="sm">{val > 0 ? "Entered" : "Not entered"}</Pill>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: "var(--bronze-soft)", borderTop: "2px solid var(--line)" }}>
                  <td style={{ padding: "8px var(--s-5)", fontWeight: 600, color: "var(--bronze)" }}>Total Monthly Expenses</td>
                  <td className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right", fontWeight: 700, color: "var(--bronze)" }}>
                    {fmtN(Object.values(monthlyExpenses.totals).reduce((s, v) => s + v, 0))}
                  </td>
                  <td style={{ padding: "8px var(--s-5)", textAlign: "right" }} />
                  <td style={{ padding: "8px var(--s-5)", textAlign: "right" }}>
                    <Pill tone={monthlyExpenses.entered ? "good" : "bad"} size="sm">{monthlyExpenses.entered ? "Entered" : "Not entered"}</Pill>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionHeader label="HR Ratios & Pending" bg="var(--bg-2)" color="var(--fg-3)" icon={<PercentCircleIcon style={{ width: 14, height: 14 }} />} />
          <div style={{ overflowX: "auto" }}>
            <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-2)" }}>
                  <th style={{ padding: "8px var(--s-5)", textAlign: "left", color: "var(--fg-3)", fontWeight: 500 }}>Metric</th>
                  <th style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontWeight: 500 }}>Value</th>
                  <th style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontWeight: 500 }}>Context</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "% HR / Sales", value: fmtPct(hrPctOfSales), context: hrPctOfSales <= 30 ? "Healthy range" : "Above target" },
                  { label: "Net After Expenses", value: `฿${fmtN(netAfterExpenses)}`, context: "Before HR deduction" },
                  { label: "Net After Exp. + HR", value: `฿${fmtN(o.netProfit)}`, context: "Post payroll result" },
                  { label: "Cash to Boss", value: `฿${fmtN(o.cashToBoss)}`, context: "Cash sent to boss this period" },
                  { label: "Closing Cash Safe", value: fmtMoney(o.closingCashSafe), context: o.closingCashSafe < 0 ? "Negative balance" : "Positive balance" },
                ].map((row) => (
                  <tr key={row.label} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px var(--s-5)", color: "var(--fg-3)" }}>{row.label}</td>
                    <td className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right", fontWeight: 500 }}>{row.value}</td>
                    <td style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-4)" }}>{row.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* VAT & Total Costs */}
      <Card>
        <SectionHeader label="VAT & Total Costs" bg="var(--bronze-soft)" color="var(--bronze-2)" icon={<ReceiptIcon style={{ width: 14, height: 14 }} />} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-2)" }}>
                <th style={{ padding: "8px var(--s-5)", textAlign: "left", color: "var(--fg-3)", fontWeight: 500 }}>Metric</th>
                <th style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontWeight: 500 }}>Amount (THB)</th>
                <th style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontWeight: 500 }}>% of Sales</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "8px var(--s-5)", color: "var(--fg-3)" }}>Total VAT</td>
                <td className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right" }}>{fmtN(o.vat)}</td>
                <td style={{ padding: "8px var(--s-5)", textAlign: "right" }}>{o.revenue > 0 ? fmtPct((o.vat / o.revenue) * 100) : "—"}</td>
              </tr>
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "8px var(--s-5)", color: "var(--fg-3)" }}>Grand Total Costs</td>
                <td className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right" }}>{fmtN(grandTotalCosts)}</td>
                <td style={{ padding: "8px var(--s-5)", textAlign: "right" }}>{o.revenue > 0 ? fmtPct((grandTotalCosts / o.revenue) * 100) : "—"}</td>
              </tr>
              <tr style={{ background: "var(--bronze-soft)", borderTop: "2px solid var(--line)" }}>
                <td style={{ padding: "8px var(--s-5)", fontWeight: 600, color: "var(--bronze)" }}>Total Sales Net</td>
                <td className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right", fontWeight: 700, color: "var(--bronze)" }}>{fmtN(o.revenue)}</td>
                <td style={{ padding: "8px var(--s-5)", textAlign: "right", fontWeight: 700, color: "var(--bronze)" }}>100.00%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Per-shop comparison (kept from previous layout — not part of reference image but useful) */}
      {sortedShops.length > 1 && (
        <Card>
          <SectionHeader label="Per-shop comparison" bg="var(--bg-2)" color="var(--fg-3)" />
          <div style={{ overflowX: "auto" }}>
            <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-2)" }}>
                  {["Shop", "Revenue", "Expenses", "HR", "Net Profit", "Margin"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px var(--s-5)", textAlign: i === 0 ? "left" : "right",
                        color: "var(--fg-3)", fontWeight: 500, borderTop: "1px solid var(--line)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedShops.map((s) => (
                  <tr
                    key={s.locationId}
                    style={{ borderTop: "1px solid var(--line)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                  >
                    <td style={{ padding: "10px var(--s-5)", fontWeight: 500 }}>{s.locationName}</td>
                    <td className="mono" style={{ padding: "10px var(--s-5)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>฿{fmtN(s.revenue)}</td>
                    <td className="mono" style={{ padding: "10px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontVariantNumeric: "tabular-nums" }}>฿{fmtN(s.expenses)}</td>
                    <td className="mono" style={{ padding: "10px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontVariantNumeric: "tabular-nums" }}>฿{fmtN(s.hrCosts)}</td>
                    <td className="mono" style={{ padding: "10px var(--s-5)", textAlign: "right", fontWeight: 500, color: s.netProfit >= 0 ? "var(--good)" : "var(--bad)", fontVariantNumeric: "tabular-nums" }}>
                      ฿{fmtN(s.netProfit)}
                    </td>
                    <td style={{ padding: "10px var(--s-5)", textAlign: "right" }}>
                      <Pill tone={s.margin >= 20 ? "good" : s.margin >= 0 ? "neutral" : "bad"} size="sm">
                        {fmtPct(s.margin)}
                      </Pill>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "var(--bronze-soft)", borderTop: "2px solid var(--line)" }}>
                  <td style={{ padding: "10px var(--s-5)", fontWeight: 600, color: "var(--bronze)" }}>Total</td>
                  <td className="mono" style={{ padding: "10px var(--s-5)", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--bronze)" }}>฿{fmtN(o.revenue)}</td>
                  <td className="mono" style={{ padding: "10px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontVariantNumeric: "tabular-nums" }}>฿{fmtN(o.expenses)}</td>
                  <td className="mono" style={{ padding: "10px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontVariantNumeric: "tabular-nums" }}>฿{fmtN(o.hrCosts)}</td>
                  <td className="mono" style={{ padding: "10px var(--s-5)", textAlign: "right", fontWeight: 700, color: o.netProfit >= 0 ? "var(--good)" : "var(--bad)", fontVariantNumeric: "tabular-nums" }}>
                    ฿{fmtN(o.netProfit)}
                  </td>
                  <td style={{ padding: "10px var(--s-5)", textAlign: "right" }}>
                    <Pill tone={o.margin >= 20 ? "good" : o.margin >= 0 ? "neutral" : "bad"} size="sm">
                      {fmtPct(o.margin)}
                    </Pill>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Performance metrics */}
      {sortedShops.some((s) => s.revenue > 0) && (
        <PerformanceMetrics shops={sortedShops} />
      )}
    </div>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────────

function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "md";
}) {
  const sz = size === "sm" ? { h: 28, f: 12, p: "0 10px" } : { h: 32, f: 13, p: "0 14px" };
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        padding: 3,
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: sz.h - 6,
              padding: sz.p,
              fontSize: sz.f,
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--fg)" : "var(--fg-3)",
              fontWeight: active ? 500 : 400,
              border: active ? "1px solid var(--line)" : "1px solid transparent",
              borderRadius: "var(--r-sm)",
              boxShadow: active ? "var(--shadow-1)" : "none",
              cursor: "pointer",
              transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)",
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MetricToggle({
  label,
  color,
  active,
  onChange,
}: {
  label: string;
  color: string;
  active: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
        padding: "0 10px",
        fontSize: 12,
        borderRadius: "var(--r-sm)",
        border: `1px solid ${active ? "var(--line)" : "transparent"}`,
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--fg)" : "var(--fg-4)",
        cursor: "pointer",
        opacity: active ? 1 : 0.65,
        transition: "opacity var(--dur) var(--ease), background var(--dur) var(--ease)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "var(--r-pill)",
          background: color,
          opacity: active ? 1 : 0.35,
        }}
      />
      {label}
    </button>
  );
}

// ── By Shop comparison modes ──────────────────────────────────────────────────

type ShopCompareMode =
  | "rev-vs-costs"
  | "rev-vs-opex"
  | "rev-vs-hr"
  | "cost-split"
  | "revenue-mix"
  | "payments"
  | "net-profit";

interface ShopMetricDef {
  key: string;
  label: string;
  shortLabel: string;
  color: string;
  opacity?: number;
  getValue: (s: ShopAgg) => number;
}

interface ShopCompareConfig {
  id: ShopCompareMode;
  label: string;
  title: string;
  metrics: ShopMetricDef[];
  sortBy: (s: ShopAgg) => number;
  shareLabel?: (s: ShopAgg, overview: ShopAgg) => string;
  badge?: (s: ShopAgg) => { text: string; color: string };
  toggleable?: boolean;
}

const SHOP_COMPARE_MODES: ShopCompareConfig[] = [
  {
    id: "rev-vs-costs",
    label: "Rev vs costs",
    title: "Revenue vs. expenses by shop",
    sortBy: (s) => s.revenue,
    shareLabel: (s, o) => (o.revenue > 0 ? `${fmtPct((s.revenue / o.revenue) * 100)} of revenue` : "—"),
    badge: (s) => ({
      text: `${s.netProfit >= 0 ? "+" : ""}฿${fmtN(s.netProfit)}`,
      color: s.netProfit >= 0 ? "var(--good)" : "var(--bad)",
    }),
    metrics: [
      { key: "revenue", label: "Revenue", shortLabel: "Rev", color: "var(--good)", opacity: 0.7, getValue: (s) => s.revenue },
      { key: "exp-hr", label: "Expenses + HR", shortLabel: "Exp+HR", color: "var(--bad)", opacity: 0.6, getValue: (s) => s.expenses + s.hrCosts },
    ],
  },
  {
    id: "rev-vs-opex",
    label: "Rev vs opex",
    title: "Revenue vs. operating expenses by shop",
    sortBy: (s) => s.revenue,
    shareLabel: (s, o) => (o.revenue > 0 ? `${fmtPct((s.revenue / o.revenue) * 100)} of revenue` : "—"),
    badge: (s) => ({
      text: `${s.revenue - s.expenses >= 0 ? "+" : ""}฿${fmtN(s.revenue - s.expenses)}`,
      color: s.revenue - s.expenses >= 0 ? "var(--good)" : "var(--bad)",
    }),
    metrics: [
      { key: "revenue", label: "Revenue", shortLabel: "Rev", color: "var(--good)", opacity: 0.7, getValue: (s) => s.revenue },
      { key: "expenses", label: "Operating expenses", shortLabel: "Opex", color: "var(--warn)", opacity: 0.7, getValue: (s) => s.expenses },
    ],
  },
  {
    id: "rev-vs-hr",
    label: "Rev vs HR",
    title: "Revenue vs. HR costs by shop",
    sortBy: (s) => s.revenue,
    shareLabel: (s, o) => (o.revenue > 0 ? `${fmtPct((s.hrCosts / o.revenue) * 100)} HR load` : "—"),
    badge: (s) => ({
      text: fmtPct(s.revenue > 0 ? (s.hrCosts / s.revenue) * 100 : 0),
      color: s.revenue > 0 && s.hrCosts / s.revenue > 0.15 ? "var(--warn)" : "var(--fg-3)",
    }),
    metrics: [
      { key: "revenue", label: "Revenue", shortLabel: "Rev", color: "var(--good)", opacity: 0.7, getValue: (s) => s.revenue },
      { key: "hr", label: "HR costs", shortLabel: "HR", color: "var(--info)", opacity: 0.7, getValue: (s) => s.hrCosts },
    ],
  },
  {
    id: "cost-split",
    label: "Cost split",
    title: "Operating vs. HR costs by shop",
    sortBy: (s) => s.expenses + s.hrCosts,
    shareLabel: (s) => `฿${fmtN(s.expenses + s.hrCosts)} total costs`,
    badge: (s) => ({
      text: fmtPct(s.revenue > 0 ? ((s.expenses + s.hrCosts) / s.revenue) * 100 : 0),
      color: "var(--fg-3)",
    }),
    metrics: [
      { key: "expenses", label: "Operating expenses", shortLabel: "Opex", color: "var(--warn)", opacity: 0.7, getValue: (s) => s.expenses },
      { key: "hr", label: "HR costs", shortLabel: "HR", color: "var(--info)", opacity: 0.7, getValue: (s) => s.hrCosts },
    ],
  },
  {
    id: "revenue-mix",
    label: "Revenue mix",
    title: "Revenue mix by shop",
    sortBy: (s) => s.revenue,
    shareLabel: (s) => `฿${fmtN(s.revenue)} total`,
    badge: (s) => ({
      text: fmtPct(s.margin),
      color: s.margin >= 20 ? "var(--good)" : s.margin >= 0 ? "var(--fg-3)" : "var(--bad)",
    }),
    toggleable: true,
    metrics: [
      { key: "drinks", label: "Drinks", shortLabel: "Drinks", color: "var(--bronze)", opacity: 0.85, getValue: (s) => s.drinks },
      { key: "tickets", label: "Tickets", shortLabel: "Tickets", color: "var(--info)", opacity: 0.75, getValue: (s) => s.tickets },
      { key: "snacks", label: "Snacks", shortLabel: "Snacks", color: "var(--good)", opacity: 0.75, getValue: (s) => s.snacks },
      { key: "goodies", label: "Goodies", shortLabel: "Goodies", color: "var(--warn)", opacity: 0.75, getValue: (s) => s.goodies },
      { key: "surcharge", label: "Surcharge", shortLabel: "Surch.", color: "var(--fg-3)", opacity: 0.6, getValue: (s) => s.surcharge },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    title: "Payment methods by shop",
    sortBy: (s) => s.cash + s.scan + s.creditCard,
    shareLabel: (s) => `฿${fmtN(s.cash + s.scan + s.creditCard)} collected`,
    toggleable: true,
    metrics: [
      { key: "cash", label: "Cash", shortLabel: "Cash", color: "var(--good)", opacity: 0.75, getValue: (s) => s.cash },
      { key: "scan", label: "Scan / QR", shortLabel: "Scan", color: "var(--info)", opacity: 0.75, getValue: (s) => s.scan },
      { key: "creditCard", label: "Credit card", shortLabel: "Card", color: "var(--bronze)", opacity: 0.75, getValue: (s) => s.creditCard },
    ],
  },
  {
    id: "net-profit",
    label: "Net profit",
    title: "Net profit by shop",
    sortBy: (s) => s.netProfit,
    shareLabel: (s, o) => (o.netProfit !== 0 ? `${fmtPct((s.netProfit / o.netProfit) * 100)} of profit` : "—"),
    badge: (s) => ({
      text: fmtPct(s.margin),
      color: s.margin >= 20 ? "var(--good)" : s.margin >= 0 ? "var(--fg-3)" : "var(--bad)",
    }),
    metrics: [
      {
        key: "netProfit",
        label: "Net profit",
        shortLabel: "Profit",
        color: "var(--good)",
        opacity: 0.8,
        getValue: (s) => s.netProfit,
      },
    ],
  },
];

function getShopCompareConfig(mode: ShopCompareMode): ShopCompareConfig {
  return SHOP_COMPARE_MODES.find((m) => m.id === mode) ?? SHOP_COMPARE_MODES[0];
}

function ShopComparisonBar({
  amount,
  widthPct,
  color,
  opacity = 1,
  label,
}: {
  amount: number;
  widthPct: number;
  color: string;
  opacity?: number;
  label: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)", width: 64, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        ฿{fmtN(amount)}
      </span>
      <div style={{ flex: 1, height: 14, borderRadius: "var(--r-pill)", background: "var(--bg-2)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "var(--r-pill)", background: color, opacity, width: `${Math.min(100, widthPct)}%` }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--fg-4)", width: 48, textAlign: "left" }}>{label}</span>
    </div>
  );
}

// ── Treasury (CEO) View ───────────────────────────────────────────────────────

function TreasuryView({ data }: { data: AccountingData }) {
  const { overview: o, byShop } = data;
  const [compareMode, setCompareMode] = useState<ShopCompareMode>("rev-vs-costs");
  const config = getShopCompareConfig(compareMode);

  const [enabledMetrics, setEnabledMetrics] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(config.metrics.map((m) => [m.key, true])),
  );

  useEffect(() => {
    setEnabledMetrics(Object.fromEntries(getShopCompareConfig(compareMode).metrics.map((m) => [m.key, true])));
  }, [compareMode]);

  const activeMetrics = useMemo(
    () => config.metrics.filter((m) => enabledMetrics[m.key] !== false),
    [config.metrics, enabledMetrics],
  );

  const sortedShops = useMemo(
    () => [...byShop].sort((a, b) => config.sortBy(b) - config.sortBy(a)),
    [byShop, config],
  );

  const scaleMax = useMemo(() => {
    if (activeMetrics.length === 0) return 1;
    const values = sortedShops.flatMap((s) => activeMetrics.map((m) => Math.abs(m.getValue(s))));
    return Math.max(...values, 1);
  }, [sortedShops, activeMetrics]);

  const top = sortedShops[0];
  const bottom = sortedShops[sortedShops.length - 1];

  function toggleMetric(key: string) {
    setEnabledMetrics((prev) => {
      const isActive = prev[key] !== false;
      const activeCount = Object.entries(prev).filter(([, v]) => v !== false).length;
      if (isActive && activeCount <= 1) return prev;
      return { ...prev, [key]: !isActive };
    });
  }

  function calloutDetail(shop: ShopAgg) {
    if (compareMode === "net-profit") {
      return `฿${fmtN(shop.netProfit)} profit · ${fmtPct(shop.margin)} margin`;
    }
    if (compareMode === "revenue-mix" || compareMode === "payments") {
      return `฿${fmtN(config.sortBy(shop))} total · ${fmtPct(shop.margin)} margin`;
    }
    return `฿${fmtN(shop.revenue)} revenue · ${fmtPct(shop.margin)} margin`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      {/* 3 large KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--s-4)" }}>
        <div
          style={{
            borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
            background: "var(--surface)", padding: "var(--s-6)",
            display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          <p className="eyebrow" style={{ color: "var(--fg-4)", margin: 0 }}>Revenue</p>
          <p className="mono" style={{ fontSize: 36, fontWeight: 800, margin: 0, fontVariantNumeric: "tabular-nums" }}>฿{fmtN(o.revenue)}</p>
        </div>
        <div
          style={{
            borderRadius: "var(--r-lg)",
            border: `1px solid ${o.netProfit >= 0 ? "var(--good)" : "var(--bad)"}`,
            background: o.netProfit >= 0 ? "var(--good-soft)" : "var(--bad-soft)",
            padding: "var(--s-6)", display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          <p className="eyebrow" style={{ color: o.netProfit >= 0 ? "var(--good)" : "var(--bad)", margin: 0 }}>Net Profit</p>
          <p className="mono" style={{ fontSize: 36, fontWeight: 800, margin: 0, color: o.netProfit >= 0 ? "var(--good)" : "var(--bad)", fontVariantNumeric: "tabular-nums" }}>
            ฿{fmtN(o.netProfit)}
          </p>
        </div>
        <div
          style={{
            borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
            background: "var(--surface)", padding: "var(--s-6)",
            display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          <p className="eyebrow" style={{ color: "var(--fg-4)", margin: 0 }}>Margin</p>
          <p className="mono" style={{ fontSize: 36, fontWeight: 800, margin: 0, color: o.margin >= 20 ? "var(--good)" : o.margin >= 0 ? "var(--fg)" : "var(--bad)", fontVariantNumeric: "tabular-nums" }}>
            {fmtPct(o.margin)}
          </p>
        </div>
      </div>

      {/* Shop comparison chart */}
      {sortedShops.length > 0 && (
        <div
          style={{
            borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
            background: "var(--surface)", padding: "var(--s-5)",
            display: "flex", flexDirection: "column", gap: "var(--s-5)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--s-4)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{config.title}</h3>
                <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>Choose a comparison view, then toggle individual metrics where available.</p>
              </div>
              <Segmented
                value={compareMode}
                onChange={setCompareMode}
                size="sm"
                options={SHOP_COMPARE_MODES.map((m) => ({ value: m.id, label: m.label }))}
              />
            </div>

            {config.toggleable && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {config.metrics.map((metric) => (
                  <MetricToggle
                    key={metric.key}
                    label={metric.label}
                    color={metric.color}
                    active={enabledMetrics[metric.key] !== false}
                    onChange={() => toggleMetric(metric.key)}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
            {sortedShops.map((s) => {
              const shareText = config.shareLabel?.(s, o);
              const badge = config.badge?.(s);
              return (
                <div key={s.locationId} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{s.locationName}</span>
                      {shareText && (
                        <span style={{ fontSize: 11, color: "var(--fg-4)", whiteSpace: "nowrap" }}>{shareText}</span>
                      )}
                    </div>
                    {badge && (
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: badge.color, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                        {badge.text}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {activeMetrics.map((metric) => {
                      const value = metric.getValue(s);
                      const isLoss = compareMode === "net-profit" && value < 0;
                      return (
                        <ShopComparisonBar
                          key={metric.key}
                          amount={value}
                          widthPct={(Math.abs(value) / scaleMax) * 100}
                          color={isLoss ? "var(--bad)" : metric.color}
                          opacity={metric.opacity ?? 1}
                          label={isLoss ? "Loss" : metric.shortLabel}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-4)", paddingTop: "var(--s-3)", borderTop: "1px solid var(--line)" }}>
            {activeMetrics.map((metric) => (
              <div key={metric.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: "var(--r-pill)", background: metric.color, opacity: metric.opacity ?? 1 }} />
                <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top / bottom callouts */}
      {sortedShops.length >= 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--s-4)" }}>
          {top && (
            <div
              style={{
                borderRadius: "var(--r-lg)", border: "1px solid var(--good)",
                background: "var(--good-soft)", padding: "var(--s-5)",
              }}
            >
              <p className="eyebrow" style={{ color: "var(--good)", marginBottom: 8, marginTop: 0 }}>Top performer</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--good)", margin: 0 }}>{top.locationName}</p>
              <p style={{ fontSize: 13, color: "var(--good)", opacity: 0.8, marginTop: 4, marginBottom: 0 }}>
                {calloutDetail(top)}
              </p>
            </div>
          )}
          {bottom && bottom.locationId !== top?.locationId && (
            <div
              style={{
                borderRadius: "var(--r-lg)", border: "1px solid var(--warn)",
                background: "var(--warn-soft)", padding: "var(--s-5)",
              }}
            >
              <p className="eyebrow" style={{ color: "var(--warn)", marginBottom: 8, marginTop: 0 }}>Needs attention</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--warn)", margin: 0 }}>{bottom.locationName}</p>
              <p style={{ fontSize: 13, color: "var(--warn)", opacity: 0.8, marginTop: 4, marginBottom: 0 }}>
                {calloutDetail(bottom)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type ReportsTab = "operations" | "byshop";

const TABS: { value: ReportsTab; label: string }[] = [
  { value: "operations", label: "Operations" },
  { value: "byshop", label: "By Shop" },
];

export function ReportsClient() {
  const [activeTab, setActiveTab] = useState<ReportsTab>("operations");
  const [from, setFrom] = useState(() => monthStart());
  const [to, setTo] = useState(() => today());
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

  useEffect(() => {
    void fetchData(from, to, [], []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) { setInitialized(true); return; }
    void fetchData(from, to, selectedShops, locations);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, selectedShops]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      <PageHeader
        eyebrow="Financial performance"
        title="Reports"
        subtitle="Revenue, costs, and shop comparison across the selected period."
      />

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", gap: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            style={{
              padding: "0 var(--s-4)", height: 36, fontSize: 13, fontWeight: 500,
              border: "none", background: "none", cursor: "pointer",
              color: activeTab === tab.value ? "var(--fg)" : "var(--fg-4)",
              borderBottom: activeTab === tab.value ? "2px solid var(--bronze)" : "2px solid transparent",
              marginBottom: -1,
              transition: "color var(--dur) var(--ease)",
            }}
            onMouseEnter={(e) => { if (activeTab !== tab.value) (e.currentTarget.style.color = "var(--fg-2)"); }}
            onMouseLeave={(e) => { if (activeTab !== tab.value) (e.currentTarget.style.color = "var(--fg-4)"); }}
          >
            {tab.label}
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "var(--fg-4)", fontSize: 14 }}>
          Loading…
        </div>
      )}
      {!loading && !data && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "var(--fg-4)", fontSize: 14 }}>
          No data
        </div>
      )}
      {!loading && data && (
        activeTab === "operations"
          ? <OperationsView data={data} />
          : <TreasuryView data={data} />
      )}

    </div>
  );
}
