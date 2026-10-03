"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CircleHelpIcon,
  EllipsisIcon,
  Lock,
  PencilIcon,
  PrinterIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { MonthSelector } from "./MonthSelector";
import { SalesTargetSettings } from "./SalesTargetSettings";
import type { LocationOverview } from "@/modules/challenges/overview-data";
import { buildOverviewPrintHtml } from "@/modules/challenges/exportOverviewHtml";
import {
  applyDisplayOverrides,
  type AdjustedMetric,
  type DisplayOverrideInput,
  type DisplayOverrideKey,
} from "@/modules/challenges/lib/display-overrides";
import {
  CHALLENGE_LABELS,
  PERIOD_LABELS,
  TEAM_CHALLENGE_LABELS,
  VIEW_MODE_LABELS,
} from "@/modules/challenges/labels";
import { TeamLocationDashboard } from "./TeamLocationDashboard";
import { shortLocationName } from "@/modules/challenges/team-metrics";
import { normalizeLocationKey } from "@/modules/challenges/constants";
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

interface OverridesData {
  overrides: { location_id: string; metric_key: DisplayOverrideKey; display_value: number }[];
}

interface DisplayEntry {
  real: LocationOverview;
  display: LocationOverview;
  adjusted: Partial<Record<DisplayOverrideKey, AdjustedMetric>>;
  hasOverride: boolean;
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

type KpiStatus = "achieved" | "locked" | "missed" | "nodata";

/**
 * One challenge row: label | current | target | status.
 * - achieved → quiet green check (bonus paid)
 * - locked → target met but bonus held until the sales target is cleared
 * - missed → below target, compare Current vs Target
 * - nodata → counters not synced yet
 */
function KpiRow({
  label,
  value,
  target,
  targetMet,
  status,
  loading,
}: {
  label: string;
  value: string;
  target: string;
  targetMet: boolean;
  status: KpiStatus;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_4.75rem_4rem] items-baseline gap-3 py-2">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="h-3 w-12 animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="h-3 w-12 animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="h-3 w-10 animate-pulse rounded bg-[var(--bg-2)]" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_4.75rem_4rem] items-baseline gap-3 py-2">
      <span className="min-w-0 truncate text-[13px] text-[var(--fg-2)]">{label}</span>
      <span
        className={`text-right font-mono text-[13px] tabular-nums ${
          status === "nodata" ? "text-[var(--fg-4)]" : "text-[var(--fg)]"
        }`}
      >
        {value}
      </span>
      <span
        className={`text-right font-mono text-xs tabular-nums ${
          targetMet ? "font-semibold text-[var(--good)]" : "text-[var(--fg-4)]"
        }`}
      >
        {target}
      </span>
      <span className="text-right">
        {status === "achieved" ? (
          <span className="text-[13px] font-medium text-[var(--good)]" aria-label="Achieved">✓</span>
        ) : status === "locked" ? (
          <span className="inline-flex items-center justify-end gap-1 text-xs text-[var(--fg-3)]" aria-label="Target met, bonus locked until sales target is cleared">
            <Lock className="size-3" aria-hidden />
            Locked
          </span>
        ) : status === "missed" ? (
          <span className="text-xs font-medium text-[var(--warn)]">Missed</span>
        ) : (
          <span className="text-[11px] text-[var(--fg-4)]">No data</span>
        )}
      </span>
    </div>
  );
}

const CHALLENGE_RULES: { label: string; target: string; bonus: string }[] = [
  { label: "Sales target", target: "Per shop (unlocks gated bonuses)", bonus: "—" },
  { label: "Merchandise", target: "≥ 7% → 8% → 9% of sales", bonus: "1,500 → 3,000 → 5,000 ฿" },
  { label: "Animal Food", target: "≥ 0.45 / visitor", bonus: "1,250 ฿" },
  { label: "Spend per visit", target: "≥ 190 ฿", bonus: "1,250 ฿" },
  { label: "Running costs", target: "< 9.5% of sales", bonus: "1,250 ฿" },
  { label: "Review count", target: "≥ 4% of visitors", bonus: "625 ฿" },
  { label: "Review rating", target: "+0.1★ vs Google · min 10 reviews/mo", bonus: "625 ฿" },
];

const STATUS_MEANINGS: { status: string; meaning: string }[] = [
  { status: "✓ Achieved", meaning: "Target met — bonus paid." },
  { status: "Locked", meaning: "Target met — bonus held until the shop clears its sales target." },
  { status: "Missed", meaning: "Below target — compare Current vs Target." },
  { status: "No data", meaning: "Counters not synced yet — check Loyverse sync." },
];

function ChallengeRulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Challenge rules"
      description="Targets, bonuses and what each status means."
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
              {CHALLENGE_RULES.map((r) => (
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
          <p className="mb-2 text-[13px] font-medium text-[var(--fg)]">Statuses</p>
          <div className="flex flex-col rounded-[var(--r-sm)] border border-[var(--line)]">
            {STATUS_MEANINGS.map((s) => (
              <div key={s.status} className="flex items-baseline gap-3 border-b border-[var(--line)] px-3 py-2 last:border-b-0">
                <span className="w-24 shrink-0 text-[13px] font-medium text-[var(--fg)]">{s.status}</span>
                <span className="text-[13px] text-[var(--fg-3)]">{s.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ShopSalesTargetModal({ loc, onClose }: { loc: LocationOverview; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      width={420}
      compact
      title={`Sales target — ${shortName(loc.locationTitle)}`}
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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Challenge settings"
      description="Per-shop sales targets. Only the owner can edit them — see the rules via the ? button."
      footer={
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={onClose}>Done</Button>
        </div>
      }
    >
      {isOwner ? (
        <SalesTargetSettings />
      ) : (
        <p className="text-[13px] text-[var(--fg-4)]">Only the owner can view and edit sales targets.</p>
      )}
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

/**
 * Display adjust — end-of-month print tweaks (owner only).
 *
 * Edits the FINAL displayed numbers (cards + printed PDFs) WITHOUT touching
 * any source of truth (Loyverse, accounting, counters, reviews). Each field
 * writes one row to `challenge_display_overrides`; clearing a field or hitting
 * revert deletes the row and the real computed value shows again.
 */
interface AdjustField {
  key: DisplayOverrideKey;
  label: string;
  unit: string;
  step: string;
  /** Real value → user-unit input string. */
  toInput: (loc: LocationOverview) => string;
  /** User-unit input string → raw stored value (null = invalid). */
  fromInput: (raw: string) => number | null;
  /** Raw value → short user-unit hint (for the "Real:" line). */
  toHint: (raw: number | null) => string;
}

const ADJUST_FIELDS: AdjustField[] = [
  {
    key: "sales_amount",
    label: "Monthly sales",
    unit: "฿",
    step: "1000",
    toInput: (loc) => (loc.salesNetIncVat !== null ? String(Math.round(loc.salesNetIncVat)) : ""),
    fromInput: (raw) => {
      const v = parseInt(raw, 10);
      return isNaN(v) || v < 0 ? null : v;
    },
    toHint: (raw) => (raw !== null ? `${Math.round(raw).toLocaleString()} ฿` : "—"),
  },
  {
    key: "merch_ratio",
    label: "Merchandise",
    unit: "% of sales",
    step: "0.1",
    toInput: (loc) => (loc.merchandising.ratio !== null ? (loc.merchandising.ratio * 100).toFixed(1) : ""),
    fromInput: (raw) => {
      const v = parseFloat(raw);
      return isNaN(v) || v < 0 ? null : v / 100;
    },
    toHint: (raw) => (raw !== null ? `${(raw * 100).toFixed(1)}%` : "—"),
  },
  {
    key: "snacks_ratio",
    label: "Animal food",
    unit: "/ visitor",
    step: "0.01",
    toInput: (loc) => (loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : ""),
    fromInput: (raw) => {
      const v = parseFloat(raw);
      return isNaN(v) || v < 0 ? null : v;
    },
    toHint: (raw) => (raw !== null ? raw.toFixed(2) : "—"),
  },
  {
    key: "panier_value",
    label: "Spend per visit",
    unit: "฿",
    step: "1",
    toInput: (loc) => (loc.panierMoyen.value !== null ? String(Math.round(loc.panierMoyen.value)) : ""),
    fromInput: (raw) => {
      const v = parseFloat(raw);
      return isNaN(v) || v < 0 ? null : v;
    },
    toHint: (raw) => (raw !== null ? `${Math.round(raw).toLocaleString()} ฿` : "—"),
  },
  {
    key: "opex_ratio",
    label: "Running costs",
    unit: "% of sales",
    step: "0.1",
    toInput: (loc) => (loc.opex.ratio !== null ? (loc.opex.ratio * 100).toFixed(1) : ""),
    fromInput: (raw) => {
      const v = parseFloat(raw);
      return isNaN(v) || v < 0 ? null : v / 100;
    },
    toHint: (raw) => (raw !== null ? `${(raw * 100).toFixed(1)}%` : "—"),
  },
  {
    key: "review_volume_ratio",
    label: "Review volume",
    unit: "% of visitors",
    step: "0.1",
    toInput: (loc) => (loc.reviews.volumeRatio !== null ? (loc.reviews.volumeRatio * 100).toFixed(1) : ""),
    fromInput: (raw) => {
      const v = parseFloat(raw);
      return isNaN(v) || v < 0 ? null : v / 100;
    },
    toHint: (raw) => (raw !== null ? `${(raw * 100).toFixed(1)}%` : "—"),
  },
  {
    key: "review_rating_avg",
    label: "Review rating",
    unit: "★",
    step: "0.1",
    toInput: (loc) => (loc.reviews.count > 0 ? loc.reviews.avgRating.toFixed(1) : ""),
    fromInput: (raw) => {
      const v = parseFloat(raw);
      return isNaN(v) || v < 0 || v > 5 ? null : v;
    },
    toHint: (raw) => (raw !== null ? `${raw.toFixed(1)}★` : "—"),
  },
];

function DisplayAdjustModal({
  realLoc,
  displayLoc,
  adjusted,
  month,
  onChanged,
  onClose,
}: {
  realLoc: LocationOverview;
  displayLoc: LocationOverview;
  adjusted: Partial<Record<DisplayOverrideKey, AdjustedMetric>>;
  month: string;
  onChanged: () => void;
  onClose: () => void;
}) {
  // Drafts in user units, seeded from the CURRENTLY DISPLAYED values.
  const [drafts, setDrafts] = useState<Record<DisplayOverrideKey, string>>(() => {
    const init = {} as Record<DisplayOverrideKey, string>;
    for (const f of ADJUST_FIELDS) init[f.key] = f.toInput(displayLoc);
    return init;
  });
  const [saving, setSaving] = useState(false);

  async function saveField(key: DisplayOverrideKey, rawValue: number) {
    const res = await fetch("/api/challenges/overrides", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: realLoc.locationId, month, metricKey: key, displayValue: rawValue }),
    });
    if (!res.ok) throw new Error(await res.text());
  }

  async function revertField(key: DisplayOverrideKey) {
    const res = await fetch("/api/challenges/overrides", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: realLoc.locationId, month, metricKey: key }),
    });
    if (!res.ok) throw new Error(await res.text());
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const f of ADJUST_FIELDS) {
        const draft = (drafts[f.key] ?? "").trim();
        const currentDisplay = f.toInput(displayLoc);
        if (draft === currentDisplay) continue; // unchanged
        if (draft === "") {
          // Cleared → revert to real (only if an override existed).
          if (adjusted[f.key]) await revertField(f.key);
          continue;
        }
        const parsed = f.fromInput(draft);
        if (parsed === null) {
          toast.error(`Invalid value for ${f.label} — skipped`);
          continue;
        }
        await saveField(f.key, parsed);
      }
      toast.success("Display adjusted — real data untouched");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevertOne(key: DisplayOverrideKey) {
    try {
      await revertField(key);
      toast.success("Reverted to the real value");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revert failed");
    }
  }

  async function handleRevertAll() {
    try {
      const res = await fetch("/api/challenges/overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: realLoc.locationId, month }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("All adjustments reverted — showing real values");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revert failed");
    }
  }

  const hasAny = Object.keys(adjusted).length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjust display — ${shortName(realLoc.locationTitle)}`}
      description="Print tweaks only: cards + PDFs show these values, but Loyverse / accounting / counters / reviews stay untouched. Clear a field or revert to show the real value again."
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="secondary" onClick={handleRevertAll} disabled={saving || !hasAny} title="Delete all overrides for this shop + month">
            <RotateCcwIcon size={13} />
            Revert all
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save adjustments"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col">
        {ADJUST_FIELDS.map((f) => {
          const adj = adjusted[f.key];
          return (
            <div key={f.key} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2 border-b border-[var(--line)] py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[var(--fg)]">
                  {f.label}
                  {adj && (
                    <span className="ml-1.5 rounded-full bg-[var(--warn-soft)] px-1.5 py-px text-[10px] font-bold text-[var(--warn)]" title={`Real value: ${f.toHint(adj.real)}`}>
                      Adjusted
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[var(--fg-4)]">
                  Real: {f.toHint(adj ? adj.real : realValueFor(realLoc, f.key, f))} · {f.unit}
                </p>
              </div>
              <input
                type="number"
                min={0}
                step={f.step}
                inputMode="decimal"
                value={drafts[f.key] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
                aria-label={`${f.label} display value`}
                className="w-28 rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)] px-1.5 py-1 font-mono text-sm tabular-nums text-[var(--fg)] outline-none transition-colors hover:border-[var(--fg-4)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
              {adj ? (
                <button
                  type="button"
                  onClick={() => handleRevertOne(f.key)}
                  title={`Revert ${f.label} to the real value (${f.toHint(adj.real)})`}
                  aria-label={`Revert ${f.label} to real value`}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-4)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--fg)]"
                >
                  <RotateCcwIcon className="size-3.5" aria-hidden />
                </button>
              ) : (
                <span className="w-7" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/** Raw real value for a field key (used for the "Real:" hint when not overridden). */
function realValueFor(loc: LocationOverview, key: DisplayOverrideKey, f: AdjustField): number | null {
  const parsed = f.fromInput(f.toInput(loc));
  return parsed;
}

function LocationCard({
  loc,
  realLoc,
  adjusted,
  hasOverride,
  month,
  loading,
  isOwner,
  viewMode,
  onEntryUpdated,
  onSnacksUpdated,
  onOverridesChanged,
}: {
  /** Display location (real values + print overrides applied). */
  loc: LocationOverview;
  /** Untouched real computed values (for "Real:" hints). */
  realLoc: LocationOverview;
  adjusted: Partial<Record<DisplayOverrideKey, AdjustedMetric>>;
  hasOverride: boolean;
  month: string;
  loading: boolean;
  isOwner?: boolean;
  viewMode: ViewMode;
  onEntryUpdated: (id: string, period: 1 | 2 | 3, val: number) => void;
  onSnacksUpdated: (id: string, period: 1 | 2 | 3, val: number) => void;
  onOverridesChanged: () => void;
}) {
  const [shopTargetOpen, setShopTargetOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
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

  function rowState(passes: boolean | null, lockedOut: boolean): KpiStatus {
    if (passes === null) return "nodata";
    if (passes === true) return lockedOut ? "locked" : "achieved";
    return "missed";
  }

  const merch = rowState(merchPass, false);
  const snacks = rowState(loc.snacks.passes, revenueLocked);
  const panier = rowState(loc.panierMoyen.passes, revenueLocked);
  const opex = rowState(loc.opex.passes, revenueLocked);
  const revVolume = rowState(loc.reviews.volumePass, revenueLocked);
  const revRating = rowState(loc.reviews.ratingPass, revenueLocked);

  const ratingTargetLabel =
    loc.reviews.currentRating > 0 && loc.reviews.ratingTarget > 0
      ? `≥ ${loc.reviews.ratingTarget.toFixed(1)}`
      : "—";

  return (
    <Card className="overflow-visible p-5">
      {/* Header: shop identity + total bonus */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-[17px] font-semibold tracking-tight text-[var(--fg)]">
          <span className="min-w-0 truncate">{shortName(loc.locationTitle)}</span>
          {hasOverride && !loading && (
            <span
              className="shrink-0 rounded-full bg-[var(--warn-soft)] px-1.5 py-px text-[10px] font-bold text-[var(--warn)]"
              title="Display adjusted for print — real Loyverse/accounting data untouched. Revert available via the sliders button."
            >
              Adjusted
            </span>
          )}
        </p>
        {loading ? (
          <div className="h-4 w-16 animate-pulse rounded bg-[var(--bg-2)]" />
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <p
              className={`font-mono text-sm font-semibold tabular-nums ${
                totalBonus > 0 ? "text-[var(--fg)]" : "text-[var(--fg-4)]"
              }`}
              title={hasOverride ? `Print value (real total: ${realLoc.totalBonus.toLocaleString()} ฿)` : "Total bonus currently earned by this shop"}
            >
              {hasBonusData ? `${totalBonus.toLocaleString()} ฿` : "—"}
            </p>
            {isOwner && !isTeam && (
              <button
                type="button"
                onClick={() => setAdjustOpen(true)}
                title="Adjust display — tweak print values without touching real data"
                aria-label="Adjust display values for print"
                className="rounded p-1 text-[var(--fg-4)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--fg)]"
              >
                <SlidersHorizontalIcon className="size-3" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
      {hasOverride && !loading && hasBonusData && (
        <p className="mt-0.5 text-right text-[11px] text-[var(--fg-4)]" title="Bonus computed from real (unadjusted) data">
          Real: {realLoc.totalBonus.toLocaleString()} ฿
        </p>
      )}

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

      {/* Completion summary — neutral, compact, with breathing room below */}
      <p className="mb-2 mt-3 text-xs text-[var(--fg-4)]">
        {loading ? "—" : `${achievedCount} / 6 challenges achieved`}
      </p>

      {/* KPI list — current vs target columns, single status per row */}
      <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_4.75rem_4rem] items-baseline gap-3 pb-1 text-[10px] text-[var(--fg-4)]" aria-hidden>
        <span />
        <span className="text-right">Current</span>
        <span className="text-right">Target</span>
        <span className="text-right">Status</span>
      </div>
      <div className="divide-y divide-[var(--line)]">
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.productsPct : CHALLENGE_LABELS.productsPct}
          value={isTeam ? buildMerchContext(loc).value : pct(loc.merchandising.ratio)}
          target="≥ 7%"
          targetMet={merchPass === true}
          status={merch}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.snacks : CHALLENGE_LABELS.snacks}
          value={isTeam ? buildSnacksContext(loc).value : (loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : "—")}
          target="≥ 0.45"
          targetMet={loc.snacks.passes === true}
          status={snacks}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.spendPerVisit : CHALLENGE_LABELS.spendPerVisit}
          value={isTeam ? buildPanierContext(loc).value : (loc.panierMoyen.value !== null ? `${fmt(loc.panierMoyen.value, 0)} ฿` : "—")}
          target="≥ 190 ฿"
          targetMet={loc.panierMoyen.passes === true}
          status={panier}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.runningCostsPct : CHALLENGE_LABELS.runningCostsPct}
          value={isTeam ? buildOpexContext(loc).value : pct(loc.opex.ratio)}
          target="< 9.5%"
          targetMet={loc.opex.passes === true}
          status={opex}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.reviewCount : CHALLENGE_LABELS.reviewCount}
          value={isTeam ? buildReviewVolumeContext(loc).value : (loc.reviews.volumeRatio !== null ? pct(loc.reviews.volumeRatio) : `${loc.reviews.count} reviews`)}
          target="≥ 4%"
          targetMet={loc.reviews.volumePass === true}
          status={revVolume}
          loading={loading}
        />
        <KpiRow
          label={isTeam ? TEAM_CHALLENGE_LABELS.reviewRating : CHALLENGE_LABELS.reviewRating}
          value={isTeam ? buildReviewRatingContext(loc).value : (loc.reviews.count > 0 ? loc.reviews.avgRating.toFixed(1) : "—")}
          target={ratingTargetLabel}
          targetMet={loc.reviews.ratingPass === true}
          status={revRating}
          loading={loading}
        />
      </div>

      {/* Raw counts — data, not challenges: muted mono line, visually separate */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2">
        <p className="min-w-0 truncate font-mono text-xs tabular-nums text-[var(--fg-3)]">
          {loading
            ? "—"
            : loc.entryCount !== null || loc.snacksSold !== null
              ? `${loc.entryCount !== null ? `${fmt(loc.entryCount, 0)} visitors` : "— visitors"} · ${loc.snacksSold !== null ? `${fmt(loc.snacksSold, 0)} animal food` : "— animal food"}`
              : "No counts yet"}
        </p>
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
      {adjustOpen && (
        <DisplayAdjustModal
          realLoc={realLoc}
          displayLoc={loc}
          adjusted={adjusted}
          month={month}
          onChanged={onOverridesChanged}
          onClose={() => setAdjustOpen(false)}
        />
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
  const [overrideRows, setOverrideRows] = useState<OverridesData["overrides"]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => defaultViewMode(!!isOwner));
  const [teamLocationFilter, setTeamLocationFilter] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
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
      const [overviewRes, overridesRes] = await Promise.all([
        fetch(`/api/challenges/overview?month=${m}`),
        fetch(`/api/challenges/overrides?month=${m}`),
      ]);
      if (!overviewRes.ok) throw new Error(await overviewRes.text());
      setData((await overviewRes.json()) as OverviewData);
      if (overridesRes.ok) {
        setOverrideRows(((await overridesRes.json()) as OverridesData).overrides ?? []);
      }
    } catch (e) {
      console.error("[ChallengesOverview] fetch error:", e);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const fetchOverridesSilent = useCallback(async (m: string) => {
    try {
      const res = await fetch(`/api/challenges/overrides?month=${m}`);
      if (res.ok) setOverrideRows(((await res.json()) as OverridesData).overrides ?? []);
    } catch (e) {
      console.error("[ChallengesOverview] overrides fetch error:", e);
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

  // Display overlay: real computed values + owner print overrides.
  // Cards AND exported PDFs render `display`, so the printed numbers match
  // the screen. Sources (Loyverse/accounting/counters/reviews) are untouched.
  const entries: DisplayEntry[] = useMemo(() => {
    const locations = data?.locations ?? [];
    const byLoc = new Map<string, DisplayOverrideInput>();
    for (const row of overrideRows) {
      const map = byLoc.get(row.location_id) ?? {};
      map[row.metric_key] = Number(row.display_value);
      byLoc.set(row.location_id, map);
    }
    return locations.map((real) => {
      const applied = applyDisplayOverrides(real, byLoc.get(real.locationId) ?? {});
      return { real, display: applied.loc, adjusted: applied.adjusted, hasOverride: applied.hasOverride };
    });
  }, [data, overrideRows]);

  // Summary stats (display values — what will be printed)
  const totalEarned = entries.reduce((s, e) => s + e.display.totalBonus, 0);

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

  function exportOverviewPdf(teamMode = false, entriesOverride?: DisplayEntry[]) {
    const exportEntries = entriesOverride ?? entries;
    if (exportEntries.length === 0) return;
    openPrintHtml(
      buildOverviewPrintHtml(exportEntries.map((e) => e.display), month, {
        summaryOnly: false,
        teamMode,
        adjustedIds: exportEntries.filter((e) => e.hasOverride).map((e) => e.display.locationId),
      }),
    );
  }

  function exportSelectedShopTeamPdf() {
    if (teamLocationFilter === "all") return;
    const entry = entries.find((e) => e.display.locationId === teamLocationFilter);
    if (!entry) return;
    exportOverviewPdf(true, [entry]);
  }

  const isTeamView = viewMode === "team";
  const filteredEntries =
    isTeamView && teamLocationFilter !== "all"
      ? entries.filter((e) => e.display.locationId === teamLocationFilter)
      : entries;

  return (
    <div className="flex flex-col gap-5">
      {/* Light top controls: month + total earned, then view switch + actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <MonthSelector value={month} onChange={setMonth} />
          {!loading && entries.length > 0 && (
            <p className="text-[13px] text-[var(--fg-3)]">
              <span className="font-mono font-semibold tabular-nums text-[var(--fg)]">
                {totalEarned.toLocaleString()} ฿
              </span>{" "}
              earned across all shops
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              title="Challenge rules"
              aria-label="Challenge rules"
              className="flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-4)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--fg)]"
            >
              <CircleHelpIcon className="size-4" aria-hidden />
            </button>
          </div>
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
      {isTeamView && entries.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <TeamLocationFilter
            locations={entries.map((e) => e.display)}
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
      {loading && entries.length === 0 ? (
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
      ) : entries.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-[var(--r-lg)] border border-[var(--line)] bg-transparent">
          <span className="text-sm text-[var(--fg-4)]">No data yet for this month.</span>
        </div>
      ) : isTeamView ? (
        <div className="flex flex-col gap-8">
          {filteredEntries.map((entry) => (
            <TeamLocationDashboard
              key={entry.display.locationId}
              loc={entry.display}
              month={month}
              loading={loading}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <LocationCard
              key={entry.display.locationId}
              loc={entry.display}
              realLoc={entry.real}
              adjusted={entry.adjusted}
              hasOverride={entry.hasOverride}
              month={month}
              loading={loading}
              isOwner={isOwner}
              viewMode={viewMode}
              onEntryUpdated={(id, p, val) => handleEntryUpdated(id, p, val)}
              onSnacksUpdated={(id, p, val) => handleSnacksUpdated(id, p, val)}
              onOverridesChanged={() => fetchOverridesSilent(month)}
            />
          ))}
        </div>
      )}

      {settingsOpen && (
        <ChallengeSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} isOwner={isOwner} />
      )}

      {rulesOpen && (
        <ChallengeRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      )}
    </div>
  );
}
