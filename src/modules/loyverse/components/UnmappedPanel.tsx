"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

type TopItem = { key: string; name: string | null; category: string | null; count: number; example_store: string };
type TopPay = { key: string; type: string | null; name: string | null; count: number; example_store: string };
type PerStore = {
  account_key: string;
  store_id: string;
  location_id: string | null;
  receipt_count: number;
  unmapped_line_items: number;
  unmapped_payments: number;
  top_items: { name: string | null; category: string | null; count: number }[];
  top_payments: { type: string | null; name: string | null; count: number }[];
};

export function UnmappedPanel({ date }: { date: string }) {
  const [perStore, setPerStore] = React.useState<PerStore[]>([]);
  const [topItems, setTopItems] = React.useState<TopItem[]>([]);
  const [topPays, setTopPays] = React.useState<TopPay[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/loyverse/preview/unmapped?date=${date}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Load failed");
        if (!cancelled) {
          setPerStore(j.per_store as PerStore[]);
          setTopItems(j.top_unmapped_items as TopItem[]);
          setTopPays(j.top_unmapped_payments as TopPay[]);
        }
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
          <div className="h-4 w-48 rounded bg-[var(--line-2)]" />
        </CardContent>
      </Card>
    );
  }
  if (error) return <div className="rounded border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>;

  const hasAny = topItems.length > 0 || topPays.length > 0 || perStore.some((s) => s.unmapped_line_items > 0 || s.unmapped_payments > 0);
  if (!hasAny) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-[var(--fg-3)]">Aucun unmapped pour {date} — mapping propre.</p>
          <p className="mt-1 text-xs text-[var(--fg-4)]">Tous les line_items et paiements sont bucketisés. Tu peux raffiner <code>mapping-config.ts</code> si besoin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[var(--fg-4)]">
        Triés par fréquence décroissante — corrige <code>CATEGORY_NAME_TO_BUCKET</code> / <code>PAYMENT_TYPE_KEYWORDS</code> dans{" "}
        <code>mapping-config.ts</code> puis resync.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Line items non mappés</CardTitle>
            <p className="text-xs text-[var(--fg-4)]">Top par catégorie + nom</p>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-sm text-[var(--fg-4)]">Aucun.</p>
            ) : (
              <ul className="space-y-1.5">
                {topItems.map((it) => (
                  <li key={it.key} className="flex items-center gap-2 text-sm">
                    <Pill tone="warn" size="sm">
                      ×{it.count}
                    </Pill>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--fg-2)]">
                      {it.category ? `[${it.category}] ` : ""}
                      {it.name ?? <span className="text-[var(--fg-4)]">(sans nom)</span>}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-[var(--fg-4)]">{it.example_store.slice(0, 8)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paiements non mappés</CardTitle>
            <p className="text-xs text-[var(--fg-4)]">Top par type + nom</p>
          </CardHeader>
          <CardContent>
            {topPays.length === 0 ? (
              <p className="text-sm text-[var(--fg-4)]">Aucun.</p>
            ) : (
              <ul className="space-y-1.5">
                {topPays.map((p) => (
                  <li key={p.key} className="flex items-center gap-2 text-sm">
                    <Pill tone="warn" size="sm">
                      ×{p.count}
                    </Pill>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--fg-2)]">
                      {p.type ? `${p.type}` : ""}
                      {p.type && p.name ? " · " : ""}
                      {p.name ?? <span className="text-[var(--fg-4)]">(sans nom)</span>}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-[var(--fg-4)]">{p.example_store.slice(0, 8)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détail par boutique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--fg-4)]">
                  <th className="pb-2 pr-3 font-medium">Store</th>
                  <th className="pb-2 pr-3 text-right font-medium">Receipts</th>
                  <th className="pb-2 pr-3 text-right font-medium">Lignes / paiements non mappés</th>
                  <th className="pb-2 font-medium">Top exemples</th>
                </tr>
              </thead>
              <tbody>
                {perStore.map((s) => (
                  <tr key={`${s.account_key}-${s.store_id}`} className="border-b border-[var(--line-2)] last:border-0">
                    <td className="py-2 pr-3">
                      <span className="font-mono text-xs text-[var(--fg-2)]">{s.store_id.slice(0, 8)}</span>
                      <span className="ml-2 text-xs text-[var(--fg-4)]">{s.account_key}</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{s.receipt_count}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">
                      {s.unmapped_line_items} / {s.unmapped_payments}
                    </td>
                    <td className="py-2 text-xs text-[var(--fg-3)]">
                      {s.top_items[0] ? `${s.top_items[0].name ?? "?"} (×${s.top_items[0].count})` : "—"}
                      {s.top_payments[0] ? ` · ${s.top_payments[0].name ?? s.top_payments[0].type ?? "?"} (×${s.top_payments[0].count})` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
