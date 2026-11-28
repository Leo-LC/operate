"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Panel, PanelBody, PanelFoot, PanelHead, PanelSub, PanelTitle } from "@/components/ui/panel";
import type { Granularity, ShopStats } from "../../lib/stats";
import {
  countComparison,
  formatCount,
  formatPercent,
  formatRating,
  lowStarShare,
  ratingComparison,
  sharePointComparison,
  type Comparison,
} from "../../lib/stats-view";
import { ReviewsStatsTrend } from "./ReviewsStatsTrend";

const MIX_COLORS = [
  "var(--ui-negative)",
  "var(--ui-negative)",
  "var(--ui-warn)",
  "var(--ui-series-primary)",
  "var(--ui-series-primary)",
];

type SortKey = "count" | "avg" | "replyRate" | "photoRate" | "lowShare";

function detailId(key: string): string {
  return `branch-detail-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function sortValue(shop: ShopStats, key: SortKey): number | null {
  if (key === "count") return shop.count;
  if (key === "avg") return shop.avg;
  if (key === "replyRate") return shop.replyRate;
  if (key === "photoRate") return shop.photoRate;
  return lowStarShare(shop.distribution, shop.count);
}

function DeltaLine({ comparison }: { comparison: Comparison | null }) {
  if (!comparison) return <span className="rs-cell-sub" data-tone="neutral">—</span>;
  const arrow =
    comparison.direction === "up" ? "▲" : comparison.direction === "down" ? "▼" : null;
  const srDirection =
    comparison.direction === "up" ? "Up " : comparison.direction === "down" ? "Down " : "";
  const detail = `${srDirection}${comparison.detail}`;
  const fullDetail = comparison.note ? `${detail} · ${comparison.note}` : detail;
  return (
    <span className="rs-cell-sub" data-tone={comparison.tone} title={fullDetail}>
      {arrow && (
        <span className="rs-cell-arrow" aria-hidden>
          {arrow}{" "}
        </span>
      )}
      <span aria-hidden>{comparison.text}</span>
      <span className="sr-only">{fullDetail}</span>
    </span>
  );
}

function RatingMix({ distribution, count }: { distribution: ShopStats["distribution"]; count: number }) {
  if (count === 0) {
    return <span className="rs-cell-sub" data-tone="neutral">—</span>;
  }
  const label = [1, 2, 3, 4, 5]
    .map((star) => `${star} star: ${distribution[star - 1]}`)
    .join(", ");
  return (
    <div className="rs-mix" role="img" aria-label={label}>
      {distribution.map((n, i) =>
        n > 0 ? (
          <span
            key={i}
            className="rs-mix-seg"
            data-empty="false"
            style={{ flexGrow: n, flexBasis: 0, background: MIX_COLORS[i] }}
          />
        ) : null,
      )}
    </div>
  );
}

interface Props {
  shops: ShopStats[];
  granularity: Granularity;
  periodLabel: string;
  loading: boolean;
  unavailable?: boolean;
}

export function ReviewsStatsTable({ shops, granularity, periodLabel, loading, unavailable = false }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    return [...shops].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (va == null && vb == null) return a.title.localeCompare(b.title);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * sortDir || a.title.localeCompare(b.title);
    });
  }, [shops, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sortState = (key: SortKey): "ascending" | "descending" | "none" =>
    sortKey === key ? (sortDir === 1 ? "ascending" : "descending") : "none";

  const headerCell = (key: SortKey, label: string) => (
    <th scope="col" className="rs-th rs-th-num" aria-sort={sortState(key)}>
      <button type="button" className="rs-sort" data-active={sortKey === key} onClick={() => toggleSort(key)}>
        {label}
        {sortKey === key && (
          <span className="rs-sort-arrow" aria-hidden>
            {sortDir === 1 ? "▲" : "▼"}
          </span>
        )}
      </button>
    </th>
  );

  if (loading && shops.length === 0) {
    return (
      <Panel aria-label="Branch comparison">
        <PanelHead>
          <div>
            <PanelTitle>Branch comparison</PanelTitle>
            <PanelSub>Loading branch stats…</PanelSub>
          </div>
        </PanelHead>
        <PanelBody>
          <div className="flex flex-col gap-2" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="rs-skeleton" style={{ height: 36 }} />
            ))}
          </div>
        </PanelBody>
      </Panel>
    );
  }

  if (shops.length === 0) {
    return (
      <Panel aria-label="Branch comparison">
        <PanelHead>
          <div>
            <PanelTitle>Branch comparison</PanelTitle>
            <PanelSub>
              {unavailable ? "Stats unavailable." : "No branch data synced yet."}
            </PanelSub>
          </div>
        </PanelHead>
        <PanelBody>
          <p className="ui-kpi-note" style={{ paddingBottom: 8 }}>
            {unavailable
              ? "Use Retry above to load the cached stats again."
              : "Use Sync now to import Google reviews, then these stats will appear."}
          </p>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel aria-label="Branch comparison">
      <PanelHead>
        <div>
          <PanelTitle>Branch comparison</PanelTitle>
          <PanelSub>
            {shops.length} {shops.length === 1 ? "branch" : "branches"} · deltas vs previous{" "}
            {periodLabel}
          </PanelSub>
          <p className="rs-scroll-hint">Swipe for more columns →</p>
        </div>
      </PanelHead>

      <PanelBody flush>
        <div
          className="rs-table-wrap"
          role="region"
          aria-label="Branch comparison table, scrollable horizontally"
          tabIndex={0}
        >
          <table className="rs-table">
            <caption className="sr-only">
              Reviews, average rating, public reply rate, photo share, 1–3 star share and rating mix
              per branch, with the comparison against the prior {periodLabel}. Ratings show two
              decimals; rating comparisons use unrounded averages.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="rs-th rs-th-branch">Branch</th>
                {headerCell("count", "Reviews")}
                {headerCell("avg", "Avg rating /5")}
                {headerCell("replyRate", "Reply rate")}
                {headerCell("photoRate", "Photos")}
                {headerCell("lowShare", "1–3★ share")}
                <th scope="col" className="rs-th" title="1★ on the left, 5★ on the right">
                  Rating mix
                </th>
                <th scope="col" className="rs-th rs-th-num">
                  <span className="sr-only">Trend</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((shop) => {
                const isOpen = expanded.has(shop.key);
                const lowShare = lowStarShare(shop.distribution, shop.count);
                const priorLowShare = shop.priorDistribution
                  ? lowStarShare(shop.priorDistribution, shop.priorCount)
                  : null;
                return (
                  <RowGroup
                    key={shop.key}
                    shop={shop}
                    isOpen={isOpen}
                    onToggle={() => toggleExpand(shop.key)}
                    granularity={granularity}
                    periodLabel={periodLabel}
                    lowShare={lowShare}
                    priorLowShare={priorLowShare}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </PanelBody>

      <PanelFoot>
        Rating mix reads 1★ → 5★ · sort any column · expand a row for the branch trend.
      </PanelFoot>
    </Panel>
  );
}

function RowGroup({
  shop,
  isOpen,
  onToggle,
  granularity,
  periodLabel,
  lowShare,
  priorLowShare,
}: {
  shop: ShopStats;
  isOpen: boolean;
  onToggle: () => void;
  granularity: Granularity;
  periodLabel: string;
  lowShare: number | null;
  priorLowShare: number | null;
}) {
  return (
    <>
      <tr
        className="rs-row"
        data-open={isOpen}
        onClick={onToggle}
        style={{ cursor: "pointer" }}
      >
        <th scope="row" className="rs-row-th">
          <span className="rs-branch-name" title={shop.title}>
            {shop.title}
          </span>
        </th>
        <td className="rs-num">
          <span className="rs-cell-stack">
            <span className="rs-cell-main">{formatCount(shop.count)}</span>
            <DeltaLine comparison={countComparison(shop.count, shop.priorCount, periodLabel)} />
          </span>
        </td>
        <td className="rs-num">
          <span className="rs-cell-stack">
            <span className="rs-cell-main">{formatRating(shop.avg)}</span>
            <DeltaLine comparison={ratingComparison(shop.avg, shop.priorAvg, periodLabel)} />
          </span>
        </td>
        <td className="rs-num">
          <span className="rs-cell-stack">
            <span className="rs-cell-main">{formatPercent(shop.replyRate)}</span>
          </span>
        </td>
        <td className="rs-num">
          <span className="rs-cell-stack">
            <span className="rs-cell-main">{formatPercent(shop.photoRate)}</span>
            <span className="rs-cell-sub" data-tone="neutral">with photos</span>
          </span>
        </td>
        <td className="rs-num">
          <span className="rs-cell-stack">
            <span className="rs-cell-main">{formatPercent(lowShare)}</span>
            <DeltaLine comparison={sharePointComparison(lowShare, priorLowShare, periodLabel)} />
          </span>
        </td>
        <td>
          <RatingMix distribution={shop.distribution} count={shop.count} />
        </td>
        <td className="rs-num">
          <button
            type="button"
            className="rs-sort"
            aria-expanded={isOpen}
            aria-controls={detailId(shop.key)}
            aria-label={`${isOpen ? "Hide" : "Show"} trend for ${shop.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isOpen ? <ChevronDownIcon size={13} aria-hidden /> : <ChevronRightIcon size={13} aria-hidden />}
            <span aria-hidden>{isOpen ? "Hide" : "Chart"}</span>
          </button>
        </td>
      </tr>
      {isOpen && (
        <tr id={detailId(shop.key)}>
          <td colSpan={8} className="rs-expanded">
            <p className="rs-expanded-sub">
              {shop.priorCount > 0
                ? `Previous ${periodLabel}: ${formatCount(shop.priorCount)} reviews · ${formatRating(
                    shop.priorAvg,
                  )} avg · ${formatPercent(priorLowShare, 1)} 1–3★`
                : `No reviews in the previous ${periodLabel}.`}
            </p>
            <ReviewsStatsTrend
              compact
              points={shop.points}
              granularity={granularity}
              height={180}
              scopeLabel={shop.title}
            />
          </td>
        </tr>
      )}
    </>
  );
}
