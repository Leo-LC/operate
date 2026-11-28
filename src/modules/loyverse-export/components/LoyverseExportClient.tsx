"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { DateRangePicker, ShopSingleSelect } from "@/components/ui/filters";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ArrowLeftRightIcon, RefreshCwIcon, TableIcon } from "lucide-react";
import {
  addDays,
  bangkokToday,
  bangkokYesterday,
  capitalizeShop,
  datesInRange,
} from "@/lib/loyverse/dates";
import { ExportCopyTab } from "./ExportCopyTab";
import { PayInOutTab } from "./PayInOutTab";
import type { SnapshotLike } from "@/modules/loyverse/lib/accounting-copy";

export type ShiftRow = {
  id: string;
  store_id: string;
  location_id?: string | null;
  date: string;
  shifts: Record<string, unknown>[];
  shift_count: number;
};

export type SnapshotRow = SnapshotLike & {
  id: string;
  store_id: string;
  location_id?: string | null;
  date: string;
  revenue_total?: number | string | null;
  receipt_count?: number | string | null;
};

/**
 * A shop is a Nexus location, not a single Loyverse store_id: when the POS is
 * swapped mid-history (new store_id in Loyverse), the snapshots of previous
 * days keep the old store_id. Grouping all store_ids of the same location
 * keeps the full history visible under one shop entry.
 */
type Shop = { key: string; name: string; storeIds: string[] };

type ExportTab = "copy" | "pay";

const TABS: Array<{ id: ExportTab; label: string }> = [
  { id: "copy", label: "Sales & Payments → Accounting" },
  { id: "pay", label: "Pay in / Pay out" },
];

const MAX_DAYS = 31;

export function LoyverseExportClient() {
  const today = bangkokToday();
  const [tab, setTab] = React.useState<ExportTab>("copy");
  const [to, setTo] = React.useState(() => bangkokYesterday());
  const [from, setFrom] = React.useState(() => addDays(bangkokYesterday(), -6));
  const [shops, setShops] = React.useState<Shop[]>([]);
  const [selectedStore, setSelectedStore] = React.useState<string | null>(null);
  const [shiftRows, setShiftRows] = React.useState<ShiftRow[]>([]);
  const [snapshotRows, setSnapshotRows] = React.useState<SnapshotRow[]>([]);
  const [paymentMap, setPaymentMap] = React.useState<Map<string, string>>(new Map());
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [forceSyncing, setForceSyncing] = React.useState(false);
  const [forceProgress, setForceProgress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Shops — same source as Shift & Sales (Loyverse stores)
  React.useEffect(() => {
    let cancelled = false;
    async function loadShops() {
      try {
        const [dashRes, statusRes] = await Promise.all([
          fetch(`/api/loyverse/dashboard?days=30&date=${bangkokToday()}`, { cache: "no-store" }).then(
            (r) => r.json(),
          ),
          fetch("/api/loyverse/status", { cache: "no-store" })
            .then((r) => r.json())
            .catch(() => null),
        ]);
        const perStore =
          (dashRes?.per_store as
            | { store_id: string; account_key: string; location_id: string | null }[]
            | undefined) ?? [];
        const map = new Map<string, Shop>();
        for (const s of perStore) {
          const key = s.location_id ?? s.store_id;
          const existing = map.get(key);
          if (existing) {
            if (!existing.storeIds.includes(s.store_id)) existing.storeIds.push(s.store_id);
          } else {
            map.set(key, { key, name: capitalizeShop(s.account_key), storeIds: [s.store_id] });
          }
        }
        if (map.size === 0 && statusRes?.accounts) {
          for (const a of statusRes.accounts as { key: string }[]) {
            if (!map.has(a.key)) map.set(a.key, { key: a.key, name: capitalizeShop(a.key), storeIds: [a.key] });
          }
        }
        const list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) {
          setShops(list);
          if (list.length > 0) setSelectedStore((prev) => prev ?? list[0]!.key);
        }
      } catch {
        /* shops stay empty, error shown on range fetch */
      }
    }
    void loadShops();
    return () => {
      cancelled = true;
    };
  }, []);

  // Payment type labels for bucketing
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/loyverse/payment-types", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const m = new Map<string, string>();
        for (const pt of (j.payment_types as { id: string; name?: string; type?: string }[]) ?? []) {
          m.set(pt.id, pt.name ?? pt.type ?? pt.id);
        }
        setPaymentMap(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const days = React.useMemo(() => {
    if (from > to) return [];
    const all = datesInRange(from, to);
    return all.length > MAX_DAYS ? all.slice(0, MAX_DAYS) : all;
  }, [from, to]);
  const rangeClamped = React.useMemo(() => {
    if (from > to) return false;
    return datesInRange(from, to).length > MAX_DAYS;
  }, [from, to]);
  const invalidRange = from > to;

  // All Loyverse store_ids belonging to the selected shop (location group),
  // including any other store of the same location seen in the loaded rows —
  // covers a POS swap whose old store is no longer in the 30d dashboard window.
  const storeFilter = React.useMemo(() => {
    const shop = shops.find((s) => s.key === selectedStore);
    if (!shop) return null;
    const set = new Set(shop.storeIds);
    for (const r of [...snapshotRows, ...shiftRows]) {
      if (set.has(r.store_id)) continue;
      if (r.location_id && r.location_id === shop.key) set.add(r.store_id);
    }
    return set;
  }, [shops, selectedStore, snapshotRows, shiftRows]);

  const fetchRange = React.useCallback(async (f: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loyverse/day-range?from=${f}&to=${t}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Load failed");
      setShiftRows((j.shifts as ShiftRow[]) ?? []);
      setSnapshotRows((j.snapshots as SnapshotRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when range changes (auto on valid change)
  React.useEffect(() => {
    if (invalidRange || rangeClamped) return;
    if (!from || !to) return;
    void fetchRange(from, to);
  }, [from, to, invalidRange, rangeClamped, fetchRange]);

  async function handleForceSync() {
    if (days.length === 0) return;
    setForceSyncing(true);
    setForceProgress(null);
    setError(null);
    try {
      // Small chunks (2 days) to stay under serverless timeouts — upserts are
      // idempotent so a failed chunk can simply be retried.
      const chunks: string[][] = [];
      for (let i = 0; i < days.length; i += 2) chunks.push(days.slice(i, i + 2));
      for (let i = 0; i < chunks.length; i++) {
        setForceProgress(`Sync ${i + 1}/${chunks.length}…`);
        const res = await fetch("/api/loyverse/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dates: chunks[i] }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? `Sync failed (partie ${i + 1})`);
      }
      await fetchRange(from, to);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setForceSyncing(false);
      setForceProgress(null);
    }
  }

  async function handleSync() {
    if (days.length === 0) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/loyverse/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: days }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Sync failed");
      await fetchRange(from, to);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="lov" style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <header className="ui-module-header">
        <nav aria-label="Breadcrumb">
          <ol className="ui-breadcrumb">
            <li>
              <span aria-current="page">Loyverse Export</span>
            </li>
          </ol>
        </nav>
        <div className="ui-module-header-row">
          <h1 className="ui-module-title">Loyverse Export</h1>
        </div>
      </header>

      {/* Single shop + daterange selector (shared by both tabs) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "var(--s-3)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-4)" }}>Shop</span>
            {shops.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Chargement shops…</span>
            ) : (
              <ShopSingleSelect
                options={shops.map((shop) => ({ id: shop.key, name: shop.name }))}
                value={selectedStore ?? ""}
                onChange={(id) => setSelectedStore(id || null)}
              />
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "var(--s-3)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-4)" }}>Période</span>
            <DateRangePicker value={{ from, to }} onChange={(range) => { setFrom(range.from); setTo(range.to); }} today={today} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)", marginLeft: "auto" }}>
            <Button size="sm" variant="secondary" onClick={handleSync} disabled={syncing || forceSyncing || loading || days.length === 0}>
              <RefreshCwIcon size={13} />
              {syncing ? "Synchronisation…" : `Synchroniser${days.length > 1 ? ` (${days.length} j)` : ""}`}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleForceSync}
              disabled={syncing || forceSyncing || loading || days.length === 0}
              title="Re-télécharge chaque jour de la période depuis Loyverse et écrase les données locales — utile après un changement de mapping"
            >
              <RefreshCwIcon size={13} />
              {forceSyncing ? (forceProgress ?? "Re-sync…") : "Forcer re-sync"}
            </Button>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--fg-4)", margin: 0 }}>
          <strong style={{ fontWeight: 500, color: "var(--fg-3)" }}>Synchroniser</strong> — complète les jours de la période
          absents ou incomplets en base (&lt;= 5 jours : tout est re-téléchargé).{" "}
          <strong style={{ fontWeight: 500, color: "var(--fg-3)" }}>Forcer re-sync</strong> — re-télécharge chaque jour de la
          période depuis Loyverse et écrase les données locales, même déjà synchronisées (après un changement de mapping ou de
          catalogue).
        </p>
      </div>

      {invalidRange && (
        <p style={{ fontSize: 12, color: "var(--warn)" }}>La date de début doit être avant la date de fin.</p>
      )}
      {rangeClamped && (
        <p style={{ fontSize: 12, color: "var(--warn)" }}>
          Plage limitée à {MAX_DAYS} jours — seuls les {MAX_DAYS} premiers jours sont affichés.
        </p>
      )}
      {error && (
        <div style={{ borderRadius: "var(--r-sm)", border: "1px solid var(--bad-soft)", background: "var(--bad-soft)", padding: "8px 12px", fontSize: 13, color: "var(--bad)" }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
        <ViewToggle
          value={tab}
          onChange={setTab}
          options={TABS.map(({ id, label }) => ({
            value: id,
            label,
            icon: id === "copy" ? TableIcon : ArrowLeftRightIcon,
          }))}
          ariaLabel="Loyverse export view"
        />
      </div>

      {tab === "copy" ? (
        <ExportCopyTab
          days={days}
          selectedStore={selectedStore}
          storeFilter={storeFilter}
          shiftRows={shiftRows}
          snapshotRows={snapshotRows}
          paymentMap={paymentMap}
          loading={loading}
        />
      ) : (
        <PayInOutTab
          days={days}
          selectedStore={selectedStore}
          storeFilter={storeFilter}
          shiftRows={shiftRows}
          loading={loading}
        />
      )}
    </div>
  );
}
