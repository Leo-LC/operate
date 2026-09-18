"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

type Row = {
  date: string;
  location_id: string;
  location_name: string | null;
  loyverse_total: number;
  accounting_total: number | null;
  diff: number;
  diff_pct: number;
  status: "match" | "mismatch" | "missing_snapshot" | "missing_entry";
};

function fmt(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

// Probation write-back (temporaire) : écart quotidien Loyverse vs daily_entries
// + compteur "X jours sans différence" + log persisté côté API.
export function ReconciliationPanel({ days = 7 }: { days?: number }) {
  const [data, setData] = React.useState<{
    cleanDaysStreak: number; mismatches: number; totalRows: number;
    probationComplete: boolean; probationTargetDays: number; rows: Row[];
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/loyverse/reconciliation?days=${days}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Load failed");
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [days]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8"><div className="h-4 w-48 rounded bg-[var(--line-2)]" /></CardContent>
      </Card>
    );
  }
  if (error) return <div className="rounded border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Probation write-back — {data.cleanDaysStreak} jour{data.cleanDaysStreak > 1 ? "s" : ""} sans écart
            {data.probationComplete ? " ✓ (7/7 — bascule full-auto OK)" : ` (objectif ${data.probationTargetDays}/7)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <Pill tone={data.mismatches === 0 ? "good" : "bad"}>
            {data.mismatches === 0 ? "aucun écart" : `${data.mismatches} écart${data.mismatches > 1 ? "s" : ""}`}
          </Pill>
          <Pill tone="neutral">{data.totalRows} lignes comparées</Pill>
          <button
            type="button"
            onClick={load}
            className="rounded-[var(--r-sm)] border border-[var(--line)] px-2 py-1 text-xs text-[var(--fg-3)]"
          >
            Re-vérifier
          </button>
          <span className="text-xs text-[var(--fg-4)]">
            Tolérance ฿1 (arrondis). Chaque vérification est loggée en base (loyverse_reconciliation_logs). Onglet temporaire : à retirer après 7 jours propres.
          </span>
        </CardContent>
      </Card>

      {data.rows.filter((r) => r.status !== "match").length > 0 && (
        <Card>
          <CardHeader><CardTitle>Écarts à investiguer</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--fg-4)]">
                  <th className="py-1 pr-3">Date</th>
                  <th className="py-1 pr-3">Shop</th>
                  <th className="py-1 pr-3 text-right">Loyverse</th>
                  <th className="py-1 pr-3 text-right">Accounting</th>
                  <th className="py-1 pr-3 text-right">Écart</th>
                  <th className="py-1 pr-3 text-right">%</th>
                  <th className="py-1">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.filter((r) => r.status !== "match").map((r) => (
                  <tr key={`${r.date}-${r.location_id}`} className="border-t border-[var(--line)]">
                    <td className="py-1 pr-3 mono">{r.date}</td>
                    <td className="py-1 pr-3">{r.location_name ?? r.location_id.slice(0, 8)}</td>
                    <td className="py-1 pr-3 text-right mono tabular-nums">{fmt(r.loyverse_total)}</td>
                    <td className="py-1 pr-3 text-right mono tabular-nums">{fmt(r.accounting_total)}</td>
                    <td className="py-1 pr-3 text-right mono tabular-nums">฿{fmt(r.diff)}</td>
                    <td className="py-1 pr-3 text-right mono tabular-nums">{r.diff_pct}%</td>
                    <td className="py-1">
                      <Pill tone={r.status === "missing_entry" ? "warn" : "bad"}>{r.status}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Historique (7 derniers jours, tous shops)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--fg-4)]">
                <th className="py-1 pr-3">Date</th>
                <th className="py-1 pr-3">Shop</th>
                <th className="py-1 pr-3 text-right">Loyverse</th>
                <th className="py-1 pr-3 text-right">Accounting</th>
                <th className="py-1">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={`${r.date}-${r.location_id}`} className="border-t border-[var(--line)]">
                  <td className="py-1 pr-3 mono">{r.date}</td>
                  <td className="py-1 pr-3">{r.location_name ?? r.location_id.slice(0, 8)}</td>
                  <td className="py-1 pr-3 text-right mono tabular-nums">{fmt(r.loyverse_total)}</td>
                  <td className="py-1 pr-3 text-right mono tabular-nums">{fmt(r.accounting_total)}</td>
                  <td className="py-1">
                    <Pill tone={r.status === "match" ? "good" : r.status.startsWith("missing") ? "warn" : "bad"}>
                      {r.status}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
