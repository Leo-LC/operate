"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  EllipsisIcon,
  PencilIcon,
  PrinterIcon,
  RefreshCwIcon,
  Settings2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { Modal } from "@/components/ui/modal";
import { MonthSelector } from "./MonthSelector";
import { SalesTargetSettings } from "./SalesTargetSettings";
import type { LocationOverview } from "@/modules/challenges/overview-data";
import { buildOverviewPrintHtml } from "@/modules/challenges/exportOverviewHtml";
import {
  CHALLENGE_LABELS,
  PERIOD_LABELS,
  TEAM_CHALLENGE_LABELS,
  VIEW_MODE_LABELS,
} from "@/modules/challenges/labels";
import { TeamLocationDashboard } from "./TeamLocationDashboard";
import { shortLocationName } from "@/modules/challenges/team-metrics";
import {
  OPEX_BONUS,
  PANIER_BONUS,
  REVIEWS_RATING_BONUS,
  REVIEWS_VOLUME_BONUS,
  SNACKS_BONUS,
  normalizeLocationKey,
} from "@/modules/challenges/constants";
import {
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

/** Minimal overflow menu — no new primitive, closes on select / Escape / outside click. */
function OverflowMenu({
  label,
  items,
  icon = "ellipsis",
}: {
  label: string;
  items: { label: string; hint?: string; onSelect: () => void; disabled?: boolean }[];
  icon?: "ellipsis" | "printer";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-4)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--fg)]"
      >
        {icon === "printer" ? (
          <PrinterIcon className="size-4" aria-hidden />
        ) : (
          <EllipsisIcon className="size-4" aria-hidden />
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-30 min-w-[12rem] rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="flex w-full flex-col items-start gap-0.5 rounded-[var(--r-sm)] px-2.5 py-1.5 text-left text-[13px] text-[var(--fg)] transition-colors hover:bg-[var(--row-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>{item.label}</span>
              {item.hint && <span className="text-[11px] text-[var(--fg-4)]">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
            ? "border-[var(--line-strong)] bg-[var(--row-hover)] text-[var(--fg)]"
            : "border-transparent bg-transparent text-[var(--fg-3)] hover:text-[var(--fg)]"
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
              ? "border-[var(--line-strong)] bg-[var(--row-hover)] text-[var(--fg)]"
              : "border-transparent bg-transparent text-[var(--fg-3)] hover:text-[var(--fg)]"
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
    <div className="inline-flex rounded-[var(--r-sm)] border border-[var(--line)] bg-transparent p-0.5">
      {(["internal", "team"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-[calc(var(--r-sm)-2px)] px-2.5 py-1 text-xs font-medium transition-colors ${
            value === mode
              ? "bg-[var(--row-hover)] text-[var(--fg)]"
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
    saveState === "error" ? "var(--bad)" : saveState === "saving" ? "var(--accent)" : undefined;

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
            className="w-20 cursor-text rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)] px-1.5 py-1 font-mono text-sm tabular-nums text-[var(--fg)] outline-none transition-colors hover:border-[var(--fg-4)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-60"
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

type KpiStatus = "achieved" | "attention" | "nodata";

/**
 * Single challenge row. Only three visual states:
 * - achieved → quiet, small green check
 * - attention (failing / locked / near target) → muted warning text explaining what is needed
 * - nodata → clearly marked, lowest contrast
 * Target + bonus live in the hover tooltip, not in the row.
 */
function KpiRow({
  label,
  value,
  status,
  needText,
  tip,
  loading,
}: {
  label: string;
  value: string;
  status: KpiStatus;
  needText?: string;
  tip: React.ReactNode;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-between py-[7px]">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="h-3 w-14 animate-pulse rounded bg-[var(--bg-2)]" />
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-3 py-[7px]">
      <HoverTooltip content={tip} align="left" className="min-w-0">
        <span className="min-w-0 truncate text-[13px] text-[var(--fg-2)]">{label}</span>
      </HoverTooltip>
      <span className="flex shrink-0 items-baseline gap-2">
        <HoverTooltip content={tip} align="right">
          <span
            className={`font-mono text-[13px] tabular-nums ${
              status === "nodata" ? "text-[var(--fg-4)]" : "text-[var(--fg)]"
            }`}
          >
            {value}
          </span>
        </HoverTooltip>
        <span className="w-[7.5rem] shrink-0 text-right">
          {status === "achieved" ? (
            <span className="text-[13px] font-medium text-[var(--good)]" aria-label="Achieved">✓</span>
          ) : status === "attention" ? (
            <span className="text-xs text-[var(--warn)]">{needText}</span>
          ) : (
            <span className="text-[11px] text-[var(--fg-4)]">No data</span>
          )}
        </span>
      </span>
    </div>
  );
}

/** Two-line hover content for a KPI: target + bonus, optionally the revenue-gate note. */
function KpiTip({ target, bonus, gated = true }: { target: string; bonus: string; gated?: boolean }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span>
        <span className="text-[var(--fg-4)]">Target: </span>
        {target}
      </span>
      <span>
        <span className="text-[var(--fg-4)]">Bonus when achieved: </span>
        {bonus}
      </span>
      {gated && <span className="text-[var(--fg-4)]">Unlocks once sales target is reached</span>}
    </span>
  );
}

function ShopSalesTargetModal({ loc, onClose }: { loc: LocationOverview; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`Sales target — ${shortName(loc.locationTitle)}`}
      description="Monthly net revenue this shop must reach to unlock its gated challenges. Leave empty to use the default."
      footer={
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={onClose}>Done</Button>
        </div>
      }
    >
      <SalesTargetSettings onlyShop={normalizeLocationKey(loc.locationTitle)} />
    </Modal>
  );
}

function ChallengeSettingsModal({
  open,
  onClose,
  isOwner,
}: {
  open: boolean;
  onClose: () => void;
  isOwner?: boolean;
}) {
  const rules: { label: string; target: string; bonus: string }[] = [
    { label: "Sales target", target: "Per shop (unlocks gated bonuses)", bonus: "—" },
    { label: "Merchandising", target: "≥ 7% → 8% → 9% of sales", bonus: "1,500 → 3,000 → 5,000 ฿" },
    { label: "Animal Food", target: "≥ 0.45 / visitor", bonus: "1,250 ฿" },
    { label: "Spend per visit", target: "≥ 190 ฿", bonus: "1,250 ฿" },
    { label: "Running costs", target: "< 9.5% of sales", bonus: "1,250 ฿" },
    { label: "Review count", target: "≥ 4% of visitors", bonus: "625 ฿" },
    { label: "Review rating", target: "+0.1★ vs Google · min 10 reviews/mo", bonus: "625 ฿" },
  ];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Challenge settings"
      description="Targets, bonuses and per-shop sales targets. Only the owner can edit sales targets."
      footer={
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={onClose}>Done</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="overflow-x-auto rounded-[var(--r-sm)] border border-[var(--line)]">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--fg-4)]">Challenge</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--fg-4)]">Target</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium text-[var(--fg-4)]">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.label} className="border-b border-[var(--line)] last:border-b-0">
                  <td className="px-3 py-2 text-[13px] text-[var(--fg)]">{r.label}</td>
                  <td className="px-3 py-2 text-[13px] text-[var(--fg-3)]">{r.target}</td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] tabular-nums text-[var(--fg-3)]">{r.bonus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium text-[var(--fg)]">Sales targets by shop</p>
          {isOwner ? (
            <SalesTargetSettings />
          ) : (
            <p className="text-[13px] text-[var(--fg-4)]">Only the owner can view and edit sales targets.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function VisitorOverrideModal({
  loc,
  month,
  loading,
  onEntryUpdated,
  onSnacksUpdated,
  onClose,
}: {
  loc: LocationOverview;
  month: string;
  loading: boolean;
  onEntryUpdated: (id: string, period: 1 | 2 | 3, val: number) => void;
  onSnacksUpdated: (id: string, period: 1 | 2 | 3, val: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`Visitor counts — ${shortName(loc.locationTitle)}`}
      description="Manual override overwrites the Loyverse-synced values and is logged in audit. Only use it when Loyverse is misconfigured."
      footer={
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={onClose}>Done</Button>
        </div>
      }
    >
      <div className="flex flex-col">
        {([1, 2, 3] as const).map((p) => {
          const entryLabel = PERIOD_LABELS.visitors[p - 1];
          const snacksLabel = PERIOD_LABELS.snacks[p - 1];
          const entryInit = p === 1 ? loc.entryCountP1 : p === 2 ? loc.entryCountP2 : loc.entryCountP3;
          const snacksInit = p === 1 ? loc.snacksSoldP1 : p === 2 ? loc.snacksSoldP2 : loc.snacksSoldP3;
          return (
            <div key={p} className="grid grid-cols-2 gap-3 border-b border-[var(--line)] py-3 last:border-b-0">
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
    </Modal>
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
  const [shopTargetOpen, setShopTargetOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const isTeam = viewMode === "team";
  const totalBonus = loc.totalBonus;
  const hasBonusData = !loading && (loc.salesNetIncVat !== null || loc.reviews.count > 0);
  const revenueLocked = loc.revenue.threshold !== null && loc.revenue.unlocked === false;

  const { amount, threshold, unlocked, ratio } = loc.revenue;
  const teamRevenue = isTeam ? buildRevenueContext(loc) : null;
  const amountLabel =
    isTeam && teamRevenue
      ? teamRevenue.value
      : threshold !== null
        ? amount !== null
          ? `${fmt(amount, 0)} / ${fmt(threshold, 0)} ฿`
          : `— / ${fmt(threshold, 0)} ฿`
        : amount !== null
          ? `${fmt(amount, 0)} ฿`
          : "—";
  const progressRatio = threshold !== null && ratio !== null ? Math.min(1, ratio) : 0;

  const tierLabels = ["—", "7%+ (P1)", "8%+ (P2)", "9%+ (P3)"];
  const merchTier = loc.merchandising.tier;
  const merchPass = merchTier > 0 ? true : loc.merchandising.ratio !== null ? false : null;

  // 6 gated/ungated challenges counted for the "X / 6 achieved" summary.
  const challengeStates: (boolean | null)[] = [
    merchPass,
    loc.snacks.passes,
    loc.panierMoyen.passes,
    loc.opex.passes,
    loc.reviews.volumePass,
    loc.reviews.ratingPass,
  ];
  const achievedCount = challengeStates.filter((s) => s === true).length;

  function kpiStatus(passes: boolean | null, lockedOut: boolean): { status: KpiStatus; need?: string } {
    if (passes === null) return { status: "nodata" };
    if (passes === true && !lockedOut) return { status: "achieved" };
    return { status: "attention" };
  }

  const merch = kpiStatus(merchPass, false);
  const snacks = kpiStatus(loc.snacks.passes, revenueLocked);
  const panier = kpiStatus(loc.panierMoyen.passes, revenueLocked);
  const opex = kpiStatus(loc.opex.passes, revenueLocked);
  const revVolume = kpiStatus(loc.reviews.volumePass, revenueLocked);
  const revRating = kpiStatus(loc.reviews.ratingPass, revenueLocked);

  const ratingTargetLabel =
    loc.reviews.currentRating > 0 && loc.reviews.ratingTarget > 0
      ? `≥ ${loc.reviews.ratingTarget.toFixed(1)}`
      : "—";

  return (
    <Card className="overflow-visible p-5">
      {/* Header: shop identity + total bonus */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[15px] font-semibold text-[var(--fg)]">{shortName(loc.locationTitle)}</p>
        {loading ? (
          <div className="h-4 w-16 animate-pulse rounded bg-[var(--bg-2)]" />
        ) : (
          <p
            className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
              totalBonus > 0 ? "text-[var(--fg)]" : "text-[var(--fg-4)]"
            }`}
            title="Total bonus currently earned by this shop"
          >
            {hasBonusData ? `${totalBonus.toLocaleString()} ฿` : "—"}
          </p>
        )}
      </div>

      {/* Sales target — the only progress bar on the card */}
      <div className="mt-3">
        {loading ? (
          <div className="h-9 animate-pulse rounded bg-[var(--bg-2)]" />
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[13px] tabular-nums text-[var(--fg-2)]">{amountLabel}</span>
              {isOwner && !isTeam && (
                <button
                  type="button"
                  onClick={() => setShopTargetOpen(true)}
                  title="Edit this shop's sales target"
                  aria-label="Edit this shop's sales target"
                  className="rounded p-1 text-[var(--fg-4)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--fg)]"
                >
                  <PencilIcon className="size-3" aria-hidden />
                </button>
              )}
            </div>
            <div
              className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--bg-2)]"
              role="progressbar"
              aria-label="Sales target progression"
              aria-valuenow={Math.round(progressRatio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {threshold !== null && ratio !== null && (
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(progressRatio * 100)}%`,
                    background: unlocked ? "var(--good)" : "var(--fg-3)",
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Completion summary — neutral, compact */}
      <p className="mt-2.5 text-xs text-[var(--fg-4)]">
        {loading ? "—" : `${achievedCount} / 6 challenges achieved`}
      </p>

      {/* KPI list — no bars, no per-row bonuses, targets on hover */}
      <div className="mt-1 divide-y divide-[var(--line)]">
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.productsPct : CHALLENGE_LABELS.productsPct}
          value={isTeam ? buildMerchContext(loc).value : pct(loc.merchandising.ratio)}
          status={merch.status}
          needText={loc.merchandising.ratio !== null ? "Needs 7%" : undefined}
          tip={<KpiTip target={`≥ 7%${merchTier > 0 ? ` (${tierLabels[merchTier]})` : ""}`} bonus="up to 5,000 ฿" gated={false} />}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.snacks : CHALLENGE_LABELS.snacks}
          value={isTeam ? buildSnacksContext(loc).value : (loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : "—")}
          status={snacks.status}
          needText={
            revenueLocked && loc.snacks.passes === true
              ? "Locked"
              : loc.snacks.ratio !== null
                ? "Needs 0.45"
                : undefined
          }
          tip={<KpiTip target="≥ 0.45" bonus={`${SNACKS_BONUS.toLocaleString()} ฿`} />}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.spendPerVisit : CHALLENGE_LABELS.spendPerVisit}
          value={isTeam ? buildPanierContext(loc).value : (loc.panierMoyen.value !== null ? `${fmt(loc.panierMoyen.value, 0)} ฿` : "—")}
          status={panier.status}
          needText={
            revenueLocked && loc.panierMoyen.passes === true
              ? "Locked"
              : loc.panierMoyen.value !== null
                ? "Needs 190 ฿"
                : undefined
          }
          tip={<KpiTip target="≥ 190 ฿" bonus={`${PANIER_BONUS.toLocaleString()} ฿`} />}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.runningCostsPct : CHALLENGE_LABELS.runningCostsPct}
          value={isTeam ? buildOpexContext(loc).value : pct(loc.opex.ratio)}
          status={opex.status}
          needText={
            revenueLocked && loc.opex.passes === true
              ? "Locked"
              : loc.opex.ratio !== null
                ? "Needs < 9.5%"
                : undefined
          }
          tip={<KpiTip target="< 9.5%" bonus={`${OPEX_BONUS.toLocaleString()} ฿`} />}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.reviewCount : CHALLENGE_LABELS.reviewCount}
          value={isTeam ? buildReviewVolumeContext(loc).value : (loc.reviews.volumeRatio !== null ? pct(loc.reviews.volumeRatio) : `${loc.reviews.count} reviews`)}
          status={revVolume.status}
          needText={
            revenueLocked && loc.reviews.volumePass === true
              ? "Locked"
              : loc.reviews.volumeRatio !== null
                ? "Needs 4%"
                : undefined
          }
          tip={<KpiTip target="≥ 4%" bonus={`${REVIEWS_VOLUME_BONUS.toLocaleString()} ฿`} />}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.reviewRating : CHALLENGE_LABELS.reviewRating}
          value={isTeam ? buildReviewRatingContext(loc).value : (loc.reviews.count > 0 ? loc.reviews.avgRating.toFixed(1) : "—")}
          status={revRating.status}
          needText={
            revenueLocked && loc.reviews.ratingPass === true
              ? "Locked"
              : loc.reviews.count > 0 && loc.reviews.ratingTarget > 0
                ? `Needs ${loc.reviews.ratingTarget.toFixed(1)}`
                : undefined
          }
          tip={<KpiTip target={ratingTargetLabel} bonus={`${REVIEWS_RATING_BONUS.toLocaleString()} ฿`} />}
          loading={loading}
        />
      </div>

      {/* Visitors — count first, source secondary, actions in ••• menu */}
      <div className="mt-1 flex items-center justify-between border-t border-[var(--line)] pt-1">
        <HoverTooltip content="Automatically synced from Loyverse" align="left" className="min-w-0">
          <span className="flex min-w-0 items-baseline gap-2 py-[7px]">
            <span className="text-[13px] text-[var(--fg-2)]">Visitors</span>
            <span className="font-mono text-[13px] tabular-nums text-[var(--fg)]">
              {loading ? "—" : loc.entryCount !== null ? fmt(loc.entryCount, 0) : "—"}
            </span>
          </span>
        </HoverTooltip>
        {(isOwner || isTeam) && !loading ? (
          <OverflowMenu
            label="Visitor count actions"
            items={[
              ...(isOwner
                ? [{ label: "Manual override", hint: "Edit synced counters", onSelect: () => setOverrideOpen(true) }]
                : []),
              {
                label: "Sync info",
                hint: "Automatically synced from Loyverse",
                onSelect: () => {
                  toast.info("Visitor counts sync automatically from Loyverse.");
                },
              },
            ]}
          />
        ) : (
          <span className="w-7" aria-hidden />
        )}
      </div>

      {shopTargetOpen && (
        <ShopSalesTargetModal loc={loc} onClose={() => setShopTargetOpen(false)} />
      )}
      {overrideOpen && (
        <VisitorOverrideModal
          loc={loc}
          month={month}
          loading={loading}
          onEntryUpdated={onEntryUpdated}
          onSnacksUpdated={onSnacksUpdated}
          onClose={() => setOverrideOpen(false)}
        />
      )}
    </Card>
  );
}

export function ChallengesOverview({
  isOwner,
  canManage,
}: {
  isOwner?: boolean;
  canManage?: boolean;
} = {}) {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => defaultViewMode(!!isOwner));
  const [teamLocationFilter, setTeamLocationFilter] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

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

  // Manual "Refresh all data" — same sequential pipeline as the nightly cron
  // (reviews + sheets → loyverse → write-back → counters, then cards refresh). Owner only.
  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      const res = await fetch("/api/challenges/sync-all", { method: "POST" });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        steps?: Record<string, { ok: boolean; skipped?: boolean; error?: string }>;
      };
      if (!res.ok) throw new Error(json.error ?? "Refresh all data failed");
      const failed = Object.entries(json.steps ?? {})
        .filter(([, s]) => !s.ok && !s.skipped)
        .map(([k, s]) => `${k}: ${s.error ?? "failed"}`);
      if (failed.length > 0) {
        toast.warning(`Refresh terminé avec erreurs — ${failed.join(" · ")}`);
      } else {
        toast.success("Refresh terminé — reviews, sheets, Loyverse, compteurs");
      }
      await fetchData(month, { silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh all data failed");
    } finally {
      setSyncingAll(false);
    }
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

  function exportOverviewPdf(teamMode = false, locationsOverride?: LocationOverview[]) {
    const exportLocations = locationsOverride ?? locations;
    if (exportLocations.length === 0) return;
    openPrintHtml(buildOverviewPrintHtml(exportLocations, month, { summaryOnly: false, teamMode }));
  }

  function exportSelectedShopTeamPdf() {
    if (teamLocationFilter === "all") return;
    const shop = locations.find((l) => l.locationId === teamLocationFilter);
    if (!shop) return;
    exportOverviewPdf(true, [shop]);
  }

  const isTeamView = viewMode === "team";
  const filteredLocations =
    isTeamView && teamLocationFilter !== "all"
      ? locations.filter((l) => l.locationId === teamLocationFilter)
      : locations;

  return (
    <div className="flex flex-col gap-5">
      {/* Light top controls: month + total earned, then view switch + actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <MonthSelector value={month} onChange={setMonth} />
          {!loading && locations.length > 0 && (
            <p className="text-[13px] text-[var(--fg-3)]">
              <span className="font-mono font-semibold tabular-nums text-[var(--fg)]">
                {totalEarned.toLocaleString()} ฿
              </span>{" "}
              earned across all shops
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSyncAll}
                disabled={syncingAll || loading}
                title="Refresh all data: sync reviews, pull latest Sheets data, refresh Loyverse visitors & animal food, then update cards (same pipeline as the nightly cron)"
              >
                <RefreshCwIcon size={13} className={syncingAll ? "animate-spin" : ""} />
                {syncingAll ? "Refreshing…" : "Refresh all data"}
              </Button>
            )}
            <OverflowMenu
              label="Export PDFs"
              icon="printer"
              items={[
                { label: "Operations PDF", hint: "Summary + one detailed page per shop", onSelect: () => exportOverviewPdf(false) },
                { label: "Team PDF", hint: "Friendlier wording for shop teams", onSelect: () => exportOverviewPdf(true) },
              ]}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSettingsOpen(true)}
              title="Challenge targets, bonuses and sales targets"
            >
              <Settings2Icon size={13} />
              Challenge settings
            </Button>
          </div>
        </div>
      </div>

      {/* Team view — location filter */}
      {isTeamView && locations.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <TeamLocationFilter
            locations={locations}
            value={teamLocationFilter}
            onChange={setTeamLocationFilter}
          />
          {teamLocationFilter !== "all" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={exportSelectedShopTeamPdf}
              disabled={loading}
            >
              <PrinterIcon size={13} />
              Shop PDF
            </Button>
          )}
        </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-[var(--r-lg)] border border-[var(--line)] bg-transparent" />
            ))}
          </div>
        )
      ) : locations.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-[var(--r-lg)] border border-[var(--line)] bg-transparent">
          <span className="text-sm text-[var(--fg-4)]">No data yet for this month.</span>
        </div>
      ) : isTeamView ? (
        <div className="flex flex-col gap-8">
          {filteredLocations.map((loc) => (
            <TeamLocationDashboard key={loc.locationId} loc={loc} month={month} loading={loading} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      {settingsOpen && (
        <ChallengeSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} isOwner={isOwner} />
      )}
    </div>
  );
}
