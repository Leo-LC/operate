"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}
function fmtTHB(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

type Row = {
  account_key: string;
  store_id: string;
  location_id: string | null;
  location_name: string | null;
  date: string;
  loyverse: { entry_count: number; snacks_sold: number; panier: number; revenue: number; merch_pct: number; snacks_ratio: number };
  thresholds: {
    revenue_threshold: number | null;
    revenue_gated: boolean | null;
    snacks_threshold: number;
    snacks_pass: boolean;
    panier_threshold: number;
    panier_pass: boolean;
    merch_tier: { threshold: number; bonus: number } | null;
    merch_pass: boolean;
  };
};

export function ChallengesPreview({ date }: { date: string }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/loyverse/preview/challenges?date=${date}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Load failed");
        if (!cancelled) setRows(j.preview as Row[]);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-4 w-40 rounded bg-[var(--line-2)]" />
        </CardContent>
      </Card>
    );
  }
  if (error) return <div className="rounded border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>;
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-[var(--fg-3)]">Pas de snapshots pour {date}.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[var(--fg-4)]">
        Panier = <code>revenue / entry_count</code> (revenue = sum sales net, VAT-inclus, jamais + <code>vat_7</code> — cf <code>challenges/AGENTS.md</code>). Seuils <code>constants.ts</code>.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <Card key={`${row.account_key}-${row.store_id}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-[14px]">{row.location_name ?? row.store_id}</CardTitle>
                <span className="text-xs text-[var(--fg-4)]">{row.account_key}</span>
              </div>
              <p className="text-xs text-[var(--fg-4)]">
                Revenue {fmtTHB(row.loyverse.revenue)}{row.thresholds.revenue_threshold !== null ? ` / seuil ${fmtTHB(row.thresholds.revenue_threshold)}` : ""} · {row.loyverse.entry_count} entrées · {row.loyverse.snacks_sold} snacks
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded bg-[var(--bg-2)] px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Entrées</p>
                  <p className="font-mono text-sm font-semibold tabular-nums">{fmt(row.loyverse.entry_count)}</p>
                  {row.thresholds.revenue_gated !== null && (
                    <Pill tone={row.thresholds.revenue_gated ? "good" : "warn"} size="sm" className="mt-1">
                      {row.thresholds.revenue_gated ? "sales OK" : "sales KO"}
                    </Pill>
                  )}
                </div>
                <div className="rounded bg-[var(--bg-2)] px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Snacks / entrée</p>
                  <p className="font-mono text-sm font-semibold tabular-nums">{row.loyverse.entry_count > 0 ? fmtPct(row.loyverse.snacks_ratio) : "—"}</p>
                  <Pill tone={row.thresholds.snacks_pass ? "good" : "warn"} size="sm" className="mt-1">
                    {row.thresholds.snacks_pass ? "≥ 45%" : "< 45%"}
                  </Pill>
                </div>
                <div className="rounded bg-[var(--bg-2)] px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Panier</p>
                  <p className="font-mono text-sm font-semibold tabular-nums">{fmtTHB(row.loyverse.panier)}</p>
                  <Pill tone={row.thresholds.panier_pass ? "good" : "warn"} size="sm" className="mt-1">
                    {row.thresholds.panier_pass ? "≥ 190" : "< 190"}
                  </Pill>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[var(--fg-3)]">Merch {fmtPct(row.loyverse.merch_pct)}</span>
                {row.thresholds.merch_tier ? (
                  <Pill tone="good" size="sm">
                    tier {(row.thresholds.merch_tier.threshold * 100).toFixed(0)}% → +{fmt(row.thresholds.merch_tier.bonus)}
                  </Pill>
                ) : (
                  <Pill tone="warn" size="sm">
                    merch &lt; 7%
                  </Pill>
                )}
              </div>
              <p className="text-[11px] leading-snug text-[var(--fg-4)]">
                Snacks, panier, merch sont gatés par le seuil ventes. Seul merch % est évalué même si sales KO — cf AGENTS.md.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
