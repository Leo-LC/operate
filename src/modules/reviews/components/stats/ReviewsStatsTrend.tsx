"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Granularity, StatsPoint } from "../../lib/stats";
import { formatCount, formatRating, granularityNoun } from "../../lib/stats-view";

interface ChartDatum {
  label: string;
  reviews: number;
  rating: number | null;
}

interface Props {
  points: StatsPoint[];
  granularity: Granularity;
  loading?: boolean;
  height?: number;
  /** Inside an expanded table row: no panel chrome, smaller heading. */
  compact?: boolean;
  /** The request failed and there is nothing to show. */
  unavailable?: boolean;
  /** Real window label from the stats response, e.g. "26 Sep – 25 Oct 2026". */
  rangeLabel?: string;
  /** Optional scope label ("All branches", "Karan + 2 more"). */
  scopeLabel?: string;
}

interface TrendTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ payload?: ChartDatum }>;
}

function TrendTooltip({ active, label, payload }: TrendTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="rs-tooltip">
      <p className="rs-tooltip-title">{label}</p>
      <p className="rs-tooltip-row">
        Reviews <b>{formatCount(datum.reviews)}</b>
      </p>
      <p className="rs-tooltip-row">
        Avg rating <b>{formatRating(datum.rating)} / 5</b>
      </p>
    </div>
  );
}

function toChartData(points: StatsPoint[]): ChartDatum[] {
  return points.map((p) => ({
    label: p.label,
    reviews: p.count,
    rating: p.count > 0 ? Math.round((p.ratingSum / p.count) * 100) / 100 : null,
  }));
}

export function ReviewsStatsTrend({
  points,
  granularity,
  loading = false,
  height = 250,
  compact = false,
  unavailable = false,
  rangeLabel,
  scopeLabel,
}: Props) {
  const data = useMemo(() => toChartData(points), [points]);
  const noun = granularityNoun(granularity);
  const totalReviews = useMemo(() => points.reduce((sum, p) => sum + p.count, 0), [points]);
  const totalRatingSum = useMemo(() => points.reduce((sum, p) => sum + p.ratingSum, 0), [points]);
  const overallRating = totalReviews > 0 ? totalRatingSum / totalReviews : null;
  const isEmpty = totalReviews === 0;

  const heading = compact ? `Reviews per ${noun}` : "Review volume and average rating";

  if (loading && points.length === 0) {
    return (
      <div className={compact ? "" : "rs-panel"}>
        <div className="rs-panel-body">
          <div className="rs-skeleton" style={{ height }} aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "rs-panel"}>
      <div className={compact ? "" : "rs-panel-head"}>
        <div>
          <h2 className={compact ? "rs-expanded-title" : "rs-panel-title"}>{heading}</h2>
        </div>
        <div className="rs-legend" aria-label="Chart legend">
          <span className="rs-legend-item">
            <span className="rs-legend-bar" aria-hidden />
            Reviews
          </span>
          <span className="rs-legend-item">
            <span className="rs-legend-line" aria-hidden />
            Avg rating /5
          </span>
        </div>
      </div>

      <div className={compact ? "" : "rs-panel-body"}>
        {isEmpty ? (
          <div className="rs-empty-chart" style={{ height }}>
            <p>{unavailable ? "Stats unavailable. Retry above." : "No reviews in this period."}</p>
          </div>
        ) : (
          <div
            className="rs-chart-frame"
            role="img"
            aria-label={`Reviews per ${noun} (bars, left axis) and average rating out of 5 (line, right axis). ${
              scopeLabel ? `${scopeLabel}. ` : ""
            }${rangeLabel ? `${rangeLabel}. ` : ""}${formatCount(totalReviews)} reviews${
              overallRating == null ? "" : `, average ${formatRating(overallRating)} out of 5`
            }. A data table follows.`}
          >
            <ResponsiveContainer width="100%" height={height}>
              <ComposedChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rs-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--rs-fg-3)" }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  minTickGap={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="count"
                  orientation="left"
                  width={38}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--rs-fg-3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="rating"
                  orientation="right"
                  width={30}
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 11, fill: "var(--rs-fg-3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={(props) => (
                    <TrendTooltip {...(props as unknown as TrendTooltipProps)} />
                  )}
                  cursor={{ fill: "var(--rs-row-hover)" }}
                />
                <Bar
                  yAxisId="count"
                  dataKey="reviews"
                  name="Reviews"
                  fill="var(--rs-bar)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={36}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="rating"
                  dataKey="rating"
                  name="Avg rating /5"
                  type="monotone"
                  stroke="var(--rs-neutral-mark)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--rs-panel)", stroke: "var(--rs-neutral-mark)", strokeWidth: 2 }}
                  activeDot={{ r: 4, fill: "var(--rs-neutral-mark)", stroke: "var(--rs-panel)", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <table className="sr-only">
          <caption>
            {`Reviews and average rating per ${noun}${rangeLabel ? `, ${rangeLabel}` : ""}`}
          </caption>
          <thead>
            <tr>
              <th scope="col">{noun}</th>
              <th scope="col">Reviews</th>
              <th scope="col">Average rating /5</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.reviews}</td>
                <td>{row.rating == null ? "No reviews" : formatRating(row.rating)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!compact && (
        <p className="rs-panel-foot">
          Bars: reviews per {noun} (left). Line: average rating /5 (right); a gap means no reviews.
        </p>
      )}
    </div>
  );
}
