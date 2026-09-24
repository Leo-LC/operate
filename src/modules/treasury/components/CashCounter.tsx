"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
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

function shortName(name: string): string {
  return name.replace(/^Capybara Coffee\s*/i, "").trim() || name;
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

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";

export function CashCounter({
  locations,
  onCashPositionChanged,
}: {
  locations: Location[];
  onCashPositionChanged: () => void;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [countedAt, setCountedAt] = useState(todayStr());
  // Committed quantities per denomination.
  const [qtys, setQtys] = useState<Record<string, number>>({});
  // In-progress typing per denomination; absent = showing committed value.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<CashCount[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const shortcutsRef = useRef<HTMLDivElement>(null);

  const total = useMemo(() => computeCashTotal(qtys), [qtys]);
  const countedDenoms = useMemo(
    () => THB_DENOMINATIONS.filter((d) => (qtys[String(d.value)] ?? 0) > 0).length,
    [qtys],
  );
  const activeLocation = locations.find((l) => l.id === locationId);

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

  // Close the shortcuts popover on outside click.
  useEffect(() => {
    if (!shortcutsOpen) return;
    function onDown(e: MouseEvent) {
      if (!shortcutsRef.current?.contains(e.target as Node)) setShortcutsOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [shortcutsOpen]);

  function focusAndSelect(key: string) {
    const el = inputRefs.current[key];
    if (!el) return;
    el.focus();
    el.select();
  }

  function commitQty(key: string, next: number) {
    setQtys((q) => ({ ...q, [key]: next }));
    setDrafts((d) => ({ ...d, [key]: String(next) }));
  }

  function revertDraft(key: string) {
    setDrafts((d) => {
      if (!(key in d)) return d;
      const next = { ...d };
      delete next[key];
      return next;
    });
  }

  /**
   * Apply the typed entry for one denomination, incrementally:
   * "23" / "+23" adds 23, "-3" removes 3 (floored at 0), "=500" sets
   * the exact quantity. An unchanged value is a no-op — safe to
   * focus and click away without altering the count.
   */
  function applyField(key: string, refocus = true) {
    const raw = (drafts[key] ?? "").trim();
    const current = qtys[key] ?? 0;
    if (raw === "" || raw === String(current)) { revertDraft(key); return; }

    let next: number;
    if (raw.startsWith("=")) {
      const n = Math.floor(Number(raw.slice(1)));
      if (!Number.isFinite(n) || n < 0) { toast.error("Invalid amount"); revertDraft(key); return; }
      next = n;
    } else {
      const n = Math.floor(Number(raw));
      if (!Number.isFinite(n)) { toast.error("Invalid amount"); revertDraft(key); return; }
      next = Math.max(0, current + n);
    }

    commitQty(key, next);
    if (refocus) focusAndSelect(key);
  }

  function step(key: string, dir: 1 | -1) {
    commitQty(key, Math.max(0, (qtys[key] ?? 0) + dir));
    focusAndSelect(key);
  }

  function reset() {
    if (total > 0 && !window.confirm("Discard the current count?")) return;
    setQtys({});
    setDrafts({});
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
      setQtys({});
      setDrafts({});
      setCountedAt(todayStr());
      await loadHistory(locationId);
    } finally {
      setSaving(false);
    }
  }

  /** Load a saved count back into the counter for editing (save records a new entry). */
  function handleEdit(count: CashCount) {
    setLocationId(count.location_id);
    setCountedAt(count.counted_at);
    setQtys({ ...count.counts });
    setDrafts({});
    toast.success("Count loaded — adjust and Save to record a new entry");
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => focusAndSelect(String(THB_DENOMINATIONS[0].value)), 350);
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

  const fieldClass = [
    "h-9 w-[72px] shrink-0 px-1 text-center mono text-[14px]",
    "bg-[var(--bg-2)] border border-[var(--line)] rounded-[var(--r-sm)]",
    "hover:border-[var(--line-strong)] focus:border-[var(--accent)]",
    focusRing,
  ].join(" ");

  const controlClass = [
    "h-9 rounded-[var(--r-sm)] border border-[var(--line)]",
    "bg-[var(--bg-2)] px-2 text-[13px] text-[var(--fg)]",
    "hover:border-[var(--line-strong)]",
    focusRing,
  ].join(" ");

  return (
    <div ref={rootRef} className="scroll-mt-4">
      <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)]" style={{ boxShadow: "var(--shadow-1)" }}>
        {/* Header: title + context controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div className="min-w-0">
            <h3 className="m-0 text-[14px] font-semibold text-[var(--fg)]">Cash counter</h3>
            <p className="m-0 mt-0.5 text-[12px] text-[var(--fg-3)]">Count and record the cash in the till.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={controlClass}
              aria-label="Shop"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{shortName(l.name)}</option>
              ))}
            </select>
            <input
              type="date"
              value={countedAt}
              onChange={(e) => setCountedAt(e.target.value)}
              className={controlClass}
              aria-label="Count date"
            />
            <div ref={shortcutsRef} className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShortcutsOpen((o) => !o)}
                aria-expanded={shortcutsOpen}
                aria-label="Quick entry shortcuts"
              >
                ?
              </Button>
              {shortcutsOpen && (
                <div
                  className="absolute right-0 top-full z-10 mt-1 w-64 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-3"
                  style={{ boxShadow: "var(--shadow-2)" }}
                  role="dialog"
                  aria-label="Quick entry shortcuts"
                  onKeyDown={(e) => { if (e.key === "Escape") setShortcutsOpen(false); }}
                >
                  <p className="eyebrow mb-2">Quick entry</p>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[12px] text-[var(--fg-3)]">
                    <li className="flex items-center justify-between gap-2"><span>Add (possibly in several goes)</span><span><Kbd>23</Kbd> <Kbd>+2</Kbd></span></li>
                    <li className="flex items-center justify-between gap-2"><span>Remove</span><Kbd>-3</Kbd></li>
                    <li className="flex items-center justify-between gap-2"><span>Set exact</span><Kbd>=500</Kbd></li>
                    <li className="flex items-center justify-between gap-2"><span>Step ±1</span><span><Kbd>↑</Kbd> <Kbd>↓</Kbd></span></li>
                    <li className="flex items-center justify-between gap-2"><span>Apply / next</span><span><Kbd>Enter</Kbd> <Kbd>Tab</Kbd></span></li>
                    <li className="flex items-center justify-between gap-2"><span>Discard typing</span><Kbd>Esc</Kbd></li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Counting surface: one row per denomination */}
        {(["note", "coin"] as const).map((kind, gi) => (
          <div key={kind} className={gi > 0 ? "border-t border-[var(--line-2)]" : undefined}>
            <p className="eyebrow px-4 pb-0.5 pt-2">
              {kind === "note" ? "Banknotes" : "Coins"}
            </p>
            <div className="divide-y divide-[var(--line-2)]">
              {THB_DENOMINATIONS.filter((d) => d.kind === kind).map((d) => {
                const key = String(d.value);
                const qty = qtys[key] ?? 0;
                const subtotal = qty * d.value;
                const kindWord = d.kind === "note" ? "note" : "coin";
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-2">
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--fg)]">
                      {d.label}
                    </span>
                    <input
                      ref={(el) => { inputRefs.current[key] = el; }}
                      type="text"
                      inputMode="numeric"
                      className={fieldClass}
                      value={drafts[key] ?? String(qty)}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => applyField(key, false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyField(key);
                        else if (e.key === "ArrowUp") { e.preventDefault(); step(key, 1); }
                        else if (e.key === "ArrowDown") { e.preventDefault(); step(key, -1); }
                        else if (e.key === "Escape") { revertDraft(key); e.currentTarget.blur(); }
                      }}
                      aria-label={`${d.label} ${kindWord} quantity — type a number to add, negative to remove, = to set`}
                    />
                    <span
                      className="mono w-[104px] shrink-0 text-right text-[13px] font-semibold"
                      style={{ color: subtotal > 0 ? "var(--fg-2)" : "var(--fg-4)" }}
                    >
                      {fmt(subtotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Total + actions */}
        <div className="border-t border-[var(--line)] px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="eyebrow">Total cash</p>
            <p className="mono m-0 text-[26px] font-bold leading-tight tracking-tight text-[var(--fg)]">
              {fmt(total)}
            </p>
          </div>
          <p className="m-0 mt-1 text-[12px] text-[var(--fg-4)]">
            {countedDenoms} denomination{countedDenoms === 1 ? "" : "s"}
            {activeLocation ? ` · ${shortName(activeLocation.name)}` : ""}
            {` · ${countedAt}`}
            {total > 0 ? " · Unsaved" : ""}
          </p>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || !locationId || total <= 0}
              className="min-w-[120px]"
            >
              {saving ? "Saving…" : "Save count"}
            </Button>
          </div>
        </div>
      </div>

      {/* History — plain block, visually separate from the counting surface */}
      <div className="mx-auto w-full max-w-[520px] pt-4">
        <p className="eyebrow px-4 pb-1">History</p>
        {loadingHistory ? (
          <p className="m-0 px-4 py-2 text-[12px] text-[var(--fg-4)]">Loading…</p>
        ) : history.length === 0 ? (
          <p className="m-0 px-4 py-2 text-[12px] text-[var(--fg-4)]">No counts saved for this shop yet.</p>
        ) : (
          <div className="divide-y divide-[var(--line-2)] border-y border-[var(--line-2)]">
            {history.slice(0, 10).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="m-0 text-[13px] text-[var(--fg-3)]">
                    <span className="mono font-semibold text-[var(--fg-2)]">{fmt(c.total)}</span>
                    <span className="text-[11px] text-[var(--fg-4)]"> · {c.counted_at}</span>
                  </p>
                  <p className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[var(--fg-4)]">
                    {breakdown(c.counts)}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(c)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => void handleUseAsCashOnHand(c)}>
                    Use as cash on hand
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void handleDelete(c.id)} aria-label={`Delete count from ${c.counted_at}`}>×</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
