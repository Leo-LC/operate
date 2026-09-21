"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PillButton } from "@/components/ui/pill-button";
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import {
  addDays,
  bangkokToday,
  bangkokYesterday,
  capitalizeShop,
  datesInRange,
} from "@/lib/loyverse/dates";
import {
  COMPUTED_COLS,
  COLUMN_LABELS,
  VISIBLE_COLUMNS,
  buildAccountingValues,
  buildCopyLine,
  buildCopyText,
  formatDateDDMMYYYY,
  type SnapshotLike,
} from "@/modules/loyverse/lib/accounting-copy";

type ShiftRow = {
  id: string;
  store_id: string;
  date: string;
  shifts: Record<string, unknown>[];
  shift_count: number;
};

type SnapshotRow = SnapshotLike & {
  id: string;
  store_id: string;
  date: string;
};

type Shop = { store_id: string; account_key: string };

const VISIBLE = VISIBLE_COLUMNS as unknown as string[];
const MAX_DAYS = 31;

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

const inputStyle: React.CSSProperties = {
  height: 32,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)",
  background: "transparent",
  color: "var(--fg)",
  padding: "0 var(--s-2)",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  outline: "none",
};

export function AccountingCopyRange() {
  const today = bangkokToday();
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
  const [copiedAll, setCopiedAll] = React.useState(false);
  const [copiedDay, setCopiedDay] = React.useState<string | null>(null);

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
          (dashRes?.per_store as { store_id: string; account_key: string }[] | undefined) ?? [];
        const map = new Map<string, Shop>();
        for (const s of perStore) map.set(s.store_id, { store_id: s.store_id, account_key: s.account_key });
        if (map.size === 0 && statusRes?.accounts) {
          for (const a of statusRes.accounts as { key: string }[]) {
            if (!map.has(a.key)) map.set(a.key, { store_id: a.key, account_key: a.key });
          }
        }
        const list = Array.from(map.values()).sort((a, b) => a.account_key.localeCompare(b.account_key));
        if (!cancelled) {
          setShops(list);
          if (list.length > 0) setSelectedStore((prev) => prev ?? list[0]!.store_id);
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

  // Refetch when range changes (debounced by explicit Load + auto on valid change)
  React.useEffect(() => {
    if (invalidRange || rangeClamped) return;
    if (!from || !to) return;
    void fetchRange(from, to);
  }, [from, to, invalidRange, rangeClamped, fetchRange]);

  const shiftByDate = React.useMemo(() => {
    const m = new Map<string, ShiftRow[]>();
    for (const r of shiftRows) {
      if (r.store_id !== selectedStore) continue;
      const arr = m.get(r.date) ?? [];
      arr.push(r);
      m.set(r.date, arr);
    }
    return m;
  }, [shiftRows, selectedStore]);

  const snapshotByDate = React.useMemo(() => {
    const m = new Map<string, SnapshotRow>();
    for (const r of snapshotRows) {
      if (r.store_id !== selectedStore) continue;
      if (!m.has(r.date)) m.set(r.date, r);
    }
    return m;
  }, [snapshotRows, selectedStore]);

  const rows = React.useMemo(() => {
    return days.map((date) => {
      const sRows = shiftByDate.get(date) ?? [];
      const snapshot = snapshotByDate.get(date) ?? null;
      const rawShift = (sRows[0]?.shifts?.[0] as Record<string, unknown> | undefined) ?? null;
      const values = buildAccountingValues(rawShift, snapshot, date, paymentMap);
      return { date, values, line: buildCopyLine(values), hasData: Boolean(rawShift || snapshot) };
    });
  }, [days, shiftByDate, snapshotByDate, paymentMap]);

  const dataRows = rows.filter((r) => r.hasData);
  const missingCount = rows.length - dataRows.length;

  async function handleCopyAll() {
    if (dataRows.length === 0) return;
    await copyToClipboard(buildCopyText(dataRows.map((r) => r.line)));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  }

  async function handleCopyDay(date: string, line: string) {
    await copyToClipboard(line);
    setCopiedDay(date);
    setTimeout(() => setCopiedDay(null), 1800);
  }

  async function handleForceSync() {
    if (days.length === 0) return;
    setForceSyncing(true);
    setForceProgress(null);
    setError(null);
    try {
      // ≤5 explicit dates => manual path re-syncs everything (no skip-existing).
      // Chunk the range so mapping fixes can be replayed over already-synced days.
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Controls: shop + range + actions */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "var(--s-3)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-4)" }}>Shop</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {shops.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Chargement shops…</span>
            ) : (
              shops.map((shop) => (
                <PillButton
                  key={shop.store_id}
                  active={selectedStore === shop.store_id}
                  onClick={() => setSelectedStore(shop.store_id)}
                  style={{ textTransform: "capitalize" }}
                >
                  {capitalizeShop(shop.account_key)}
                </PillButton>
              ))
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: "var(--s-2)" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-4)" }}>Du</span>
            <input type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-4)" }}>Au</span>
            <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
          </label>
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
            title="Re-synchronise tous les jours de la plage, même déjà synchronisés — utile après un changement de mapping (ex: rename Snacks → Animal food)"
          >
            <RefreshCwIcon size={13} />
            {forceSyncing ? (forceProgress ?? "Re-sync…") : "Forcer re-sync"}
          </Button>
          <Button size="sm" onClick={handleCopyAll} disabled={dataRows.length === 0}>
            {copiedAll ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
            {copiedAll ? "copié" : `copier ${dataRows.length} ligne${dataRows.length > 1 ? "s" : ""}`}
          </Button>
        </div>
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

      {/* Multi-day table */}
      {!selectedStore ? (
        <p style={{ fontSize: 13, color: "var(--fg-4)", textAlign: "center", padding: "24px 0" }}>
          Sélectionne un shop ci-dessus.
        </p>
      ) : loading ? (
        <div className="animate-pulse" style={{ height: 120, borderRadius: "var(--r-md)", background: "var(--line-2)" }} />
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--fg-4)", textAlign: "center", padding: "24px 0" }}>
          Choisis une plage de dates.
        </p>
      ) : (
        <div style={{ overflow: "auto", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg-2)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--fg-4)" }}>
                <th style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "left", fontWeight: 500 }}>Date</th>
                {VISIBLE.map((c) => (
                  <th key={c} title={c} style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "left", fontWeight: 500 }}>
                    {COLUMN_LABELS[c] ?? c}
                    {COMPUTED_COLS.has(c) ? " *" : ""}
                  </th>
                ))}
                <th style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "right", fontWeight: 500 }}>Copier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ date, values, line, hasData }) => (
                <tr key={date} style={{ borderTop: "1px solid var(--line)", background: hasData ? "var(--surface)" : "var(--bg-2)", opacity: hasData ? 1 : 0.75 }}>
                  <td className="mono tabular-nums" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontWeight: 500 }}>
                    {formatDateDDMMYYYY(date)}
                  </td>
                  {VISIBLE.map((c) => {
                    const v = values[c];
                    const isComputed = COMPUTED_COLS.has(c);
                    const isEmpty = v === "";
                    return (
                      <td
                        key={c}
                        className="mono tabular-nums"
                        style={{
                          whiteSpace: "nowrap",
                          padding: "8px 10px",
                          color: isComputed || isEmpty ? "var(--fg-4)" : "var(--fg)",
                          fontWeight: !isComputed && !isEmpty ? 500 : 400,
                        }}
                      >
                        {isEmpty ? "—" : v}
                      </td>
                    );
                  })}
                  <td style={{ whiteSpace: "nowrap", padding: "6px 10px", textAlign: "right" }}>
                    {hasData ? (
                      <Button size="sm" variant="secondary" onClick={() => void handleCopyDay(date, line)} title={`Copier la ligne du ${formatDateDDMMYYYY(date)}`}>
                        {copiedDay === date ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                      </Button>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>à synchroniser</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--fg-4)" }}>
          {dataRows.length} jour{dataRows.length > 1 ? "s" : ""} avec données
          {missingCount > 0 ? ` · ${missingCount} jour${missingCount > 1 ? "s" : ""} sans données (synchronise la plage)` : ""} ·
          même format que Shift &amp; Sales (Drinks → CC, tabulations, une ligne par jour).
        </p>
      )}
    </div>
  );
}
