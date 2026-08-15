"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

interface ShopAgg {
  locationId: string;
  locationName: string;
  revenue: number;
  expenses: number;
  hrCosts: number;
  netProfit: number;
  margin: number;
}

interface AccountingData {
  period: { from: string; to: string };
  locations: { id: string; name: string }[];
  overview: ShopAgg;
  byShop: ShopAgg[];
  previousPeriod: { period: { from: string; to: string }; overview: ShopAgg };
  dailyTotals: { date: string; revenue: number }[];
}

interface ViewerDashboardProps {
  name: string;
}

function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function fmtN(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function money(n: number) {
  const abs = Math.abs(n);
  return n < 0 ? `(฿${fmtN(abs)})` : `฿${fmtN(n)}`;
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function pctChange(curr: number, prev: number): { delta: string; dir: "up" | "down" | "neutral" } {
  if (!prev) return { delta: "—", dir: "neutral" };
  const change = ((curr - prev) / Math.abs(prev)) * 100;
  const dir = change > 0.05 ? "up" : change < -0.05 ? "down" : "neutral";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
  return { delta: `${arrow} ${Math.abs(change).toFixed(1)}%`, dir };
}

function monthName(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function countDays(fromStr: string, toStr: string): number {
  const d1 = new Date(fromStr);
  const d2 = new Date(toStr);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

function daysInMonth(dateStr: string): number {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function dayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Tile({
  label,
  value,
  delta,
  deltaDir = "neutral",
  hint,
  tone,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down" | "neutral";
  hint?: string;
  tone?: "good" | "bad";
}) {
  const deltaColor = deltaDir === "up" ? "var(--good)" : deltaDir === "down" ? "var(--bad)" : "var(--fg-4)";
  const accent = tone === "good" ? "var(--good)" : tone === "bad" ? "var(--bad)" : "var(--fg)";
  return (
    <div
      style={{
        borderRadius: "var(--r-lg)",
        border: `1px solid ${tone ? accent : "var(--line)"}`,
        background: tone === "good" ? "var(--good-soft)" : tone === "bad" ? "var(--bad-soft)" : "var(--surface)",
        padding: "var(--s-6)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <p className="eyebrow" style={{ color: tone ? accent : "var(--fg-4)", margin: 0 }}>{label}</p>
      <p className="mono" style={{ fontSize: 36, fontWeight: 800, margin: 0, color: accent, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      {(delta || hint) && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--fg-4)", display: "flex", gap: 6, alignItems: "center" }}>
          {delta && <span style={{ color: deltaColor, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{delta}</span>}
          {hint && <span>{hint}</span>}
        </p>
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 200;
  const h = 60;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 90, overflow: "visible", display: "block" }} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShopBar({ shop, max }: { shop: ShopAgg; max: number }) {
  const width = max > 0 ? Math.max(2, (shop.revenue / max) * 100) : 0;
  const shortName = shop.locationName.replace(/^Capybara Coffee\s*/i, "").trim() || shop.locationName;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortName}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--fg)" }}>฿{fmtN(shop.revenue)}</span>
          <span
            className="mono"
            style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: shop.netProfit >= 0 ? "var(--good)" : "var(--bad)", minWidth: 74, textAlign: "right" }}
          >
            {pct(shop.margin)}
          </span>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: shop.netProfit >= 0 ? "var(--good)" : "var(--bad)", opacity: 0.85 }} />
      </div>
    </div>
  );
}

export function ViewerDashboard({ name }: ViewerDashboardProps) {
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);

  const firstName = name.split(" ")[0];

  const from = useMemo(() => `${bangkokToday().slice(0, 7)}-01`, []);
  const to = useMemo(() => bangkokToday(), []);

  useEffect(() => {
    let active = true;
    fetch(`/api/reports/accounting?from=${from}&to=${to}&locations=all`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active) {
          setData(json as AccountingData | null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [from, to]);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    [],
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 0", color: "var(--fg-4)", fontSize: 14 }}>
        Chargement…
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 0", color: "var(--fg-4)", fontSize: 14 }}>
        Aucune donnée disponible pour cette période.
      </div>
    );
  }

  const o = data.overview;
  const p = data.previousPeriod.overview;
  const prevLabel = monthName(data.previousPeriod.period.to);
  const periodLabel = monthName(data.period.to);

  const revenueDelta = pctChange(o.revenue, p.revenue);
  const profitDelta = pctChange(o.netProfit, p.netProfit);

  const sortedShops = [...data.byShop].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(...sortedShops.map((s) => s.revenue), 1);
  const activeDays = data.dailyTotals.filter((d) => d.revenue > 0);
  const elapsedDays = countDays(data.period.from, data.period.to);
  const avgPerDay = elapsedDays > 0 ? o.revenue / elapsedDays : 0;
  const bestDay = activeDays.length > 0 ? [...activeDays].sort((a, b) => b.revenue - a.revenue)[0] : null;
  const projected = avgPerDay * daysInMonth(data.period.to);
  const pace = p.revenue > 0 ? (projected / p.revenue) * 100 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-7)" }}>
      {/* Greeting */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="eyebrow" style={{ color: "var(--fg-4)", display: "block" }}>{todayLabel}</span>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 500, fontStyle: "italic", color: "var(--fg)", fontFamily: "var(--font-display)", letterSpacing: "-0.005em", lineHeight: 1.1 }}>
            {firstName} — voici l’état du mois.
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--fg-3)" }}>
            {periodLabel} · toutes les boutiques · lecture seule
          </p>
        </div>
        <Link
          href="/reports"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--bronze)",
            textDecoration: "none",
          }}
        >
          Voir les rapports détaillés
          <ArrowRightIcon size={14} style={{ flexShrink: 0 }} />
        </Link>
      </div>

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--s-4)" }}>
        <Tile
          label="Revenue"
          value={money(o.revenue)}
          delta={revenueDelta.delta}
          deltaDir={revenueDelta.dir}
          hint={`vs ${prevLabel}`}
          tone={revenueDelta.dir === "down" ? "bad" : "good"}
        />
        <Tile
          label="Net Profit"
          value={money(o.netProfit)}
          delta={profitDelta.delta}
          deltaDir={profitDelta.dir}
          hint={`vs ${prevLabel}`}
          tone={o.netProfit >= 0 ? "good" : "bad"}
        />
        <Tile
          label="Marge"
          value={pct(o.margin)}
          hint="Résultat après charges et salaires"
          tone={o.margin >= 20 ? "good" : o.margin >= 0 ? undefined : "bad"}
        />
      </div>

      {/* Revenue trend + rhythm */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(260px, 0.8fr)", gap: "var(--s-4)", alignItems: "stretch" }}>
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: "var(--s-5)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <span className="eyebrow" style={{ color: "var(--fg-4)" }}>Revenu quotidien</span>
            <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{periodLabel}</span>
          </div>
          <Sparkline data={data.dailyTotals.map((d) => d.revenue)} color="var(--bronze)" />
        </div>

        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: "var(--s-5)", display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
          <span className="eyebrow" style={{ color: "var(--fg-4)" }}>Rythme du mois</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-4)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Moyenne / jour</span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>฿{fmtN(avgPerDay)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Meilleur jour</span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--good)", fontVariantNumeric: "tabular-nums" }}>
                {bestDay ? `฿${fmtN(bestDay.revenue)}` : "—"}
              </span>
              <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{bestDay ? dayLabel(bestDay.date) : ""}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: "var(--s-3)", borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Projection fin de mois</span>
            <span className="mono" style={{ fontSize: 22, fontWeight: 800, color: pace !== null && pace >= 100 ? "var(--good)" : "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
              ฿{fmtN(projected)}
            </span>
            <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
              {pace !== null ? `${pace.toFixed(0)}% du ${prevLabel}` : `vs ${prevLabel}`}
            </span>
          </div>
        </div>
      </div>

      {/* Shops ranking */}
      <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: "var(--s-5)", display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <span className="eyebrow" style={{ color: "var(--fg-4)" }}>Boutiques</span>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Revenu · marge</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
          {sortedShops.map((shop) => (
            <ShopBar key={shop.locationId} shop={shop} max={maxRevenue} />
          ))}
        </div>
      </div>
    </div>
  );
}