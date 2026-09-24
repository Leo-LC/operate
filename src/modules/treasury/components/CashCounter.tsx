"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  THB_DENOMINATIONS,
  computeCashTotal,
  type DenomCounts,
} from "@/modules/treasury/lib/denominations";

interface Location {
  id: string;
  name: string;
}

interface CashCount {
  id: string;
  location_id: string;
  counted_at: string;
  counts: DenomCounts;
  total: number;
  notes: string | null;
}

function fmt(n: number): string {
  const opts = Number.isInteger(n)
    ? undefined
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return "฿" + n.toLocaleString("en", opts);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compact "2×1000, 3×100, …" summary, skipping zero qtys. */
function breakdown(counts: DenomCounts): string {
  const parts: string[] = [];
  for (const d of THB_DENOMINATIONS) {
    const qty = counts[String(d.value)] ?? 0;
    if (qty > 0) parts.push(`${qty}×${d.label}`);
  }
  return parts.join(", ") || "—";
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 32, borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)", padding: "0 8px", fontSize: 13,
  background: "var(--bg-2)", color: "var(--fg)", outline: "none",
};

export function CashCounter({
  locations,
  onCashPositionChanged,
}: {
  locations: Location[];
  onCashPositionChanged: () => void;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [countedAt, setCountedAt] = useState(todayStr());
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<CashCount[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const numericCounts: DenomCounts = useMemo(() => {
    const out: DenomCounts = {};
    for (const d of THB_DENOMINATIONS) {
      const q = Math.floor(Number(qtys[String(d.value)] ?? 0));
      if (Number.isFinite(q) && q > 0) out[String(d.value)] = q;
    }
    return out;
  }, [qtys]);

  const notesTotal = useMemo(
    () => computeCashTotal(Object.fromEntries(
      Object.entries(numericCounts).filter(([k]) => Number(k) >= 20),
    )),
    [numericCounts],
  );
  const total = useMemo(() => computeCashTotal(numericCounts), [numericCounts]);
  const coinsTotal = Math.round((total - notesTotal) * 100) / 100;

  const loadHistory = useCallback(async (locId: string) => {
    if (!locId) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/treasury/cash-counts?location_id=${locId}`);
      if (res.ok) {
        const json = await res.json() as { cashCounts: CashCount[] };
        setHistory(json.cashCounts ?? []);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { void loadHistory(locationId); }, [locationId, loadHistory]);

  // Keep selected shop valid if the location list loads after mount.
  useEffect(() => {
    if (!locationId && locations[0]) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  function setQty(value: number, raw: string) {
    setQtys((q) => ({ ...q, [String(value)]: raw }));
  }

  function reset() {
    setQtys({});
    setNotes("");
    setCountedAt(todayStr());
  }

  async function handleSave() {
    if (!locationId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/treasury/cash-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, counted_at: countedAt, counts: numericCounts, notes }),
      });
      if (!res.ok) { toast.error("Save failed"); return; }
      toast.success(`Count saved — ${fmt(total)}`);
      reset();
      await loadHistory(locationId);
    } finally {
      setSaving(false);
    }
  }

  async function handleUseAsCashOnHand(count: CashCount) {
    const res = await fetch("/api/treasury/cash-positions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_id: count.location_id,
        cash_on_hand: count.total,
        last_count_date: count.counted_at,
      }),
    });
    if (!res.ok) { toast.error("Update failed"); return; }
    toast.success("Cash on hand updated from count");
    onCashPositionChanged();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this count?")) return;
    await fetch("/api/treasury/cash-counts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadHistory(locationId);
  }

  if (locations.length === 0) return null;

  return (
    <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "transparent", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        padding: "10px 16px", borderBottom: "1px solid var(--line)",
      }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--fg-3)", letterSpacing: "-0.01em" }}>
          Cash counter
        </h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            style={{ ...inputStyle, width: "auto", height: 30, fontSize: 12 }}
            aria-label="Shop"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name.replace(/^Capybara Coffee\s*/i, "").trim() || l.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={countedAt}
            onChange={(e) => setCountedAt(e.target.value)}
            style={{ ...inputStyle, width: "auto", height: 30, fontSize: 12 }}
            aria-label="Count date"
          />
        </div>
      </div>

      <div style={{ padding: "12px 16px" }}>
        {([
          { kind: "note" as const, title: "Notes" },
          { kind: "coin" as const, title: "Coins" },
        ]).map(({ kind, title }) => (
          <div key={kind} style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)" }}>
              {title}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
              {THB_DENOMINATIONS.filter((d) => d.kind === kind).map((d) => {
                const key = String(d.value);
                const qty = Math.floor(Number(qtys[key] ?? 0));
                const line = Number.isFinite(qty) && qty > 0 ? qty * d.value : 0;
                return (
                  <div key={key} style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "6px 8px", background: "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{d.label}</span>
                      <span className="mono tabular-nums" style={{ fontSize: 11, color: line > 0 ? "var(--fg-2)" : "var(--fg-4)" }}>
                        {line > 0 ? fmt(line) : "—"}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      placeholder="0"
                      value={qtys[key] ?? ""}
                      onChange={(e) => setQty(d.value, e.target.value)}
                      style={{ ...inputStyle, height: 30, textAlign: "right" }}
                      aria-label={`Quantity of ${d.label}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optional) — e.g. evening till, safe drop…"
          style={{ ...inputStyle, marginBottom: 10 }}
          aria-label="Count note"
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>
            Notes <span className="mono tabular-nums">{fmt(notesTotal)}</span>
            {" · "}Coins <span className="mono tabular-nums">{fmt(coinsTotal)}</span>
          </span>
          <span className="mono tabular-nums" style={{ marginLeft: "auto", fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>
            {fmt(total)}
          </span>
          <Button size="sm" variant="secondary" onClick={reset}>Reset</Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving || !locationId || total <= 0}>
            {saving ? "…" : "Save count"}
          </Button>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--line)" }}>
        <p style={{ margin: 0, padding: "8px 16px 0", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)" }}>
          History
        </p>
        {loadingHistory ? (
          <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--fg-4)" }}>Loading…</div>
        ) : history.length === 0 ? (
          <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--fg-4)" }}>
            No counts saved for this shop yet.
          </div>
        ) : (
          history.slice(0, 10).map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--fg)" }}>
                  <span className="mono tabular-nums" style={{ fontWeight: 600 }}>{fmt(c.total)}</span>
                  <span style={{ color: "var(--fg-4)", fontSize: 12 }}> · {c.counted_at}</span>
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--fg-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {breakdown(c.counts)}{c.notes ? ` · ${c.notes}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <Button size="sm" variant="secondary" onClick={() => void handleUseAsCashOnHand(c)}>
                  Use as cash on hand
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void handleDelete(c.id)}>×</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
