"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CloudDownloadIcon, Lock, PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthSelector } from "./MonthSelector";
import type { AdminLocation } from "@/modules/admin/types";
import { SheetImportModal } from "@/modules/accounting/components/SheetImportModal";
import type { LocationOverview } from "@/modules/challenges/overview-data";
import { buildOverviewPrintHtml } from "@/modules/challenges/exportOverviewHtml";
import {
  CHALLENGE_LABELS,
  LEGEND_ITEMS,
  PERIOD_LABELS,
  TEAM_CHALLENGE_LABELS,
  VIEW_MODE_LABELS,
} from "@/modules/challenges/labels";
import { TeamLocationDashboard } from "./TeamLocationDashboard";
import { shortLocationName } from "@/modules/challenges/team-metrics";
import {
  SNACKS_BONUS,
  PANIER_BONUS,
  OPEX_BONUS,
  REVIEWS_VOLUME_BONUS,
  REVIEWS_RATING_BONUS,
  SNACKS_THRESHOLD,
  PANIER_THRESHOLD,
} from "@/modules/challenges/constants";
import {
  type MetricContext,
  type ViewMode,
  VIEW_MODE_STORAGE_KEY,
  defaultViewMode,
  buildRevenueContext,
  buildMerchContext,
  buildSnacksContext,
  buildPanierContext,
  buildOpexContext,
  buildReviewVolumeContext,
  buildReviewRatingContext,
} from "@/modules/challenges/metric-context";

interface OverviewData {
  locations: LocationOverview[];
}

function readStoredViewMode(isOwner: boolean): ViewMode {
  if (typeof window === "undefined") return defaultViewMode(isOwner);
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  if (stored === "internal" || stored === "team") return stored;
  return defaultViewMode(isOwner);
}

function TeamLocationFilter({
  locations,
  value,
  onChange,
}: {
  locations: LocationOverview[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`rounded-[var(--r-sm)] border px-3 py-1.5 text-xs font-medium transition-colors ${
          value === "all"
            ? "border-[var(--bronze)] bg-[var(--bronze-soft)] text-[var(--fg)]"
            : "border-[var(--line)] bg-[var(--surface)] text-[var(--fg-3)] hover:text-[var(--fg)]"
        }`}
      >
        All shops
      </button>
      {locations.map((loc) => (
        <button
          key={loc.locationId}
          type="button"
          onClick={() => onChange(loc.locationId)}
          className={`rounded-[var(--r-sm)] border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === loc.locationId
              ? "border-[var(--bronze)] bg-[var(--bronze-soft)] text-[var(--fg)]"
              : "border-[var(--line)] bg-[var(--surface)] text-[var(--fg-3)] hover:text-[var(--fg)]"
          }`}
        >
          {shortLocationName(loc.locationTitle)}
        </button>
      ))}
    </div>
  );
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg-2)] p-0.5">
      {(["internal", "team"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-[calc(var(--r-sm)-2px)] px-2.5 py-1 text-xs font-medium transition-colors ${
            value === mode
              ? "bg-[var(--surface)] text-[var(--fg)] shadow-sm"
              : "text-[var(--fg-4)] hover:text-[var(--fg-2)]"
          }`}
        >
          {VIEW_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}

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

/** Fixed-width bonus cell — lock icon + amount stay on one line so cards stay aligned. */
function BonusAmount({
  amount,
  variant,
  title,
  teamMode,
}: {
  amount: number;
  variant: "earned" | "locked" | "empty";
  title?: string;
  teamMode?: boolean;
}) {
  if (variant === "empty") {
    return <span className="block min-h-[1rem]" aria-hidden />;
  }

  const color =
    variant === "locked" ? "text-[var(--bronze)]" : "text-[var(--good)]";

  if (teamMode && variant === "locked") {
    return (
      <span
        className="block text-[10px] leading-tight text-[var(--bronze)] text-right max-w-[5.5rem]"
        title={title}
      >
        {CHALLENGE_LABELS.lockedUntilSalesTarget}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-end gap-0.5 font-mono text-xs tabular-nums whitespace-nowrap ${color}`}
      title={title}
    >
      {variant === "locked" && <Lock className="size-3 shrink-0" aria-hidden />}
      <span>{amount.toLocaleString()}&nbsp;฿</span>
    </span>
  );
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
  viewMode = "internal",
  teamContext,
}: {
  label: string;
  value: string;
  passes: boolean | null;
  bonus: number;
  loading: boolean;
  sub?: string;
  progress?: number;
  isOwner?: boolean;
  locked?: boolean;
  potentialBonus?: number;
  viewMode?: ViewMode;
  teamContext?: MetricContext;
}) {
  const isTeamMode = viewMode === "team";
  const showTeamCopy = isTeamMode && !!teamContext;
  const displayValue = showTeamCopy ? teamContext!.value : value;
  const displayHint = showTeamCopy ? teamContext!.hint : isOwner ? sub : undefined;
  const barColor = passes === true ? "var(--good)" : passes === false ? "var(--warn)" : "var(--fg-4)";
  const lockedQualifying = !!locked && passes === true;
  return (
    <div className="flex flex-col border-b border-[var(--line)] last:border-b-0 py-1.5 gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot passes={passes} />
          <span className="text-xs text-[var(--fg-3)] truncate">{label}</span>
        </div>
        <div className="flex flex-col items-end shrink-0 ml-2 min-h-[2rem] justify-center">
          {loading ? (
            <div className="h-3 w-10 animate-pulse rounded bg-[var(--bg-2)]" />
          ) : (
            <>
              <span className={`font-mono text-xs tabular-nums text-right ${statusColor(passes)}`}>{displayValue}</span>
              {(showTeamCopy || isOwner) && (
                <span className={`font-mono text-[10px] tabular-nums leading-tight min-h-[0.875rem] text-right ${displayHint ? "text-[var(--fg-4)]" : "text-transparent select-none"}`}>
                  {displayHint ?? "\u00a0"}
                </span>
              )}
            </>
          )}
        </div>
        <div className={`text-right shrink-0 ml-2 ${isTeamMode ? "w-16" : "w-20"}`}>
          {loading ? (
            <div className="h-3 w-12 ml-auto animate-pulse rounded bg-[var(--bg-2)]" />
          ) : lockedQualifying ? (
            <BonusAmount
              amount={potentialBonus ?? bonus}
              variant="locked"
              title={CHALLENGE_LABELS.lockedTooltip}
              teamMode={isTeamMode}
            />
          ) : (
            <BonusAmount
              amount={bonus}
              variant={passes === true ? "earned" : "empty"}
              teamMode={isTeamMode}
            />
          )}
        </div>
      </div>
      {!loading && (
        <div className="h-1 rounded-full bg-[var(--bg-2)] overflow-hidden mx-6">
          {progress !== undefined && (
            <div style={{ width: `${Math.round(Math.min(1, progress) * 100)}%`, height: "100%", background: barColor, borderRadius: 9999, transition: "width 0.4s ease" }} />
          )}
        </div>
      )}
    </div>
  );
}

function RevenueGateBanner({
  loc,
  loading,
  viewMode = "internal",
}: {
  loc: LocationOverview;
  loading: boolean;
  viewMode?: ViewMode;
}) {
  const { amount, threshold, unlocked, ratio } = loc.revenue;
  const isTeam = viewMode === "team";
  const teamContext = isTeam ? buildRevenueContext(loc) : null;

  if (loading) {
    return <div className="mx-4 mt-3 h-[3.75rem] animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />;
  }

  const hasThreshold = threshold !== null;
  const passes = hasThreshold ? (amount !== null ? unlocked : null) : null;
  const isUnlocked = passes === true;
  const barColor = isUnlocked ? "var(--good)" : hasThreshold ? "var(--bronze)" : "var(--fg-4)";
  const progressRatio = hasThreshold && ratio !== null ? Math.min(1, ratio) : 0;

  const bannerStyle = isUnlocked
    ? "border-[var(--good)] bg-[var(--good-soft)]"
    : hasThreshold
      ? "border-[var(--bronze)] bg-[var(--bronze-soft)]"
      : "border-[var(--line)] bg-[var(--bg-2)]";

  const labelStyle = isUnlocked
    ? "text-[var(--good)]"
    : hasThreshold
      ? "text-[var(--bronze-2)]"
      : "text-[var(--fg-4)]";

  const valueStyle = isUnlocked
    ? "text-[var(--good)]"
    : hasThreshold
      ? "text-[var(--bronze-2)]"
      : "text-[var(--fg-4)]";

  const amountLabel = isTeam && teamContext
    ? teamContext.value
    : hasThreshold
      ? amount !== null
        ? `${fmt(amount, 0)} / ${fmt(threshold, 0)} ฿`
        : `target ${fmt(threshold, 0)} ฿`
      : amount !== null
        ? `${fmt(amount, 0)} / ${CHALLENGE_LABELS.salesTargetTbd}`
        : CHALLENGE_LABELS.salesTargetTbd;

  const hintLabel = isTeam && teamContext?.hint ? teamContext.hint : null;

  const gateLabel = isTeam
    ? isUnlocked
      ? TEAM_CHALLENGE_LABELS.salesTargetReached
      : TEAM_CHALLENGE_LABELS.salesTarget
    : isUnlocked
      ? CHALLENGE_LABELS.salesTargetReached
      : CHALLENGE_LABELS.salesTarget;

  return (
    <div
      className={`mx-4 mt-3 flex h-[3.75rem] flex-col justify-center gap-1.5 rounded-[var(--r-sm)] border px-3 py-2 ${bannerStyle}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${labelStyle}`}>
          {gateLabel}
        </span>
        <div className="flex flex-col items-end shrink-0">
          <span className={`font-mono text-xs tabular-nums whitespace-nowrap ${valueStyle}`}>
            {amountLabel}
          </span>
          {hintLabel && (
            <span className="font-mono text-[10px] tabular-nums text-[var(--fg-4)]">{hintLabel}</span>
          )}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden">
        {hasThreshold && ratio !== null && (
          <div
            style={{
              width: `${Math.round(progressRatio * 100)}%`,
              height: "100%",
              background: barColor,
              borderRadius: 9999,
              transition: "width 0.4s ease",
            }}
          />
        )}
      </div>
    </div>
  );
}

function MerchRow({
  loc,
  loading,
  isOwner,
  viewMode = "internal",
}: {
  loc: LocationOverview;
  loading: boolean;
  isOwner?: boolean;
  viewMode?: ViewMode;
}) {
  const tierLabels = ["—", "7%+ (P1)", "8%+ (P2)", "9%+ (P3)"];
  const tier = loc.merchandising.tier;
  const passes = tier > 0 ? true : loc.merchandising.ratio !== null ? false : null;
  const progress = loc.merchandising.ratio !== null ? Math.min(1, loc.merchandising.ratio / 0.07) : undefined;
  const isTeam = viewMode === "team";
  return (
    <MetricRow
      label={isTeam ? TEAM_CHALLENGE_LABELS.productsPct : CHALLENGE_LABELS.productsPct}
      value={pct(loc.merchandising.ratio)}
      sub={loc.merchandising.ratio !== null ? (tier > 0 ? tierLabels[tier] : "target ≥ 7%") : undefined}
      passes={passes}
      bonus={loc.merchandising.bonus}
      loading={loading}
      progress={progress}
      isOwner={isOwner}
      viewMode={viewMode}
      teamContext={isTeam ? buildMerchContext(loc) : undefined}
    />
  );
}

function LocationCard({
  loc,
  month,
  loading,
  isOwner,
  viewMode,
  onEntryUpdated,
  onSnacksUpdated,
}: {
  loc: LocationOverview;
  month: string;
  loading: boolean;
  isOwner?: boolean;
  viewMode: ViewMode;
  onEntryUpdated: (id: string, period: 1 | 2 | 3, val: number) => void;
  onSnacksUpdated: (id: string, period: 1 | 2 | 3, val: number) => void;
}) {
  const isTeam = viewMode === "team";
  const totalBonus = loc.totalBonus;
  const hasBonusData = !loading && (loc.salesNetIncVat !== null || loc.reviews.count > 0);

  const revenueLocked = loc.revenue.threshold !== null && loc.revenue.unlocked === false;

  // Sum of bonuses that would be earned right now if the revenue gate were reached.
  const potentialLockedBonus = revenueLocked
    ? (loc.snacks.passes === true ? SNACKS_BONUS : 0) +
      (loc.panierMoyen.passes === true ? PANIER_BONUS : 0) +
      (loc.opex.passes === true ? OPEX_BONUS : 0) +
      (loc.reviews.volumePass === true ? REVIEWS_VOLUME_BONUS : 0) +
      (loc.reviews.ratingPass === true ? REVIEWS_RATING_BONUS : 0)
    : 0;

  return (
    <div className="flex h-full flex-col gap-0 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
        <p className="text-sm font-medium text-[var(--fg)]">{shortName(loc.locationTitle)}</p>
        {loading ? (
          <div className="h-5 w-16 animate-pulse rounded bg-[var(--bg-2)]" />
        ) : (
          <div className="flex min-h-[1.25rem] items-baseline gap-1.5">
            <span className={`font-mono text-sm font-semibold tabular-nums whitespace-nowrap ${totalBonus > 0 ? "text-[var(--good)]" : "text-[var(--fg-4)]"}`}>
              {hasBonusData ? `${totalBonus.toLocaleString()}\u00a0฿` : "—"}
            </span>
            {potentialLockedBonus > 0 && (
              <span
                className="inline-flex items-baseline gap-0.5 font-mono text-xs font-medium tabular-nums whitespace-nowrap text-[var(--bronze)]"
                title={CHALLENGE_LABELS.lockedTooltip}
              >
                <span>+</span>
                {!isTeam && <Lock className="size-3 shrink-0 self-center" aria-hidden />}
                <span>{potentialLockedBonus.toLocaleString()}&nbsp;฿</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Revenue gate — not a challenge metric */}
      <RevenueGateBanner loc={loc} loading={loading} viewMode={viewMode} />

      {/* Metric column headers */}
      <div className="flex items-center justify-between px-4 pt-2 pb-0.5">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
          {isTeam ? "Challenge" : "Metric"}
        </span>
        <div className="flex items-center">
          <span className={`text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)] text-right mr-2 ${isTeam ? "w-20" : "w-16"}`}>
            {isTeam ? "Progress" : "Value"}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)] w-16 text-right">Bonus</span>
        </div>
      </div>

      {/* Metric rows */}
      <div className="px-4 pb-1">
        <MerchRow loc={loc} loading={loading} isOwner={isOwner} viewMode={viewMode} />
        <MetricRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.snacks : CHALLENGE_LABELS.snacks}
          value={loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : "—"}
          sub={loc.snacks.ratio !== null ? "target ≥ 0.45" : undefined}
          passes={loc.snacks.passes}
          bonus={loc.snacks.bonus}
          locked={revenueLocked}
          potentialBonus={SNACKS_BONUS}
          loading={loading}
          progress={loc.snacks.ratio !== null ? Math.min(1, loc.snacks.ratio / SNACKS_THRESHOLD) : undefined}
          isOwner={isOwner}
          viewMode={viewMode}
          teamContext={isTeam ? buildSnacksContext(loc) : undefined}
        />
        <MetricRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.spendPerVisit : CHALLENGE_LABELS.spendPerVisit}
          value={loc.panierMoyen.value !== null ? `${fmt(loc.panierMoyen.value, 0)} ฿` : "—"}
          sub={loc.panierMoyen.value !== null ? "target ≥ 190 ฿" : undefined}
          passes={loc.panierMoyen.passes}
          bonus={loc.panierMoyen.bonus}
          locked={revenueLocked}
          potentialBonus={PANIER_BONUS}
          loading={loading}
          progress={loc.panierMoyen.value !== null ? Math.min(1, loc.panierMoyen.value / PANIER_THRESHOLD) : undefined}
          isOwner={isOwner}
          viewMode={viewMode}
          teamContext={isTeam ? buildPanierContext(loc) : undefined}
        />
        <MetricRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.runningCostsPct : CHALLENGE_LABELS.runningCostsPct}
          value={pct(loc.opex.ratio)}
          sub={loc.opex.ratio !== null ? "target < 9.5%" : undefined}
          passes={loc.opex.passes}
          bonus={loc.opex.bonus}
          locked={revenueLocked}
          potentialBonus={OPEX_BONUS}
          loading={loading}
          progress={loc.opex.ratio !== null ? Math.min(1, loc.opex.threshold / loc.opex.ratio) : undefined}
          isOwner={isOwner}
          viewMode={viewMode}
          teamContext={isTeam ? buildOpexContext(loc) : undefined}
        />
        <MetricRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.reviewCount : CHALLENGE_LABELS.reviewCount}
          value={loc.reviews.volumeRatio !== null ? pct(loc.reviews.volumeRatio) : `${loc.reviews.count} reviews`}
          sub={loc.reviews.volumeRatio !== null ? "target ≥ 4%" : undefined}
          passes={loc.reviews.volumePass}
          bonus={loc.reviews.volumeBonus}
          locked={revenueLocked}
          potentialBonus={REVIEWS_VOLUME_BONUS}
          loading={loading}
          progress={loc.reviews.volumeRatio !== null ? Math.min(1, loc.reviews.volumeRatio / 0.04) : undefined}
          isOwner={isOwner}
          viewMode={viewMode}
          teamContext={isTeam ? buildReviewVolumeContext(loc) : undefined}
        />
        <MetricRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.reviewRating : CHALLENGE_LABELS.reviewRating}
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
          viewMode={viewMode}
          teamContext={isTeam ? buildReviewRatingContext(loc) : undefined}
        />
      </div>

      {/* Manual inputs — pinned to card bottom when grid stretches row height */}
      <div className="mt-auto flex flex-col gap-0 border-t border-[var(--line)] bg-[var(--bg-2)]">
        <div className="flex items-center justify-between px-4 pt-2 pb-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
            {isTeam ? TEAM_CHALLENGE_LABELS.visitorCounts : CHALLENGE_LABELS.visitorCounts}
          </span>
          <span className="text-[9px] text-[var(--fg-4)]">Type a value, then Tab/Enter to move on — saves on blur</span>
        </div>
        {([1, 2, 3] as const).map((p) => {
          const entryLabel  = PERIOD_LABELS.visitors[p - 1];
          const snacksLabel = PERIOD_LABELS.snacks[p - 1];
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

export function ChallengesOverview({
  isOwner,
  canManage,
  locations: adminLocations = [],
}: {
  isOwner?: boolean;
  canManage?: boolean;
  locations?: AdminLocation[];
} = {}) {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => defaultViewMode(!!isOwner));
  const [teamLocationFilter, setTeamLocationFilter] = useState("all");
  const [sheetImportOpen, setSheetImportOpen] = useState(false);

  useEffect(() => {
    setViewMode(readStoredViewMode(!!isOwner));
  }, [isOwner]);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }

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

  function openPrintHtml(html: string) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      URL.revokeObjectURL(url);
      toast.error("Pop-up blocked — please allow pop-ups");
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function exportOverviewPdf(summaryOnly = false, teamMode = false) {
    if (locations.length === 0) return;
    openPrintHtml(buildOverviewPrintHtml(locations, month, { summaryOnly, teamMode }));
  }

  const isTeamView = viewMode === "team";
  const filteredLocations =
    isTeamView && teamLocationFilter !== "all"
      ? locations.filter((l) => l.locationId === teamLocationFilter)
      : locations;

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector value={month} onChange={setMonth} />
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!loading && locations.length > 0 && totalEarned > 0 && (
            <div className="flex items-center gap-2 text-sm text-[var(--fg-3)]">
              <span className="font-mono font-semibold text-[var(--good)]">{totalEarned.toLocaleString()} ฿</span>
              <span>earned across all shops</span>
            </div>
          )}
          {canManage && adminLocations.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSheetImportOpen(true)}
              title="Import from Google Sheets"
            >
              <CloudDownloadIcon size={13} />
              Sheets
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportOverviewPdf(true)}
            disabled={loading || locations.length === 0}
          >
            <PrinterIcon size={13} />
            Summary PDF
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportOverviewPdf(false)}
            disabled={loading || locations.length === 0}
          >
            <PrinterIcon size={13} />
            Full PDF
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportOverviewPdf(false, true)}
            disabled={loading || locations.length === 0}
          >
            <PrinterIcon size={13} />
            Team PDF
          </Button>
        </div>
      </div>

      {/* Legend row — internal view only */}
      {!isTeamView && (
        <div className="flex flex-wrap gap-3">
          {LEGEND_ITEMS.map((item) => (
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
      )}

      {/* Team view — location filter */}
      {isTeamView && locations.length > 1 && (
        <TeamLocationFilter
          locations={locations}
          value={teamLocationFilter}
          onChange={setTeamLocationFilter}
        />
      )}

      {/* Location content */}
      {loading && locations.length === 0 ? (
        isTeamView ? (
          <div className="flex flex-col gap-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <TeamLocationDashboard key={i} loading />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]" />
            ))}
          </div>
        )
      ) : locations.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
          <span className="text-sm text-[var(--fg-4)]">No data yet for this month.</span>
        </div>
      ) : isTeamView ? (
        <div className="flex flex-col gap-8">
          {filteredLocations.map((loc) => (
            <TeamLocationDashboard key={loc.locationId} loc={loc} month={month} loading={loading} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 items-stretch">
          {locations.map((loc) => (
            <LocationCard
              key={loc.locationId}
              loc={loc}
              month={month}
              loading={loading}
              isOwner={isOwner}
              viewMode={viewMode}
              onEntryUpdated={(id, p, val) => handleEntryUpdated(id, p, val)}
              onSnacksUpdated={(id, p, val) => handleSnacksUpdated(id, p, val)}
            />
          ))}
        </div>
      )}

      {sheetImportOpen && adminLocations[0] && (
        <SheetImportModal
          location={adminLocations[0]}
          defaultTab="all"
          onClose={() => setSheetImportOpen(false)}
          onImported={() => void fetchData(month, { silent: true })}
        />
      )}
    </div>
  );
}
