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
  width: "100%", height: 36, borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)", padding: "0 10px", fontSize: 14,
  background: "var(--bg-2)", color: "var(--fg)", outline: "none",
};

type ApplyMode = "enter" | "add" | "sub";

export function CashCounter({
  locations,
  onCashPositionChanged,
}: {
  locations: Location[];
  onCashPositionChanged: () => void;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [countedAt, setCountedAt] = useState(todayStr());
  // Running quantities per denomination — adjusted incrementally.
  const [qtys, setQtys] = useState<Record<string, number>>({});
  // Raw adjust input per denomination (e.g. "+200", "-30", "=500").
  const [adjusts, setAdjusts] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<CashCount[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => computeCashTotal(qtys), [qtys]);

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

  function applyAdjust(value: number, mode: ApplyMode) {
    const key = String(value);
    const raw = (adjusts[key] ?? "").trim();
    if (!raw) return;
    const current = qtys[key] ?? 0;
    let next: number;

    if (mode === "enter") {
      if (raw.startsWith("=")) {
        const n = Math.floor(Number(raw.slice(1)));
        if (!Number.isFinite(n) || n < 0) { toast.error("Invalid amount"); return; }
        next = n;
      } else {
        // "+200" / "200" adds, "-30" removes.
        const n = Math.floor(Number(raw));
        if (!Number.isFinite(n)) { toast.error("Invalid amount"); return; }
        next = Math.max(0, current + n);
      }
    } else {
      const n = Math.floor(Number(raw.replace(/^\+/, "")));
      if (!Number.isFinite(n)) { toast.error("Invalid amount"); return; }
      const mag = Math.abs(n);
      next = mode === "add" ? current + mag : Math.max(0, current - mag);
    }

    setQtys((q) => ({ ...q, [key]: next }));
    setAdjusts((a) => ({ ...a, [key]: "" }));
  }

  function reset() {
    setQtys({});
    setAdjusts({});
    setCountedAt(todayStr());
  }

  async function handleSave() {
    if (!locationId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/treasury/cash-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, counted_at: countedAt, counts: qtys }),
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
      {/* Centered header */}
      <div style={{ padding: "14px 16px 4px", textAlign: "center" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--fg-3)", letterSpacing: "-0.01em" }}>
          Cash counter
        </h3>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: 160 }}
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
            style={{ ...inputStyle, width: "auto" }}
            aria-label="Count date"
          />
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "12px 16px" }}>
        {([
          { kind: "note" as const, title: "Notes" },
          { kind: "coin" as const, title: "Coins" },
        ]).map(({ kind, title }) => (
          <div key={kind} style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-4)", textAlign: "center" }}>
              {title}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, justifyContent: "center" }}>
              {THB_DENOMINATIONS.filter((d) => d.kind === kind).map((d) => {
                const key = String(d.value);
                const qty = qtys[key] ?? 0;
                const line = qty * d.value;
                return (
                  <div key={key} style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "12px 10px", background: "transparent", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--fg)" }}>{d.label}</p>
                    <p className="mono tabular-nums" style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, color: qty > 0 ? "var(--fg)" : "var(--fg-4)" }}>
                      ×{qty}
                    </p>
                    <p className="mono tabular-nums" style={{ margin: "2px 0 10px", fontSize: 14, fontWeight: 600, color: "var(--fg-3)" }}>
                      {line > 0 ? fmt(line) : "—"}
                    </p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="+ / −"
                        value={adjusts[key] ?? ""}
                        onChange={(e) => setAdjusts((a) => ({ ...a, [key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") applyAdjust(d.value, "enter"); }}
                        style={{ ...inputStyle, textAlign: "center" }}
                        aria-label={`Add or remove ${d.label}`}
                      />
                      <Button size="sm" onClick={() => applyAdjust(d.value, "add")} aria-label={`Add ${d.label}`}>+</Button>
                      <Button size="sm" variant="secondary" onClick={() => applyAdjust(d.value, "sub")} aria-label={`Remove ${d.label}`}>−</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--fg-4)", textAlign: "center" }}>
          Type an amount per denomination and press Enter or + / − : <span className="mono">+200</span> adds, <span className="mono">−30</span> removes, <span className="mono">=500</span> sets.
        </p>

        {/* Hero total */}
        <div style={{ textAlign: "center", padding: "16px 0 6px" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fg-4)" }}>
            Total
          </p>
          <p className="mono tabular-nums" style={{ margin: "4px 0 14px", fontSize: 48, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--fg)" }}>
            {fmt(total)}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Button size="lg" variant="secondary" onClick={reset}>Reset</Button>
            <Button size="lg" onClick={() => void handleSave()} disabled={saving || !locationId || total <= 0}>
              {saving ? "…" : "Save count"}
            </Button>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--line)", marginTop: 8 }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <p style={{ margin: 0, padding: "10px 16px 0", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", textAlign: "center" }}>
            History
          </p>
          {loadingHistory ? (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--fg-4)", textAlign: "center" }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--fg-4)", textAlign: "center" }}>
              No counts saved for this shop yet.
            </div>
          ) : (
            history.slice(0, 10).map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                  <p style={{ margin: 0, fontSize: 15, color: "var(--fg)" }}>
                    <span className="mono tabular-nums" style={{ fontWeight: 700 }}>{fmt(c.total)}</span>
                    <span style={{ color: "var(--fg-4)", fontSize: 12 }}> · {c.counted_at}</span>
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fg-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {breakdown(c.counts)}
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
    </div>
  );
}
