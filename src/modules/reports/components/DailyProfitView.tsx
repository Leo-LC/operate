"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangleIcon, BookOpenIcon, CalculatorIcon, CalendarDaysIcon, CheckCircle2Icon, RefreshCwIcon, Settings2Icon, TrendingDownIcon, TrendingUpIcon, WalletCardsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Drawer } from "@/components/ui/drawer";
import { Pill } from "@/components/ui/pill";
import { toast } from "sonner";
import type { DailyProfitResponse, DailyProfitRow } from "@/modules/reports/daily-profit/types";
import { DailyProfitManageDrawer } from "./DailyProfitManageDrawer";
import { FINANCE_SCOPE_STORAGE_KEY, type FinanceScope } from "@/modules/finance/scope";

interface Props {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

function money(value: number) {
  const absolute = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return value < 0 ? `(฿${absolute})` : `฿${absolute}`;
}

function pct(value: number) { return `${value.toFixed(1)}%`; }
function shortDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function ProfitRibbon({ rows, onSelect }: { rows: DailyProfitRow[]; onSelect: (row: DailyProfitRow) => void }) {
  const width = 900;
  const height = 210;
  const pad = 24;
  const max = Math.max(1, ...rows.flatMap((row) => [row.revenue, row.directExpenses + row.payroll + row.recurringCosts + row.serviceCharge, Math.abs(row.economicProfit)]));
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
          const costHeight = (row.directExpenses + row.payroll + row.recurringCosts + row.serviceCharge) / max * chartHeight / 2;
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
  const color = tone === "good" ? "var(--good)" : tone === "bad" ? "var(--bad)" : "var(--fg)";
  return (
    <Card style={{ gap: 8 }}>
      <span className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</span>
      <strong className="mono tabular-nums" style={{ fontSize: 26, color, letterSpacing: "-.04em" }}>{value}</strong>
      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{hint}</span>
    </Card>
  );
}

export function DailyProfitView({ from, to, onFromChange, onToChange }: Props) {
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [data, setData] = useState<DailyProfitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DailyProfitRow | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [contentTab, setContentTab] = useState<"result" | "methodology">("result");

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

  function toggleLocation(id: string) {
    setSelectedLocationIds((current) => {
      if (current.length === 0) return [id];
      if (current.includes(id)) {
        const next = current.filter((value) => value !== id);
        return next.length === 0 ? [] : next;
      }
      return [...current, id];
    });
  }

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

  const today = bangkokToday();
  const setMtd = () => { onFromChange(`${today.slice(0, 7)}-01`); onToChange(today); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "var(--s-3)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", background: "var(--surface)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Shops</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button type="button" aria-pressed={selectedLocationIds.length === 0} onClick={() => setSelectedLocationIds([])} style={pillStyle(selectedLocationIds.length === 0)}>All shops</button>
            {scopeOptions.map((option) => { const active = selectedLocationIds.includes(option.id); return <button key={option.id} type="button" aria-pressed={active} onClick={() => toggleLocation(option.id)} style={pillStyle(active)}>{option.name}</button>; })}
          </div>
        </div>
        <div style={{ width: 1, height: 24, background: "var(--line)" }} />
        <DateInput value={from} onChange={(event) => onFromChange(event.target.value)} aria-label="From date" />
        <span style={{ color: "var(--fg-4)", fontSize: 12 }}>to</span>
        <DateInput value={to} onChange={(event) => onToChange(event.target.value)} aria-label="To date" />
        <Button size="sm" variant="outline" onClick={setMtd}><CalendarDaysIcon size={13} />MTD</Button>
        <div style={{ flex: 1 }} />
        {data?.canManage && <Button size="sm" variant="outline" onClick={() => void refreshMirror()} disabled={syncing}><RefreshCwIcon size={13} className={syncing ? "animate-spin" : ""} />Refresh Sheets</Button>}
        {data?.canManage && <Button size="sm" onClick={() => setManageOpen(true)}><Settings2Icon size={13} />Manage P&L</Button>}
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)" }}>
        <button type="button" onClick={() => setContentTab("result")} style={tabStyle(contentTab === "result")}><CalculatorIcon size={14} />Résultat</button>
        <button type="button" onClick={() => setContentTab("methodology")} style={tabStyle(contentTab === "methodology")}><BookOpenIcon size={14} />Comment c’est calculé</button>
      </div>

      {loading && <Card style={{ alignItems: "center", padding: 64, color: "var(--fg-4)" }}>Calculating the daily result…</Card>}
      {!loading && error && <Card style={{ borderColor: "var(--bad)", background: "var(--bad-soft)", gap: 8 }}><strong>Daily P&L is not ready</strong><span style={{ color: "var(--fg-3)" }}>{error}</span><span style={{ fontSize: 12, color: "var(--fg-4)" }}>Apply the finance alpha migration, then reload this tab. Existing modules are unaffected.</span></Card>}

      {!loading && data && contentTab === "methodology" && <MethodologyPanel data={data} />}

      {!loading && data && contentTab === "result" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(110px,1fr) auto minmax(110px,1fr) auto minmax(110px,1fr)", gap: 10, alignItems: "center", padding: "16px 18px", borderRadius: "var(--r-lg)", color: "white", background: "linear-gradient(110deg, #173b31, #245a48)", overflowX: "auto" }}>
            <FormulaValue label="Revenue" value={data.summary.revenue} /><strong style={operatorStyle}>−</strong><FormulaValue label="Tous les coûts" value={data.summary.totalCosts} /><strong style={operatorStyle}>=</strong><FormulaValue label="Résultat" value={data.summary.economicProfit} accent />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "var(--s-3)" }}>
            <Metric label="Résultat" value={money(data.summary.economicProfit)} hint={`${pct(data.summary.margin)} de marge · ${data.scope.label}`} tone={data.summary.economicProfit >= 0 ? "good" : "bad"} />
            <Metric label="Revenue" value={money(data.summary.revenue)} hint={`${data.daily.length} jours calendaires`} />
            <Metric label="Dépenses Sheets hors RH" value={money(data.summary.directExpenses)} hint="Données quotidiennes Accounting" tone="bad" />
            <Metric label="Coûts ajoutés" value={money(data.summary.payroll + data.summary.recurringCosts + data.summary.serviceCharge)} hint="Salaires + fixes + service charge" tone="bad" />
          </div>

          <Card style={{ gap: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div><h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Daily profit ribbon</h2><p style={{ fontSize: 12, color: "var(--fg-4)", margin: "4px 0 0" }}>Revenue above the axis, costs below, profit traced across the period. Select a day to inspect it.</p></div>
              <Pill tone="info" size="sm">Formule simplifiée</Pill>
            </div>
            {data.daily.length > 0 ? <ProfitRibbon rows={data.daily} onSelect={setSelectedDay} /> : <p style={{ color: "var(--fg-4)", padding: 32, textAlign: "center" }}>No financial days in this scope.</p>}
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,.8fr)]" style={{ gap: "var(--s-4)", alignItems: "start" }}>
            <Card flush>
              <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)" }}><strong>Détail quotidien</strong></div>
              <div style={{ overflowX: "auto" }}><table style={tableStyle}><thead><tr>{["Date", "Revenue", "Dépenses", "Salaires", "Frais fixes", "Service charge", "Résultat", "Marge"].map((label) => <th key={label} style={thStyle}>{label}</th>)}</tr></thead><tbody>{data.daily.map((row) => <tr key={row.date} onClick={() => setSelectedDay(row)} style={{ cursor: "pointer", borderTop: "1px solid var(--line)" }}><td style={tdLeft}>{shortDate(row.date)}</td><td style={tdNumber}>{money(row.revenue)}</td><td style={tdNumber}>{money(row.directExpenses)}</td><td style={tdNumber}>{money(row.payroll)}</td><td style={tdNumber}>{money(row.recurringCosts)}</td><td style={tdNumber}>{money(row.serviceCharge)}</td><td style={{ ...tdNumber, color: row.economicProfit >= 0 ? "var(--good)" : "var(--bad)", fontWeight: 650 }}>{money(row.economicProfit)}</td><td style={tdNumber}>{pct(row.margin)}</td></tr>)}</tbody></table></div>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
              <Card style={{ gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><strong>Data confidence</strong><span className="mono" style={{ fontSize: 20, color: data.coverage.score >= 80 ? "var(--good)" : "var(--warn)" }}>{data.coverage.score}%</span></div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--bg-3)", overflow: "hidden" }}><div style={{ width: `${data.coverage.score}%`, height: "100%", background: data.coverage.score >= 80 ? "var(--good)" : "var(--warn)" }} /></div>
                {data.coverage.warnings.length === 0 ? <span style={{ display: "flex", gap: 7, color: "var(--good)", fontSize: 12 }}><CheckCircle2Icon size={14} />All configured sources are current.</span> : data.coverage.warnings.map((warning) => <span key={warning} style={{ display: "flex", gap: 7, color: "var(--fg-3)", fontSize: 12 }}><AlertTriangleIcon size={14} style={{ color: "var(--warn)", flexShrink: 0 }} />{warning}</span>)}
              </Card>
              <Card style={{ gap: 10 }}><strong>Cost composition</strong>{data.categories.slice(0, 8).map((category) => <div key={category.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}><span style={{ color: "var(--fg-3)" }}>{category.label} {category.status === "estimated" && <em style={{ color: "var(--warn)" }}>est.</em>}</span><span className="mono">{money(category.amount)}</span></div>)}</Card>
              <Card style={{ gap: 10 }}><strong>Shop contribution</strong>{data.byScope.map((row) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4, fontSize: 12 }}><span>{row.name}</span><span className="mono" style={{ color: row.economicProfit >= 0 ? "var(--good)" : "var(--bad)" }}>{money(row.economicProfit)}</span><span style={{ color: "var(--fg-4)" }}>{pct(row.margin)} margin</span><span style={{ color: "var(--fg-4)", textAlign: "right" }}>{row.estimatedAmount > 0 ? "estimated" : "actual"}</span></div>)}</Card>
            </div>
          </div>
        </>
      )}

      <Drawer open={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ? `Daily result · ${shortDate(selectedDay.date)}` : "Daily result"} description="Economic result and observed cash remain separate.">
        {selectedDay && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{[
          ["Revenue (VAT incl.)", selectedDay.revenue, TrendingUpIcon], ["Daily operating expenses", selectedDay.directExpenses, TrendingDownIcon],
          ["Salaires pondérés", selectedDay.payroll, WalletCardsIcon], ["Frais fixes pondérés", selectedDay.recurringCosts, CalendarDaysIcon],
          ["Service charge calculé", selectedDay.serviceCharge, CalculatorIcon], ["Résultat", selectedDay.economicProfit, selectedDay.economicProfit >= 0 ? TrendingUpIcon : TrendingDownIcon],
          ["Cash received", selectedDay.cashIn, WalletCardsIcon], ["Cash paid", selectedDay.cashOut, WalletCardsIcon],
        ].map(([label, value, Icon]) => { const RowIcon = Icon as typeof TrendingUpIcon; return <div key={String(label)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}><span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-3)" }}><RowIcon size={14} />{String(label)}</span><strong className="mono">{money(Number(value))}</strong></div>; })}</div>}
      </Drawer>

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
      <div><span className="eyebrow" style={{ color: "var(--good)" }}>{data.methodology.version}</span><h2 style={{ margin: "5px 0 0", fontSize: 19 }}>La formule utilisée aujourd’hui</h2></div>
      <code style={{ padding: 14, borderRadius: "var(--r-md)", background: "var(--fg)", color: "var(--bg)", fontSize: 13, whiteSpace: "normal" }}>{data.methodology.formula}</code>
      <p style={{ margin: 0, color: "var(--fg-3)", fontSize: 12 }}>Cette page est alimentée par les mêmes paramètres que le calcul. Toute modification enregistrée apparaît ici dès le rechargement.</p>
    </Card>
    <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "var(--s-4)" }}>
      <Card style={{ gap: 12 }}><strong>Ce qui vient des Google Sheets</strong><DocList title="Revenue additionné" values={data.methodology.revenueFields} /><DocList title="Dépenses soustraites" values={data.methodology.expenseFields} /><DocList title="RH explicitement exclue" values={data.methodology.excludedFields} tone="warn" /></Card>
      <Card style={{ gap: 12 }}><strong>Règles de pondération</strong>{data.methodology.rules.map((rule) => <div key={rule} style={{ display: "flex", gap: 9, fontSize: 12, color: "var(--fg-3)" }}><CheckCircle2Icon size={14} style={{ color: "var(--good)", flexShrink: 0 }} />{rule}</div>)}</Card>
    </div>
    <Card flush>
      <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)" }}><strong>Paramètres réellement appliqués · {data.scope.label}</strong></div>
      {data.methodology.shopSettings.length === 0 ? <p style={{ padding: 20, color: "var(--warn)", margin: 0 }}>Aucun paramètre mensuel enregistré sur cette période : les valeurs manuelles sont comptées à zéro.</p> : <div style={{ overflowX: "auto" }}><table style={tableStyle}><thead><tr>{["Shop / mois", "Salaires", "Loyer", "Électricité", "Eau", "Autres fixes", "Taux SC", "Employés"].map((label) => <th key={label} style={thStyle}>{label}</th>)}</tr></thead><tbody>{data.methodology.shopSettings.map((row) => <tr key={`${row.locationId}:${row.period}`} style={{ borderTop: "1px solid var(--line)" }}><td style={tdLeft}><strong>{row.locationName}</strong><span style={{ color: "var(--fg-4)", marginLeft: 7 }}>{row.period}</span></td><td style={tdNumber}>{money(row.salaries)}</td><td style={tdNumber}>{money(row.rent)}</td><td style={tdNumber}>{money(row.electricity)}</td><td style={tdNumber}>{money(row.water)}</td><td style={tdNumber}>{money(row.otherFixed)}</td><td style={tdNumber}>{row.serviceChargeRatePct}%</td><td style={tdNumber}>{row.employeeCount}</td></tr>)}</tbody></table></div>}
    </Card>
  </div>;
}

function DocList({ title, values, tone }: { title: string; values: readonly string[]; tone?: "warn" }) {
  return <div><span style={{ display: "block", fontSize: 11, color: tone === "warn" ? "var(--warn)" : "var(--fg-4)", marginBottom: 6 }}>{title}</span><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{values.map((value) => <code key={value} style={{ padding: "3px 6px", borderRadius: 4, background: "var(--bg-2)", color: "var(--fg-3)", fontSize: 10 }}>{value}</code>)}</div></div>;
}

const pillStyle = (active: boolean): React.CSSProperties => ({ padding: "7px 12px", borderRadius: "var(--r-pill)", border: `1px solid ${active ? "var(--bronze)" : "var(--line-strong)"}`, background: active ? "var(--bronze-soft)" : "var(--bg)", color: active ? "var(--bronze)" : "var(--fg-3)", fontSize: 12, fontWeight: active ? 650 : 500, cursor: "pointer" });
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const thStyle: React.CSSProperties = { padding: "8px 12px", color: "var(--fg-4)", fontWeight: 500, textAlign: "right", background: "var(--bg-2)", whiteSpace: "nowrap" };
const tdLeft: React.CSSProperties = { padding: "8px 12px", whiteSpace: "nowrap" };
const tdNumber: React.CSSProperties = { padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" };
const operatorStyle: React.CSSProperties = { fontSize: 20, opacity: .55 };
const tabStyle = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 13px", border: 0, borderBottom: active ? "2px solid var(--bronze)" : "2px solid transparent", background: "transparent", color: active ? "var(--fg)" : "var(--fg-4)", fontSize: 12, fontWeight: active ? 650 : 500, cursor: "pointer" });
