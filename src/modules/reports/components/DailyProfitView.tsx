"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalculatorIcon, CalendarDaysIcon, CheckCircle2Icon, RefreshCwIcon, Settings2Icon, TrendingDownIcon, TrendingUpIcon, WalletCardsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiStat } from "@/components/ui/kpi-stat";
import { Modal } from "@/components/ui/modal";
import { DateRangePicker, ShopMultiSelect, bangkokToday } from "@/components/ui/filters";
import { toast } from "sonner";
import type { DailyProfitResponse, DailyProfitRow } from "@/modules/reports/daily-profit/types";
import { DailyProfitManageDrawer } from "./DailyProfitManageDrawer";
import { FINANCE_SCOPE_STORAGE_KEY, type FinanceScope } from "@/modules/finance/scope";

interface Props {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Shared view: English on /reports, French inside Direction. */
  locale?: "en" | "fr";
}

const DP_LABELS: Record<"en" | "fr", Record<string, string>> = {
  en: {
    period: "Period",
    shops: "Shops",
    allShops: "All shops",
    refreshSheets: "Refresh Sheets",
    manage: "Manage P&L",
    loading: "Computing the daily result…",
    unavailable: "Daily P&L unavailable",
    revenue: "Revenue",
    daysUnit: "days",
    hr: "HR costs",
    hrHint: "Weighted salaries",
    fixed: "Fixed costs",
    fixedHint: "Fixed costs + service",
    opex: "Operating costs",
    opexHint: "Accounting data",
    result: "Result",
    margin: "margin",
    dailyTrend: "Daily trend",
    noDays: "No financial day in this period.",
    dailyDetail: "Daily detail",
    colRevenue: "Revenue",
    colOpex: "Operating costs",
    colPayroll: "Salaries",
    colFixed: "Fixed costs",
    colService: "Service",
    colBonus: "Bonus",
    costSplit: "Cost split",
    shopContribution: "Shop contribution",
    estimated: "estimated",
    actual: "actual",
  },
  fr: {
    period: "Période",
    shops: "Boutiques",
    allShops: "Toutes les boutiques",
    refreshSheets: "Actualiser Sheets",
    manage: "Gérer le P&L",
    loading: "Calcul du résultat quotidien…",
    unavailable: "Résultat quotidien non disponible",
    revenue: "Chiffre d'affaires",
    daysUnit: "jours",
    hr: "Charges RH",
    hrHint: "Salaires pondérés",
    fixed: "Charges fixes",
    fixedHint: "Frais fixes + service",
    opex: "Charges d'exploitation",
    opexHint: "Données comptables",
    result: "Résultat",
    margin: "marge",
    dailyTrend: "Évolution quotidienne",
    noDays: "Aucun jour financier sur cette période.",
    dailyDetail: "Détail quotidien",
    colRevenue: "Chiffre d'affaires",
    colOpex: "Charges d'exploitation",
    colPayroll: "Salaires",
    colFixed: "Charges fixes",
    colService: "Service",
    colBonus: "Prime",
    costSplit: "Répartition des coûts",
    shopContribution: "Contribution par boutique",
    estimated: "estimé",
    actual: "réel",
  },
};

function money(value: number) {
  const absolute = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${value < 0 ? "−" : ""}฿${absolute}`;
}

function pct(value: number) { return `${value.toFixed(1)}%`; }
function shortDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

function ProfitRibbon({ rows, onSelect }: { rows: DailyProfitRow[]; onSelect: (row: DailyProfitRow) => void }) {
  const width = 900;
  const height = 210;
  const pad = 24;
  const max = Math.max(1, ...rows.flatMap((row) => [row.revenue, row.directExpenses + row.payroll + row.recurringCosts + row.serviceCharge + (row.bonus ?? 0), Math.abs(row.economicProfit)]));
  const chartHeight = height - pad * 2;
  const barWidth = Math.max(3, Math.min(18, (width - pad * 2) / Math.max(1, rows.length) - 3));

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily revenue, cost and profit ribbon" style={{ width: "100%", minWidth: 680, height: 220, display: "block" }}>
        <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke="var(--line)" />
        {rows.map((row, index) => {
          const slot = (width - pad * 2) / Math.max(1, rows.length);
          const x = pad + index * slot + slot / 2;
          const revenueHeight = row.revenue / max * chartHeight / 2;
          const costHeight = (row.directExpenses + row.payroll + row.recurringCosts + row.serviceCharge + (row.bonus ?? 0)) / max * chartHeight / 2;
          const profitY = height / 2 - row.economicProfit / max * chartHeight / 2;
          return (
            <g key={row.date} onClick={() => onSelect(row)} style={{ cursor: "pointer" }} tabIndex={0} role="button" aria-label={`${row.date}: ${money(row.economicProfit)} profit`}>
              <rect x={x - barWidth / 2} y={height / 2 - revenueHeight} width={barWidth} height={revenueHeight} rx={2} fill="var(--good)" opacity={0.72} />
              <rect x={x - barWidth / 2} y={height / 2} width={barWidth} height={costHeight} rx={2} fill="var(--bad)" opacity={0.48} />
              <circle cx={x} cy={profitY} r={row.status === "estimated" ? 3.5 : 2.5} fill={row.economicProfit >= 0 ? "var(--bronze)" : "var(--bad)"} stroke={row.status === "estimated" ? "var(--bg)" : "none"} strokeWidth={1.5} />
              {(rows.length <= 16 || index % Math.ceil(rows.length / 12) === 0) && <text x={x} y={height - 5} textAnchor="middle" fontSize={9} fill="var(--fg-4)">{shortDate(row.date)}</text>}
            </g>
          );
        })}
        <polyline
          points={rows.map((row, index) => {
            const slot = (width - pad * 2) / Math.max(1, rows.length);
            const x = pad + index * slot + slot / 2;
            const y = height / 2 - row.economicProfit / max * chartHeight / 2;
            return `${x},${y}`;
          }).join(" ")}
          fill="none" stroke="var(--bronze)" strokeWidth={1.5} strokeLinejoin="round" opacity={0.85}
        />
      </svg>
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--fg-4)", paddingTop: 4 }}>
        <span><i style={{ display: "inline-block", width: 8, height: 8, background: "var(--good)", marginRight: 5 }} />Revenue</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, background: "var(--bad)", opacity: .55, marginRight: 5 }} />Costs</span>
        <span><i style={{ display: "inline-block", width: 14, height: 2, background: "var(--bronze)", marginRight: 5, verticalAlign: "middle" }} />Economic profit</span>
      </div>
    </div>
  );
}

function Metric({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint: string; tone?: "good" | "bad" | "neutral" }) {
  return (
    <KpiStat
      label={label}
      value={value}
      hint={hint}
      tone={tone === "good" ? "positive" : tone === "bad" ? "negative" : undefined}
    />
  );
}

export function DailyProfitView({ from, to, onFromChange, onToChange, locale = "en" }: Props) {
  const L = DP_LABELS[locale];
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [data, setData] = useState<DailyProfitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DailyProfitRow | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(FINANCE_SCOPE_STORAGE_KEY) ?? "null") as (FinanceScope & { locationIds?: string[] }) | null;
      if (stored?.type === "location") {
        const ids = stored.locationIds?.length ? stored.locationIds : stored.locationId ? [stored.locationId] : [];
        setSelectedLocationIds(ids);
      }
    } catch { /* Ignore invalid browser state. */ }
  }, []);

  useEffect(() => {
    const scope: FinanceScope = selectedLocationIds.length === 0
      ? { type: "group", locationId: "" }
      : { type: "location", locationId: selectedLocationIds[0], locationIds: selectedLocationIds };
    localStorage.setItem(FINANCE_SCOPE_STORAGE_KEY, JSON.stringify(scope));
  }, [selectedLocationIds]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from, to, scope_type: selectedLocationIds.length === 0 ? "group" : "location" });
    if (selectedLocationIds.length > 0) params.set("scope_id", selectedLocationIds.join(","));
    try {
      const response = await fetch(`/api/reports/daily-profit?${params}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to load Daily P&L");
      setData(json as DailyProfitResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Daily P&L");
    } finally { setLoading(false); }
  }, [from, to, selectedLocationIds]);

  useEffect(() => { void load(); }, [load]);

  const scopeOptions = useMemo(() => (data?.locations ?? []).map((location) => ({ id: location.id, name: location.name })), [data]);

  async function refreshMirror() {
    setSyncing(true);
    try {
      const response = await fetch("/api/reports/daily-profit/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preview: false }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Refresh failed");
      toast.success(`Daily P&L refreshed: ${result.inserted} new, ${result.updated} updated`);
      await load();
    } catch (syncError) { toast.error(syncError instanceof Error ? syncError.message : "Refresh failed"); }
    finally { setSyncing(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <div className="ui-toolbar">
        <div className="ui-filter-rows">
          <div className="ui-filter-row">
            <span className="ui-filter-label" id="daily-period-label">{L.period}</span>
            <div className="ui-filter-control" role="group" aria-labelledby="daily-period-label">
              <DateRangePicker
                value={{ from, to }}
                onChange={(range) => { onFromChange(range.from); onToChange(range.to); }}
                today={bangkokToday()}
              />
            </div>
          </div>
          <div className="ui-filter-row">
            <span className="ui-filter-label" id="daily-shops-label">{L.shops}</span>
            <div className="ui-filter-control" role="group" aria-labelledby="daily-shops-label">
              <ShopMultiSelect
                options={scopeOptions}
                selected={selectedLocationIds}
                onChange={setSelectedLocationIds}
                allLabel={L.allShops}
                getLabel={(option) => option.name.replace(/^Capybara Coffee\s*/i, "").trim() || option.name}
              />
            </div>
          </div>
        </div>
        {data?.canManage && (
          <div className="ui-toolbar-actions">
            <Button size="sm" variant="outline" onClick={() => void refreshMirror()} disabled={syncing}><RefreshCwIcon size={13} className={syncing ? "animate-spin" : ""} />{L.refreshSheets}</Button>
            <Button size="sm" onClick={() => setManageOpen(true)}><Settings2Icon size={13} />{L.manage}</Button>
          </div>
        )}
      </div>

      {loading && <Card style={{ alignItems: "center", padding: 64, color: "var(--fg-4)" }}>{L.loading}</Card>}
      {!loading && error && <Card style={{ borderColor: "var(--bad)", background: "var(--bad-soft)", gap: 8 }}><strong>{L.unavailable}</strong><span style={{ color: "var(--fg-3)" }}>{error}</span></Card>}

      {!loading && data && (
        <>
          <div className="ui-kpi-grid">
            <Metric label={L.revenue} value={money(data.summary.revenue)} hint={`${data.daily.length} ${L.daysUnit}`} />
            <Metric label={L.hr} value={money(data.summary.payroll)} hint={L.hrHint} tone="bad" />
            <Metric label={L.fixed} value={money(data.summary.recurringCosts + data.summary.serviceCharge)} hint={L.fixedHint} tone="bad" />
            <Metric label={L.opex} value={money(data.summary.directExpenses)} hint={L.opexHint} tone="bad" />
            <Metric label={L.result} value={money(data.summary.economicProfit)} hint={`${pct(data.summary.margin)} ${L.margin} · ${data.scope.label}`} tone={data.summary.economicProfit >= 0 ? "good" : "bad"} />
          </div>

          <Card style={{ gap: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div><h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{L.dailyTrend}</h2></div>
            </div>
            {data.daily.length > 0 ? <ProfitRibbon rows={data.daily} onSelect={setSelectedDay} /> : <p style={{ color: "var(--fg-4)", padding: 32, textAlign: "center" }}>{L.noDays}</p>}
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,.8fr)]" style={{ gap: "var(--s-4)", alignItems: "start" }}>
            <Card flush>
              <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)" }}><strong>{L.dailyDetail}</strong></div>
              <div className="ui-table-scroll"><table style={tableStyle}><thead><tr>{["Date", L.colRevenue, L.colOpex, L.colPayroll, L.colFixed, L.colService, L.colBonus].map((label) => <th key={label} style={thStyle}>{label}</th>)}</tr></thead><tbody>{data.daily.map((row) => <tr key={row.date} onClick={() => setSelectedDay(row)} style={{ cursor: "pointer", borderTop: "1px solid var(--line)" }}><td style={tdLeft}>{shortDate(row.date)}</td><td style={tdNumber}>{money(row.revenue)}</td><td style={tdNumber}>{money(row.directExpenses)}</td><td style={tdNumber}>{money(row.payroll)}</td><td style={tdNumber}>{money(row.recurringCosts)}</td><td style={tdNumber}>{money(row.serviceCharge)}</td><td style={tdNumber}>{money(row.bonus ?? 0)}</td></tr>)}</tbody></table></div>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
              <Card style={{ gap: 10 }}><strong>{L.costSplit}</strong>{data.categories.slice(0, 8).map((category) => <div key={category.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}><span style={{ color: "var(--fg-3)" }}>{category.label}</span><span className="mono">{money(category.amount)}</span></div>)}</Card>
              <Card style={{ gap: 10 }}><strong>{L.shopContribution}</strong>{data.byScope.map((row) => <div key={row.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, fontSize: 12 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name.replace(/^Capybara Coffee\s*/i, "").trim() || row.name}</span><span style={{ flexShrink: 0, padding: "0 6px", border: "1px solid var(--line)", borderRadius: "var(--r-pill)", fontSize: 10, lineHeight: "16px", color: "var(--fg-4)" }}>{row.estimatedAmount > 0 ? L.estimated : L.actual}</span></span><span className="mono" style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{money(row.revenue)}</span></div>)}</Card>
            </div>
          </div>
        </>
      )}

      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ? `Daily result · ${shortDate(selectedDay.date)}` : "Daily result"} description="Economic result and observed cash remain separate.">
        {selectedDay && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{[
          ["Revenue (VAT incl.)", selectedDay.revenue, TrendingUpIcon], ["Daily operating expenses", selectedDay.directExpenses, TrendingDownIcon],
          ["Weighted salaries", selectedDay.payroll, WalletCardsIcon], ["Weighted fixed costs", selectedDay.recurringCosts, CalendarDaysIcon],
          ["Calculated service charge", selectedDay.serviceCharge, CalculatorIcon], ["Challenge bonus", selectedDay.bonus ?? 0, WalletCardsIcon], ["Result", selectedDay.economicProfit, selectedDay.economicProfit >= 0 ? TrendingUpIcon : TrendingDownIcon],
          ["Cash received", selectedDay.cashIn, WalletCardsIcon], ["Cash paid", selectedDay.cashOut, WalletCardsIcon],
        ].map(([label, value, Icon]) => { const RowIcon = Icon as typeof TrendingUpIcon; return <div key={String(label)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}><span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-3)" }}><RowIcon size={14} />{String(label)}</span><strong className="mono">{money(Number(value))}</strong></div>; })}</div>}
      </Modal>

      <DailyProfitManageDrawer open={manageOpen} onClose={() => setManageOpen(false)} onChanged={() => void load()} defaultDate={to} />
    </div>
  );
}

function FormulaValue({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return <div style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", opacity: .65 }}>{label}</span><strong className="mono" style={{ display: "block", marginTop: 3, fontSize: 19, color: accent ? "#f4cc77" : "white" }}>{money(value)}</strong></div>;
}

function MethodologyPanel({ data }: { data: DailyProfitResponse }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
    <Card style={{ gap: 14, borderColor: "#2d6655", background: "linear-gradient(135deg, color-mix(in srgb, var(--good) 8%, var(--surface)), var(--surface))" }}>
      <div><span className="eyebrow" style={{ color: "var(--good)" }}>{data.methodology.version}</span><h2 style={{ margin: "5px 0 0", fontSize: 19 }}>The formula used today</h2></div>
      <code style={{ padding: 14, borderRadius: "var(--r-md)", background: "var(--fg)", color: "var(--bg)", fontSize: 13, whiteSpace: "normal" }}>{data.methodology.formula}</code>
      <p style={{ margin: 0, color: "var(--fg-3)", fontSize: 12 }}>This page is fed by the same settings as the calculation. Any saved change appears here on reload.</p>
    </Card>
    <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "var(--s-4)" }}>
      <Card style={{ gap: 12 }}><strong>What comes from the Google Sheets</strong><DocList title="Added revenue" values={data.methodology.revenueFields} /><DocList title="Subtracted expenses" values={data.methodology.expenseFields} /><DocList title="HR explicitly excluded" values={data.methodology.excludedFields} tone="warn" /></Card>
      <Card style={{ gap: 12 }}><strong>Weighting rules</strong>{data.methodology.rules.map((rule) => <div key={rule} style={{ display: "flex", gap: 9, fontSize: 12, color: "var(--fg-3)" }}><CheckCircle2Icon size={14} style={{ color: "var(--good)", flexShrink: 0 }} />{rule}</div>)}</Card>
    </div>
    <Card flush>
      <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)" }}><strong>Settings actually applied · {data.scope.label}</strong></div>
      {data.methodology.shopSettings.length === 0 ? <p style={{ padding: 20, color: "var(--warn)", margin: 0 }}>No monthly settings saved for this period: manual values are counted as zero.</p> : <div className="ui-table-scroll"><table style={tableStyle}><thead><tr>{["Shop / month", "Salaries", "Rent", "Electricity", "Water", "Other fixed", "SC rate", "Employees", "Bonus"].map((label) => <th key={label} style={thStyle}>{label}</th>)}</tr></thead><tbody>{data.methodology.shopSettings.map((row) => <tr key={`${row.locationId}:${row.period}`} style={{ borderTop: "1px solid var(--line)" }}><td style={tdLeft}><strong>{row.locationName}</strong><span style={{ color: "var(--fg-4)", marginLeft: 7 }}>{row.period}</span></td><td style={tdNumber}>{money(row.salaries)}</td><td style={tdNumber}>{money(row.rent)}</td><td style={tdNumber}>{money(row.electricity)}</td><td style={tdNumber}>{money(row.water)}</td><td style={tdNumber}>{money(row.otherFixed)}</td><td style={tdNumber}>{row.serviceChargeRatePct}%</td><td style={tdNumber}>{row.employeeCount}</td><td style={tdNumber}>{money(row.bonus)}</td></tr>)}</tbody></table></div>}
    </Card>
  </div>;
}

function DocList({ title, values, tone }: { title: string; values: readonly string[]; tone?: "warn" }) {
  return <div><span style={{ display: "block", fontSize: 11, color: tone === "warn" ? "var(--warn)" : "var(--fg-4)", marginBottom: 6 }}>{title}</span><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{values.map((value) => <code key={value} style={{ padding: "3px 6px", borderRadius: 4, background: "var(--bg-2)", color: "var(--fg-3)", fontSize: 10 }}>{value}</code>)}</div></div>;
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const thStyle: React.CSSProperties = { padding: "8px 12px", color: "var(--fg-4)", fontWeight: 500, textAlign: "right", background: "var(--bg-2)", whiteSpace: "nowrap" };
const tdLeft: React.CSSProperties = { padding: "8px 12px", whiteSpace: "nowrap" };
const tdNumber: React.CSSProperties = { padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" };
