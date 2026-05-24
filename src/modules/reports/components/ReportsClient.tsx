"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDownIcon } from "lucide-react";
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

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad" | "info";
}) {
  const deltaDir = tone === "good" ? "up" as const : tone === "bad" ? "down" as const : "neutral" as const;
  return (
    <div
      style={{
        borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
        background: "var(--surface)", padding: "var(--s-5)",
      }}
    >
      <Stat label={label} value={value} deltaDir={deltaDir} hint={sub} />
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <div
      style={{
        padding: "10px var(--s-5)", borderBottom: "1px solid var(--line)",
        background: bg,
      }}
    >
      <h3 className="eyebrow" style={{ color, margin: 0 }}>{label}</h3>
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
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--s-2)" }}>
      {quickBtns.map((b) => (
        <Button key={b.label} variant="secondary" size="sm" onClick={b.fn}>
          {b.label}
        </Button>
      ))}
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

// ── Operations Tab ────────────────────────────────────────────────────────────

function OperationsView({ data }: { data: AccountingData }) {
  const { overview: o, byShop } = data;
  const totalPayments = o.cash + o.scan + o.creditCard;

  function pct(n: number) {
    return totalPayments > 0 ? fmtPct((n / totalPayments) * 100) : "—";
  }

  const sortedShops = [...byShop].sort((a, b) => b.revenue - a.revenue);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      {/* KPI Banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KpiCard label="Total Revenue" value={`฿${fmtN(o.revenue)}`} />
        <KpiCard label="Total Expenses" value={`฿${fmtN(o.expenses + o.hrCosts)}`} tone="bad" />
        <KpiCard
          label="Net Profit"
          value={`฿${fmtN(o.netProfit)}`}
          tone={o.netProfit >= 0 ? "good" : "bad"}
        />
        <KpiCard
          label="Net Margin"
          value={fmtPct(o.margin)}
          tone={o.margin >= 20 ? "good" : o.margin >= 0 ? "neutral" : "bad"}
        />
      </div>

      {/* Revenue by category */}
      <div
        style={{
          borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
          background: "var(--surface)", overflow: "hidden",
        }}
      >
        <SectionHeader label="Revenue by category" bg="var(--good-soft)" color="var(--good)" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-2)" }}>
                <th style={{ padding: "8px var(--s-5)", textAlign: "left", color: "var(--fg-3)", fontWeight: 500 }}>Category</th>
                {sortedShops.map((s) => (
                  <th key={s.locationId} style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg-3)", fontWeight: 500, whiteSpace: "nowrap" }}>
                    {s.locationName}
                  </th>
                ))}
                <th style={{ padding: "8px var(--s-5)", textAlign: "right", color: "var(--fg)", fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(["drinks", "tickets", "snacks", "goodies", "surcharge"] as const).map((key, i) => {
                const labels: Record<string, string> = { drinks: "Drinks", tickets: "Tickets", snacks: "Snacks", goodies: "Goodies", surcharge: "Card surcharge" };
                return (
                  <tr
                    key={key}
                    style={{ borderTop: i === 0 ? "1px solid var(--line)" : "1px solid var(--line)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                  >
                    <td style={{ padding: "8px var(--s-5)", color: "var(--fg-3)" }}>{labels[key]}</td>
                    {sortedShops.map((s) => (
                      <td key={s.locationId} className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {s[key] > 0 ? fmtN(s[key]) : <span style={{ color: "var(--fg-mute)" }}>—</span>}
                      </td>
                    ))}
                    <td className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                      {fmtN(sortedShops.reduce((sum, s) => sum + s[key], 0))}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: "var(--bronze-soft)", borderTop: "2px solid var(--line)" }}>
                <td style={{ padding: "8px var(--s-5)", fontWeight: 600, color: "var(--bronze)" }}>Total revenue</td>
                {sortedShops.map((s) => (
                  <td key={s.locationId} className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--bronze)", fontWeight: 500 }}>
                    {fmtN(s.revenue)}
                  </td>
                ))}
                <td className="mono" style={{ padding: "8px var(--s-5)", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--bronze)", fontWeight: 700 }}>
                  {fmtN(o.revenue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment method split */}
      <div
        style={{
          borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
          background: "var(--surface)", overflow: "hidden",
        }}
      >
        <SectionHeader label="Payment methods" bg="var(--info-soft)" color="var(--info)" />
        <div style={{ padding: "var(--s-5)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--s-5)" }}>
          {[
            { label: "Cash", value: o.cash },
            { label: "Scan / QR", value: o.scan },
            { label: "Credit card", value: o.creditCard },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>{label}</p>
              <p className="mono" style={{ fontSize: 20, fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>฿{fmtN(value)}</p>
              <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>{pct(value)} of payments</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses + HR */}
      <div
        style={{
          borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
          background: "var(--surface)", overflow: "hidden",
        }}
      >
        <SectionHeader label="Expenses &amp; HR" bg="var(--warn-soft)" color="var(--warn)" />
        <div style={{ padding: "var(--s-5)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--s-5)" }}>
          {[
            { label: "Expenses", value: o.expenses },
            { label: "HR costs", value: o.hrCosts },
            { label: "Grand total costs", value: o.expenses + o.hrCosts },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>{label}</p>
              <p className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--bad)", margin: 0, fontVariantNumeric: "tabular-nums" }}>฿{fmtN(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-shop comparison */}
      <div
        style={{
          borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
          background: "var(--surface)", overflow: "hidden",
        }}
      >
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
                    <Pill
                      tone={s.margin >= 20 ? "good" : s.margin >= 0 ? "neutral" : "bad"}
                      size="sm"
                    >
                      {fmtPct(s.margin)}
                    </Pill>
                  </td>
                </tr>
              ))}
              {sortedShops.length > 1 && (
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
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Treasury (CEO) View ───────────────────────────────────────────────────────

function TreasuryView({ data }: { data: AccountingData }) {
  const { overview: o, byShop } = data;

  const sortedShops = [...byShop].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(...sortedShops.map((s) => s.revenue), 1);
  const top = sortedShops[0];
  const bottom = sortedShops[sortedShops.length - 1];

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

      {/* Revenue vs Expenses per shop */}
      {sortedShops.length > 0 && (
        <div
          style={{
            borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
            background: "var(--surface)", padding: "var(--s-5)",
            display: "flex", flexDirection: "column", gap: "var(--s-5)",
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Revenue vs. Expenses by shop</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
            {sortedShops.map((s) => {
              const revPct = (s.revenue / maxRevenue) * 100;
              const expPct = ((s.expenses + s.hrCosts) / maxRevenue) * 100;
              return (
                <div key={s.locationId} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{s.locationName}</span>
                      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
                        {o.revenue > 0 ? fmtPct((s.revenue / o.revenue) * 100) : "—"} of revenue
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: s.netProfit >= 0 ? "var(--good)" : "var(--bad)", fontVariantNumeric: "tabular-nums" }}>
                      {s.netProfit >= 0 ? "+" : ""}฿{fmtN(s.netProfit)}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)", width: 64, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>฿{fmtN(s.revenue)}</span>
                      <div style={{ flex: 1, height: 14, borderRadius: "var(--r-pill)", background: "var(--bg-2)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "var(--r-pill)", background: "var(--good)", opacity: 0.7, width: `${revPct}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--fg-4)", width: 40 }}>Rev</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)", width: 64, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>฿{fmtN(s.expenses + s.hrCosts)}</span>
                      <div style={{ flex: 1, height: 14, borderRadius: "var(--r-pill)", background: "var(--bg-2)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "var(--r-pill)", background: "var(--bad)", opacity: 0.6, width: `${expPct}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--fg-4)", width: 40 }}>Exp+HR</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "var(--s-4)", paddingTop: "var(--s-3)", borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "var(--r-pill)", background: "var(--good)", opacity: 0.7 }} />
              <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Revenue</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "var(--r-pill)", background: "var(--bad)", opacity: 0.6 }} />
              <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Expenses + HR</span>
            </div>
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
                ฿{fmtN(top.revenue)} revenue · {fmtPct(top.margin)} margin
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
                ฿{fmtN(bottom.revenue)} revenue · {fmtPct(bottom.margin)} margin
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type ReportsTab = "operations" | "treasury";

const TABS: { value: ReportsTab; label: string }[] = [
  { value: "operations", label: "Operations" },
  { value: "treasury", label: "Treasury" },
];

export function ReportsClient() {
  const [activeTab, setActiveTab] = useState<ReportsTab>("operations");
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
