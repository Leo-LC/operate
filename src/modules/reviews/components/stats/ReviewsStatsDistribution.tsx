"use client";

import type { StatsSummary } from "../../lib/stats";
import {
  describeStarRow,
  formatCount,
  formatPercent,
  lowStarCount,
  lowStarShare,
  starRows,
} from "../../lib/stats-view";

interface Props {
  distribution: StatsSummary["distribution"] | null;
  count: number;
  loading: boolean;
  unavailable?: boolean;
}

/**
 * Compact overall 1★–5★ panel, derived from `overall.distribution` of the
 * same stats response (no extra request).
 */
export function ReviewsStatsDistribution({ distribution, count, loading, unavailable = false }: Props) {
  const rows = starRows(distribution, count);
  const lowShare = lowStarShare(distribution, count);
  const lowCount = lowStarCount(distribution);

  return (
    <section className="rs-panel rs-dist-panel" aria-label="Overall rating distribution">
      <div className="rs-panel-head">
        <div>
          <h2 className="rs-panel-title">Rating distribution</h2>
          {count === 0 && !loading && (
            <p className="rs-panel-sub">
              {unavailable ? "Stats unavailable" : "No reviews in this period"}
            </p>
          )}
        </div>
      </div>

      <div className="rs-panel-body">
        {loading && count === 0 ? (
          <div className="flex flex-col gap-3" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="rs-skeleton" style={{ height: 14 }} />
            ))}
          </div>
        ) : count === 0 ? (
          <p className="rs-kpi-note">
            {unavailable ? "Stats unavailable. Retry above." : "Nothing to distribute yet."}
          </p>
        ) : (
          <>
            <ul className="rs-dist">
              {rows.map((row) => (
                <li key={row.star} className="rs-dist-row" data-star={row.star}>
                  <span className="sr-only">{describeStarRow(row)}</span>
                  <span className="rs-dist-star" aria-hidden>
                    {row.star}★
                  </span>
                  <span className="rs-dist-track" aria-hidden>
                    <span
                      className="rs-dist-fill"
                      style={{ width: `${Math.max((row.share ?? 0) * 100, row.count > 0 ? 1.5 : 0)}%` }}
                    />
                  </span>
                  <span className="rs-dist-value" aria-hidden>
                    <span className="rs-dist-count">{formatCount(row.count)}</span>
                    <span className="rs-dist-share">{formatPercent(row.share, 1)}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="rs-callout">
              <span className="rs-callout-dot" aria-hidden />
              <p style={{ margin: 0 }}>
                <strong>{formatCount(lowCount)}</strong> of {formatCount(count)} (
                {formatPercent(lowShare, 1)}) are 1–3★ · lower is better
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
