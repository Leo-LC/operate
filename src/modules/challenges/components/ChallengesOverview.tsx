"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MonthSelector } from "./MonthSelector";
import type { LocationOverview } from "@/app/api/challenges/overview/route";

interface OverviewData {
  locations: LocationOverview[];
}

// Mirrors the bonus amounts in src/app/api/challenges/overview/route.ts, used to show
// what a locked metric would pay out once the revenue gate is reached.
const SNACKS_BONUS = 1250;
const PANIER_BONUS = 1250;
const OPEX_BONUS = 1250;
const REVIEWS_VOLUME_BONUS = 625;
const REVIEWS_RATING_BONUS = 625;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shortName(title: string): string {
  return title.replace(/^Capybara Coffee\s*/i, "").trim() || title;
}

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function pct(n: number | null): string {
  if (n === null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function statusColor(passes: boolean | null): string {
  if (passes === true) return "text-[var(--good)]";
  if (passes === false) return "text-[var(--bad)]";
  return "text-[var(--fg-4)]";
}

function StatusDot({ passes }: { passes: boolean | null }) {
  if (passes === true) return <span className="text-[var(--good)]">✓</span>;
  if (passes === false) return <span className="text-[var(--bad)]">✗</span>;
  return <span className="text-[var(--fg-4)]">—</span>;
}

// Moves focus to the next editable cell in DOM order, mimicking Tab on Enter.
function focusNextCell(current: HTMLElement) {
  const cells = Array.from(
    document.querySelectorAll<HTMLInputElement>('[data-challenge-cell="true"]')
  );
  const idx = cells.indexOf(current as HTMLInputElement);
  if (idx >= 0 && idx < cells.length - 1) cells[idx + 1].focus();
}

type SaveState = "idle" | "saving" | "saved" | "error";

function InlineNumberInput({
  label,
  locationId,
  month,
  period,
  initial,
  field,
  loading,
  onSaved,
}: {
  label: string;
  locationId: string;
  month: string;
  period: 1 | 2 | 3;
  initial: number | null;
  field: "entryCount" | "snacksSold";
  loading: boolean;
  onSaved: (val: number) => void;
}) {
  const [draft, setDraft] = useState(initial !== null ? String(initial) : "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const focusedRef = useRef(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from background-refreshed data, but never clobber what the user is actively typing.
  useEffect(() => {
    if (!focusedRef.current) setDraft(initial !== null ? String(initial) : "");
  }, [initial]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  async function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      setDraft(initial !== null ? String(initial) : "");
      return;
    }
    const val = parseInt(trimmed, 10);
    if (isNaN(val) || val < 0) {
      setDraft(initial !== null ? String(initial) : "");
      return;
    }
    if (val === initial) return;

    setSaveState("saving");
    try {
      const body: Record<string, unknown> = { locationId, month, period };
      if (field === "entryCount") body.entryCount = val;
      else body.snacksSold = val;
      const res = await fetch("/api/challenges/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved(val);
      setSaveState("saved");
      savedTimeoutRef.current = setTimeout(() => setSaveState("idle"), 1200);
    } catch (e) {
      console.error("[InlineNumberInput] save failed:", e);
      setSaveState("error");
      setDraft(initial !== null ? String(initial) : "");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const target = e.currentTarget;
      target.blur(); // triggers commit via onBlur
      focusNextCell(target);
    } else if (e.key === "Escape") {
      setDraft(initial !== null ? String(initial) : "");
      e.currentTarget.blur();
    }
  }

  const ringColor =
    saveState === "error" ? "var(--bad)" : saveState === "saving" ? "var(--bronze)" : undefined;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">{label}</span>
      {loading ? (
        <div className="h-7 w-20 animate-pulse rounded bg-[var(--bg-2)]" />
      ) : (
        <div className="relative w-20">
          <input
            data-challenge-cell="true"
            type="number"
            min={0}
            inputMode="numeric"
            value={draft}
            disabled={saveState === "saving"}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => {
              focusedRef.current = true;
              e.target.select();
            }}
            onBlur={() => {
              focusedRef.current = false;
              commit();
            }}
            onKeyDown={handleKeyDown}
            className="w-20 cursor-text rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)] px-1.5 py-1 font-mono text-sm tabular-nums text-[var(--fg)] outline-none transition-colors hover:border-[var(--bronze)] focus:border-[var(--bronze)] focus:ring-1 focus:ring-[var(--bronze)] disabled:opacity-60"
            style={ringColor ? { borderColor: ringColor } : undefined}
          />
          {saveState === "saved" && (
            <span className="absolute -right-1 -top-1 text-[var(--good)]" title="Saved">✓</span>
          )}
          {saveState === "error" && (
            <span className="absolute -right-1 -top-1 text-[var(--bad)]" title="Save failed — reverted">!</span>
          )}
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  passes,
  bonus,
  loading,
  sub,
  progress,
  isOwner,
  locked,
  potentialBonus,
}: {
  label: string;
  value: string;
  passes: boolean | null;
  bonus: number;
  loading: boolean;
  sub?: string;
  progress?: number;
  isOwner?: boolean;
  /** Revenue gate is active and this metric would pass, but the bonus isn't awarded yet. */
  locked?: boolean;
  /** What this metric would pay out once the revenue gate is reached. */
  potentialBonus?: number;
}) {
  const barColor = passes === true ? "var(--good)" : passes === false ? "var(--warn)" : "var(--fg-4)";
  const lockedQualifying = !!locked && passes === true;
  return (
    <div className="flex flex-col border-b border-[var(--line)] last:border-b-0 py-1.5 gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot passes={passes} />
          <span className="text-xs text-[var(--fg-3)] truncate">{label}</span>
        </div>
        <div className="flex flex-col items-end shrink-0 ml-2">
          {loading ? (
            <div className="h-3 w-10 animate-pulse rounded bg-[var(--bg-2)]" />
          ) : (
            <>
              <span className={`font-mono text-xs tabular-nums ${statusColor(passes)}`}>{value}</span>
              {sub && isOwner && <span className="font-mono text-[10px] tabular-nums text-[var(--fg-4)]">{sub}</span>}
            </>
          )}
        </div>
        <div className="w-16 text-right shrink-0 ml-2">
          {loading ? (
            <div className="h-3 w-8 ml-auto animate-pulse rounded bg-[var(--bg-2)]" />
          ) : lockedQualifying ? (
            <span className="font-mono text-xs tabular-nums text-[var(--bronze)]" title="Unlocks once the revenue gate is reached">
              🔒 {(potentialBonus ?? bonus).toLocaleString()} ฿
            </span>
          ) : (
            <span className={`font-mono text-xs tabular-nums ${passes === true ? "text-[var(--good)]" : "text-[var(--fg-4)]"}`}>
              {passes === true ? `${bonus.toLocaleString()} ฿` : ""}
            </span>
          )}
        </div>
      </div>
      {!loading && progress !== undefined && (
        <div className="h-1 rounded-full bg-[var(--bg-2)] overflow-hidden mx-6">
          <div style={{ width: `${Math.round(Math.min(1, progress) * 100)}%`, height: "100%", background: barColor, borderRadius: 9999, transition: "width 0.4s ease" }} />
        </div>
      )}
    </div>
  );
}

function RevenueGateRow({ loc, loading }: { loc: LocationOverview; loading: boolean }) {
  const { amount, threshold, unlocked, ratio } = loc.revenue;
  if (threshold === null) return null; // no gating defined for this shop

  const passes = amount !== null ? unlocked : null;
  const barColor = passes === true ? "var(--good)" : passes === false ? "var(--warn)" : "var(--fg-4)";

  return (
    <div className="flex flex-col border-b border-[var(--line)] py-1.5 gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {passes === false ? <span className="text-[var(--warn)]">🔒</span> : <StatusDot passes={passes} />}
          <span className="text-xs text-[var(--fg-3)] truncate">Revenue gate</span>
        </div>
        <div className="flex flex-col items-end shrink-0 ml-2">
          {loading ? (
            <div className="h-3 w-16 animate-pulse rounded bg-[var(--bg-2)]" />
          ) : (
            <span className={`font-mono text-xs tabular-nums ${statusColor(passes)}`}>
              {amount !== null ? `${fmt(amount, 0)} / ${fmt(threshold, 0)} ฿` : `target ${fmt(threshold, 0)} ฿`}
            </span>
          )}
        </div>
      </div>
      {!loading && ratio !== null && (
        <div className="h-1 rounded-full bg-[var(--bg-2)] overflow-hidden mx-6">
          <div style={{ width: `${Math.round(Math.min(1, ratio) * 100)}%`, height: "100%", background: barColor, borderRadius: 9999, transition: "width 0.4s ease" }} />
        </div>
      )}
      {!loading && passes === false && (
        <span className="mx-6 text-[10px] text-[var(--warn)]">
          Locks snacks, panier moyen, opex &amp; reviews bonuses until reached (merchandising stays unlocked)
        </span>
      )}
    </div>
  );
}

function MerchRow({ loc, loading, isOwner }: { loc: LocationOverview; loading: boolean; isOwner?: boolean }) {
  const tierLabels = ["—", "7%+ (P1)", "8%+ (P2)", "9%+ (P3)"];
  const tier = loc.merchandising.tier;
  const passes = tier > 0 ? true : loc.merchandising.ratio !== null ? false : null;
  const progress = loc.merchandising.ratio !== null ? Math.min(1, loc.merchandising.ratio / 0.07) : undefined;
  return (
    <MetricRow
      label="Merchandising"
      value={pct(loc.merchandising.ratio)}
      sub={tier > 0 ? tierLabels[tier] : undefined}
      passes={passes}
      bonus={loc.merchandising.bonus}
      loading={loading}
      progress={progress}
      isOwner={isOwner}
    />
  );
}

function LocationCard({
  loc,
  month,
  loading,
  isOwner,
  onEntryUpdated,
  onSnacksUpdated,
}: {
  loc: LocationOverview;
  month: string;
  loading: boolean;
  isOwner?: boolean;
  onEntryUpdated: (id: string, period: 1 | 2 | 3, val: number) => void;
  onSnacksUpdated: (id: string, period: 1 | 2 | 3, val: number) => void;
}) {
  const totalBonus = loc.totalBonus;
  const hasBonusData = !loading && (loc.salesNetIncVat !== null || loc.reviews.count > 0);

  // Plain-language gap lines for failing metrics
  const gapLines = !loading && hasBonusData ? (() => {
    const lines: string[] = [];
    if (loc.revenue.threshold !== null && loc.revenue.unlocked === false) {
      const needed = loc.revenue.threshold - (loc.revenue.amount ?? 0);
      lines.push(needed > 0
        ? `${fmt(needed, 0)} ฿ more revenue needed to unlock snacks/panier/opex/reviews`
        : `Revenue gate not yet reached — unlocks snacks/panier/opex/reviews`);
    }
    if (loc.snacks.passes === false && loc.snacks.ratio !== null) {
      const needed = loc.entryCount !== null
        ? Math.ceil(loc.entryCount * 0.45) - (loc.snacksSold ?? 0)
        : null;
      lines.push(needed !== null && needed > 0
        ? `${needed} more snacks to hit ratio target`
        : `Snacks ratio ${loc.snacks.ratio.toFixed(2)} — need ≥ 0.45`);
    }
    if (loc.panierMoyen.passes === false && loc.panierMoyen.value !== null) {
      lines.push(`Avg basket ${fmt(loc.panierMoyen.value, 0)} ฿ — need ≥ 190 ฿`);
    }
    if (loc.opex.passes === false && loc.opex.ratio !== null) {
      lines.push(`Opex ${pct(loc.opex.ratio)} — need < 9.5%`);
    }
    if (loc.reviews.volumePass === false) {
      const needed = loc.entryCount !== null
        ? Math.ceil(loc.entryCount * 0.04) - loc.reviews.count
        : null;
      lines.push(needed !== null && needed > 0
        ? `${needed} more reviews needed for volume bonus`
        : `Review volume below 4% target`);
    }
    if (loc.reviews.ratingPass === false && loc.reviews.count >= 10) {
      lines.push(`Avg rating ${loc.reviews.avgRating.toFixed(1)} — need ≥ ${loc.reviews.ratingTarget.toFixed(1)}`);
    }
    return lines;
  })() : [];

  const revenueLocked = loc.revenue.threshold !== null && loc.revenue.unlocked === false;

  return (
    <div className="flex flex-col gap-0 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
        <p className="text-sm font-medium text-[var(--fg)]">{shortName(loc.locationTitle)}</p>
        {loading ? (
          <div className="h-5 w-16 animate-pulse rounded bg-[var(--bg-2)]" />
        ) : hasBonusData ? (
          <span className={`font-mono text-sm font-semibold tabular-nums ${totalBonus > 0 ? "text-[var(--good)]" : "text-[var(--fg-4)]"}`}>
            {totalBonus.toLocaleString()} ฿
          </span>
        ) : null}
      </div>

      {/* Plain-language gaps */}
      {gapLines.length === 0 && hasBonusData && (
        <div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--good-soft)]">
          <span className="text-xs font-medium text-[var(--good)]">All metrics passing — full bonus unlocked</span>
        </div>
      )}
      {gapLines.length > 0 && (
        <div className={`px-4 py-2 border-b border-[var(--line)] flex flex-col gap-0.5 ${revenueLocked ? "bg-[var(--bronze-soft)]" : ""}`}>
          {gapLines.map((line, i) => (
            <span key={i} className={`text-xs ${revenueLocked && i === 0 ? "text-[var(--bronze-2)]" : "text-[var(--warn)]"}`}>→ {line}</span>
          ))}
        </div>
      )}

      {/* Metric column headers */}
      <div className="flex items-center justify-between px-4 pt-2 pb-0.5">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">Metric</span>
        <div className="flex items-center">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)] w-16 text-right mr-2">Value</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)] w-14 text-right">Bonus</span>
        </div>
      </div>

      {/* Metric rows */}
      <div className="px-4 pb-1">
        <RevenueGateRow loc={loc} loading={loading} />
        <MerchRow loc={loc} loading={loading} isOwner={isOwner} />
        <MetricRow
          label="Snacks"
          value={loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : "—"}
          sub={loc.snacks.ratio !== null ? "target ≥ 0.45" : undefined}
          passes={loc.snacks.passes}
          bonus={loc.snacks.bonus}
          locked={revenueLocked}
          potentialBonus={SNACKS_BONUS}
          loading={loading}
          progress={loc.snacks.ratio !== null ? Math.min(1, loc.snacks.ratio / 0.45) : undefined}
          isOwner={isOwner}
        />
        <MetricRow
          label="Panier moyen"
          value={loc.panierMoyen.value !== null ? `${fmt(loc.panierMoyen.value, 0)} ฿` : "—"}
          sub={loc.panierMoyen.value !== null ? "target ≥ 190 ฿" : undefined}
          passes={loc.panierMoyen.passes}
          bonus={loc.panierMoyen.bonus}
          locked={revenueLocked}
          potentialBonus={PANIER_BONUS}
          loading={loading}
          progress={loc.panierMoyen.value !== null ? Math.min(1, loc.panierMoyen.value / 190) : undefined}
          isOwner={isOwner}
        />
        <MetricRow
          label="Opex variable"
          value={pct(loc.opex.ratio)}
          sub={loc.opex.ratio !== null ? "target < 9.5%" : undefined}
          passes={loc.opex.passes}
          bonus={loc.opex.bonus}
          locked={revenueLocked}
          potentialBonus={OPEX_BONUS}
          loading={loading}
          progress={loc.opex.ratio !== null ? Math.min(1, loc.opex.threshold / loc.opex.ratio) : undefined}
          isOwner={isOwner}
        />
        <MetricRow
          label="Reviews — volume"
          value={loc.reviews.volumeRatio !== null ? pct(loc.reviews.volumeRatio) : `${loc.reviews.count} reviews`}
          sub={loc.reviews.volumeRatio !== null ? "target ≥ 4%" : undefined}
          passes={loc.reviews.volumePass}
          bonus={loc.reviews.volumeBonus}
          locked={revenueLocked}
          potentialBonus={REVIEWS_VOLUME_BONUS}
          loading={loading}
          progress={loc.reviews.volumeRatio !== null ? Math.min(1, loc.reviews.volumeRatio / 0.04) : undefined}
          isOwner={isOwner}
        />
        <MetricRow
          label="Reviews — note"
          value={loc.reviews.count > 0 ? loc.reviews.avgRating.toFixed(1) : "—"}
          sub={
            loc.reviews.currentRating > 0 && loc.reviews.ratingTarget > 0
              ? `target ≥ ${loc.reviews.ratingTarget.toFixed(1)}`
              : undefined
          }
          passes={loc.reviews.ratingPass}
          bonus={loc.reviews.ratingBonus}
          locked={revenueLocked}
          potentialBonus={REVIEWS_RATING_BONUS}
          progress={loc.reviews.count > 0 && loc.reviews.ratingTarget > 0 ? Math.min(1, loc.reviews.avgRating / loc.reviews.ratingTarget) : undefined}
          isOwner={isOwner}
          loading={loading}
        />
      </div>

      {/* Manual inputs — two periods */}
      <div className="flex flex-col gap-0 border-t border-[var(--line)] bg-[var(--bg-2)]">
        <div className="flex items-center justify-between px-4 pt-2 pb-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">Monthly entries</span>
          <span className="text-[9px] text-[var(--fg-4)]">Type a value, then Tab/Enter to move on — saves on blur</span>
        </div>
        {([1, 2, 3] as const).map((p) => {
          const entryLabel  = p === 1 ? "Entries 1–10"  : p === 2 ? "Entries 11–20"  : "Entries 21–end";
          const snacksLabel = p === 1 ? "Snacks 1–10"   : p === 2 ? "Snacks 11–20"   : "Snacks 21–end";
          const entryInit   = p === 1 ? loc.entryCountP1 : p === 2 ? loc.entryCountP2 : loc.entryCountP3;
          const snacksInit  = p === 1 ? loc.snacksSoldP1 : p === 2 ? loc.snacksSoldP2 : loc.snacksSoldP3;
          return (
            <div key={p} className="grid grid-cols-2 gap-3 px-4 py-2.5 border-b border-[var(--line)] last:border-b-0">
              <InlineNumberInput
                label={entryLabel}
                locationId={loc.locationId}
                month={month}
                period={p}
                initial={entryInit}
                field="entryCount"
                loading={loading}
                onSaved={(val) => onEntryUpdated(loc.locationId, p, val)}
              />
              <InlineNumberInput
                label={snacksLabel}
                locationId={loc.locationId}
                month={month}
                period={p}
                initial={snacksInit}
                field="snacksSold"
                loading={loading}
                onSaved={(val) => onSnacksUpdated(loc.locationId, p, val)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChallengesOverview({ isOwner }: { isOwner?: boolean } = {}) {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  // `silent` skips the loading flag so a background refresh (after saving a cell)
  // doesn't swap the whole grid into skeleton placeholders mid-edit.
  const fetchData = useCallback(async (m: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/challenges/overview?month=${m}`);
      if (!res.ok) throw new Error(await res.text());
      setData((await res.json()) as OverviewData);
    } catch (e) {
      console.error("[ChallengesOverview] fetch error:", e);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(month); }, [month, fetchData]);

  // The bonus/ratio metrics are computed server-side, so re-derive them by refetching —
  // but silently, so it doesn't interrupt whatever cell the user is editing next.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleEntryUpdated(_locationId: string, _period: 1 | 2 | 3, _val: number) {
    fetchData(month, { silent: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleSnacksUpdated(_locationId: string, _period: 1 | 2 | 3, _val: number) {
    fetchData(month, { silent: true });
  }

  const locations = data?.locations ?? [];

  // Summary stats
  const totalEarned = locations.reduce((s, l) => s + l.totalBonus, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <MonthSelector value={month} onChange={setMonth} />
        {!loading && locations.length > 0 && totalEarned > 0 && (
          <div className="flex items-center gap-2 text-sm text-[var(--fg-3)]">
            <span className="font-mono font-semibold text-[var(--good)]">{totalEarned.toLocaleString()} ฿</span>
            <span>earned across all shops</span>
          </div>
        )}
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Revenue gate", max: "unlocks below", tiers: "1.2M/0.9M/0.7M ฿" },
          { label: "Merchandising", max: "up to 5 000 ฿", tiers: "7%→1 500 · 8%→3 000 · 9%→5 000" },
          { label: "Snacks", max: "1 250 ฿", tiers: "≥ 0.45" },
          { label: "Panier moyen", max: "1 250 ฿", tiers: "≥ 190 ฿" },
          { label: "Opex variable", max: "1 250 ฿", tiers: "< 9.5%" },
          { label: "Reviews volume", max: "625 ฿", tiers: "≥ 4%" },
          { label: "Reviews note", max: "625 ฿", tiers: "GBP+0.1" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-0.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">{item.label}</span>
            <span className="font-mono text-sm font-semibold text-[var(--fg)]">{item.max}</span>
            <span className="text-[10px] text-[var(--fg-4)]">{item.tiers}</span>
          </div>
        ))}
      </div>

      {/* Location grid */}
      {loading && locations.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
          <span className="text-sm text-[var(--fg-4)]">No data yet for this month.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {locations.map((loc) => (
            <LocationCard
              key={loc.locationId}
              loc={loc}
              month={month}
              loading={loading}
              isOwner={isOwner}
              onEntryUpdated={(id, p, val) => handleEntryUpdated(id, p, val)}
              onSnacksUpdated={(id, p, val) => handleSnacksUpdated(id, p, val)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
