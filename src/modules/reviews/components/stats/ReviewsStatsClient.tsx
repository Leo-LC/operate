"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { KpiStat } from "@/components/ui/kpi-stat";
import type { ShopOption } from "@/components/ui/filters/types";
import {
  DEFAULT_PRESET,
  PERIOD_PRESETS,
  type PeriodPreset,
  type ReviewsStatsResult,
} from "../../lib/stats";
import {
  countComparison,
  formatCount,
  formatPercent,
  formatRating,
  formatUtcRange,
  lowStarCount,
  lowStarShare,
  ratingComparison,
  sharePointComparison,
  type Comparison,
} from "../../lib/stats-view";
import { ReviewsStatsTrend } from "./ReviewsStatsTrend";
import { ReviewsStatsTable } from "./ReviewsStatsTable";
import { ReviewsStatsDistribution } from "./ReviewsStatsDistribution";
import { ReviewsBranchFilter } from "./ReviewsBranchFilter";

type SyncState = "idle" | "syncing" | "done" | "error";

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function isStatsResult(value: unknown): value is ReviewsStatsResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ReviewsStatsResult>;
  return (
    typeof v.preset === "string" &&
    !!v.overall &&
    Array.isArray(v.overallPoints) &&
    Array.isArray(v.shops) &&
    typeof v.currentFrom === "string" &&
    typeof v.currentTo === "string"
  );
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (!!error && typeof error === "object" && (error as { name?: unknown }).name === "AbortError")
  );
}

function ComparisonText({ comparison }: { comparison: Comparison | null }) {
  if (!comparison) return null;
  const arrow =
    comparison.direction === "up" ? "▲" : comparison.direction === "down" ? "▼" : null;
  const srDirection =
    comparison.direction === "up" ? "Up " : comparison.direction === "down" ? "Down " : "";
  // Keep "30 days" together so narrow KPI cards break before the window, not inside it.
  const detail = comparison.detail.replace(/ (\d+) (days|months)/, "\u00A0$1\u00A0$2");
  const note = comparison.note;
  const title = note ? `${srDirection}${comparison.detail} · ${note}` : undefined;
  return (
    <p className="rs-delta" data-tone={comparison.tone} title={title}>
      {arrow && (
        <span className="rs-delta-arrow" aria-hidden>
          {arrow}
        </span>
      )}
      <span>
        <span className="sr-only">{srDirection}</span>
        {detail}
        {note && <span className="sr-only"> ({note})</span>}
      </span>
    </p>
  );
}

export function ReviewsStatsClient() {
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [selected, setSelected] = useState<string[]>([]); // [] = all branches
  const [data, setData] = useState<ReviewsStatsResult | null>(null);
  const [shopOptions, setShopOptions] = useState<ShopOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dataScopeLabel, setDataScopeLabel] = useState<string | null>(null);

  const shopsKey = selected.join(",");
  const requestedPreset = PERIOD_PRESETS.find((p) => p.key === preset);
  const requestedPeriodLabel = requestedPreset?.label.toLowerCase() ?? "period";

  // One request per filter change. AbortController + the aborted check make
  // sure a slow older response can never overwrite a newer selection.
  useEffect(() => {
    const controller = new AbortController();
    const shopList = shopsKey ? shopsKey.split(",").filter(Boolean) : [];
    const params = new URLSearchParams({ preset });
    if (shopList.length > 0) params.set("shops", shopsKey);

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(`/api/reviews/stats?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(readError(json) ?? `Stats request failed (${res.status})`);
        }
        if (!isStatsResult(json)) {
          throw new Error(readError(json) ?? "Unexpected stats response");
        }
        if (controller.signal.aborted) return;

        setData(json);
        setLoadedAt(new Date());
        setDataScopeLabel(
          shopList.length === 0
            ? "All branches"
            : shopList.length === 1
              ? json.shops.find((shop) => shop.key === shopList[0])?.title ?? "1 branch"
              : `${shopList.length} branches`,
        );
        setShopOptions((prev) => {
          const next = json.shops.map((shop) => ({ id: shop.key, name: shop.title }));
          // Keep filter options stable when a request fails or a shop
          // temporarily has no rows: never shrink an already-populated list.
          if (prev.length === 0) return next;
          const seen = new Set(next.map((shop) => shop.id));
          const kept = prev.filter((shop) => !seen.has(shop.id));
          return kept.length === 0 ? next : [...next, ...kept];
        });
      } catch (e) {
        if (controller.signal.aborted || isAbortError(e)) return;
        setError(e instanceof Error ? e.message : "Could not load review stats");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [preset, shopsKey, reloadToken]);

  async function syncNow() {
    setSyncState("syncing");
    setSyncError(null);
    try {
      const res = await fetch("/api/challenges/reviews/sync", { method: "POST" });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(readError(json) ?? `Sync failed (${res.status})`);
      }
      setSyncState("done");
      setReloadToken((token) => token + 1);
    } catch (e) {
      setSyncState("error");
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    }
  }

  function retryLoad() {
    setReloadToken((token) => token + 1);
  }

  const overall = data?.overall ?? null;
  const hasCurrent = !!overall && overall.count > 0;

  // Labels always come from the response that is on screen, never from the
  // filter the user just clicked — so a refresh can never mislabel old data.
  const periodLabel = useMemo(() => {
    const def = data ? PERIOD_PRESETS.find((p) => p.key === data.preset) : undefined;
    return def ? def.label.toLowerCase() : requestedPeriodLabel;
  }, [data, requestedPeriodLabel]);

  const rangeLabel = data ? formatUtcRange(data.currentFrom, data.currentTo) : "";
  const lowShare = overall ? lowStarShare(overall.distribution, overall.count) : null;
  const priorLowShare =
    overall?.priorDistribution && overall.priorCount > 0
      ? lowStarShare(overall.priorDistribution, overall.priorCount)
      : null;

  const scopeLabel =
    selected.length === 0
      ? "All branches"
      : shopOptions.length > 0
        ? `${selected.length} of ${shopOptions.length} branches`
        : `${selected.length} selected`;

  const loadingScope = `${scopeLabel}, last ${requestedPeriodLabel}`;
  const unavailable = !loading && !data && !!error;
  const emptyHint = loading
    ? "Loading cached stats…"
    : unavailable
      ? "Stats unavailable"
      : "No reviews in this period";

  const repliedCount =
    overall && overall.replyRate != null ? Math.round(overall.replyRate * overall.count) : null;
  const lowCount = overall ? lowStarCount(overall.distribution) : 0;
  const priorCountHint =
    overall && overall.priorCount > 0
      ? `Previous: ${formatCount(overall.priorCount)}`
      : "No prior period data";
  const priorRatingHint =
    overall?.priorAvg != null
      ? `Previous: ${formatRating(overall.priorAvg)} · delta before rounding`
      : "No prior period data";

  return (
    <div className="revstats">
      <div className="rs-toolbar">
        <div className="rs-controls">
          <div className="rs-control-row">
            <span className="rs-control-label" id="rs-period-label">
              Period
            </span>
            <div className="rs-scroll-row" role="group" aria-labelledby="rs-period-label">
              {PERIOD_PRESETS.map((p) => (
                <PillButton
                  key={p.key}
                  className="rs-pill"
                  active={preset === p.key}
                  onClick={() => setPreset(p.key)}
                >
                  Last {p.label}
                </PillButton>
              ))}
            </div>
          </div>

          <div className="rs-control-row">
            <span className="rs-control-label" id="rs-branches-label">
              Branches
            </span>
            <div className="min-w-0 flex-1" role="group" aria-labelledby="rs-branches-label">
              <ReviewsBranchFilter
                options={shopOptions}
                selected={selected}
                onChange={setSelected}
                allLabel="All branches"
              />
            </div>
          </div>
        </div>

        <div className="rs-toolbar-side">
          <p className="rs-meta">
            {/* Keep the meta line tied to the response on screen; the loading
                pill above already names the newly requested scope. */}
            <strong>{dataScopeLabel ?? scopeLabel}</strong>
            {rangeLabel && (
              <>
                <span className="rs-meta-sep" aria-hidden>
                  ·
                </span>
                <span>{rangeLabel}</span>
              </>
            )}
          </p>
          <button type="button" className="rs-sync" onClick={syncNow} disabled={syncState === "syncing"}>
            <RefreshCwIcon
              size={13}
              aria-hidden
              className={syncState === "syncing" ? "rs-spin" : undefined}
            />
            {syncState === "syncing" ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {loading
          ? `Loading stats for ${loadingScope}.`
          : error
            ? ""
            : data
              ? `Stats loaded for ${scopeLabel}, last ${periodLabel}: ${formatCount(
                  data.overall.count,
                )} reviews.`
              : ""}
      </p>

      {error && (
        <div className="rs-banner" role="alert">
          <p className="rs-banner-msg">
            <strong>Could not load stats.</strong> {error}
            {data ? " The last successful result is still shown below." : ""}
          </p>
          <button type="button" onClick={retryLoad}>
            Retry
          </button>
        </div>
      )}

      {syncState === "error" && (
        <div className="rs-banner" role="alert">
          <p className="rs-banner-msg">
            <strong>Sync failed.</strong> {syncError} Cached stats are still shown; try again when
            the Google connection is available.
          </p>
          <button type="button" onClick={syncNow}>
            Retry sync
          </button>
        </div>
      )}

      <div className="rs-region" aria-busy={loading}>
        {loading && data && (
          <div className="rs-veil" aria-hidden>
            <span className="rs-loading-pill">
              <RefreshCwIcon size={12} className="rs-spin" /> Loading {loadingScope}…
            </span>
          </div>
        )}

        <div className="rs-top">
          <div className="rs-kpis">
            <KpiStat
              label="Reviews"
              value={overall ? formatCount(overall.count) : "—"}
              comparison={overall ? <ComparisonText comparison={countComparison(overall.count, overall.priorCount, periodLabel)} /> : null}
              hint={hasCurrent ? priorCountHint : emptyHint}
            />
            <KpiStat
              label="Average rating"
              value={formatRating(overall?.avg ?? null)}
              unit="/5"
              comparison={overall ? <ComparisonText comparison={ratingComparison(overall.avg, overall.priorAvg, periodLabel)} /> : null}
              hint={hasCurrent ? priorRatingHint : emptyHint}
            />
            <KpiStat
              label="Public reply rate"
              value={formatPercent(overall?.replyRate ?? null)}
              hint={
                hasCurrent && repliedCount != null && overall
                  ? `${formatCount(repliedCount)} of ${formatCount(overall.count)}`
                  : emptyHint
              }
            />
            <KpiStat
              label="With photos"
              value={formatPercent(overall?.photoRate ?? null)}
              hint={hasCurrent ? "reviewer-attached photos" : emptyHint}
            />
            <KpiStat
              label="1–3★ share"
              value={formatPercent(lowShare)}
              comparison={overall ? <ComparisonText comparison={sharePointComparison(lowShare, priorLowShare, periodLabel)} /> : null}
              hint={
                hasCurrent && overall
                  ? `${formatCount(lowCount)} of ${formatCount(overall.count)} · lower is better`
                  : emptyHint
              }
            />
          </div>

          <ReviewsStatsTrend
            points={data?.overallPoints ?? []}
            granularity={data?.granularity ?? "week"}
            loading={loading}
            unavailable={unavailable}
            rangeLabel={rangeLabel}
            scopeLabel={dataScopeLabel ?? undefined}
          />
        </div>

        <div className="rs-bottom">
          <ReviewsStatsTable
            shops={data?.shops ?? []}
            granularity={data?.granularity ?? "week"}
            periodLabel={periodLabel}
            loading={loading}
            unavailable={unavailable}
          />
          <ReviewsStatsDistribution
            distribution={overall?.distribution ?? null}
            count={overall?.count ?? 0}
            loading={loading}
            unavailable={unavailable}
          />
        </div>
      </div>

      <div className="rs-statusbar">
        <span className="rs-status-left">
          <span className="rs-status-dot" aria-hidden />
          {data && loadedAt
            ? `Updated ${loadedAt.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : loading
              ? "Loading cached stats…"
              : "Stats unavailable"}
        </span>
        <span>
          {syncState === "done" ? "Sync finished." : "Sync fetches new reviews"}
        </span>
      </div>
    </div>
  );
}
