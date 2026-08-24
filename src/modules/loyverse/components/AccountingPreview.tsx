"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

function fmt(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

type FieldDiff = {
  field: string;
  label: string;
  proposed: number | null;
  existing: number | null;
  delta: number | null;
};

type Row = {
  account_key: string;
  store_id: string;
  location_id: string | null;
  location_name: string | null;
  date: string;
  proposed: Record<string, number>;
  existing: Record<string, unknown> | null;
  diffs: FieldDiff[];
  meta: { receipt_count: number; unmapped_line_items: number; unmapped_payments: number };
};

export function AccountingPreview({ date }: { date: string }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/loyverse/preview/accounting?date=${date}`, { cache: "no-store" })
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
      <div className="grid gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-8">
              <div className="h-4 w-32 rounded bg-[var(--line-2)]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if (error) return <div className="rounded border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>;
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-[var(--fg-3)]">Pas de snapshots pour {date}.</p>
          <p className="mt-1 text-xs text-[var(--fg-4)]">Lance une synchronisation depuis le dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[var(--fg-4)]">
        Lecture seule — Proposed (Loyverse) vs Saisie manuelle (Google Sheets via <code>daily_entries</code>). Écart = proposé − existant.
      </p>
      {rows.map((row) => (
        <Card key={`${row.account_key}-${row.store_id}`}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-[14px]">{row.location_name ?? row.store_id}</CardTitle>
              <span className="text-xs text-[var(--fg-4)]">
                {row.account_key} · {row.location_id ? row.location_id.slice(0, 8) : "non mappé"} · {row.meta.receipt_count} receipts
              </span>
              {(row.meta.unmapped_line_items > 0 || row.meta.unmapped_payments > 0) && (
                <Pill tone="warn" size="sm">
                  {row.meta.unmapped_line_items} lignes / {row.meta.unmapped_payments} paiements non mappés
                </Pill>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--fg-4)]">
                    <th className="pb-2 pr-3 font-medium">Champ</th>
                    <th className="pb-2 pr-3 text-right font-medium">Proposé (Loyverse)</th>
                    <th className="pb-2 pr-3 text-right font-medium">Existant (Sheets)</th>
                    <th className="pb-2 text-right font-medium">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {row.diffs.map((d) => {
                    const isZeroDelta = d.delta === 0;
                    const hasExisting = d.existing !== null;
                    return (
                      <tr key={d.field} className="border-b border-[var(--line-2)] last:border-0">
                        <td className="py-1.5 pr-3 text-[13px] text-[var(--fg-2)]">{d.label}</td>
                        <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-[var(--fg)]">{fmt(d.proposed)}</td>
                        <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-[var(--fg-3)]">{fmt(d.existing as number | null)}</td>
                        <td className="py-1.5 text-right">
                          {!hasExisting ? (
                            <Pill tone="neutral" size="sm">
                              nouveau
                            </Pill>
                          ) : (
                            <span
                              className="font-mono tabular-nums text-xs"
                              style={{ color: isZeroDelta ? "var(--good)" : "var(--warn)" }}
                            >
                              {d.delta !== null ? (d.delta > 0 ? `+${fmt(d.delta)}` : fmt(d.delta)) : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!row.location_id && <p className="mt-3 text-xs text-[var(--warn)]">Store non mappé → pas de daily_entries à comparer. Renseigne LOYVERSE_STORE_TO_LOCATION.</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
