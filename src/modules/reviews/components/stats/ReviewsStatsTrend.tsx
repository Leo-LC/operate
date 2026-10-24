"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import type { StatsPoint } from "../../lib/stats";

interface Props {
  points: StatsPoint[];
  total: number;
  loading: boolean;
  bucket: "day" | "week" | "month";
  height?: number;
}

function toChartData(points: StatsPoint[]) {
  return points.map((p) => ({
    bucket: p.label,
    Reviews: p.count,
    "Avg rating": p.count > 0 ? Math.round((p.ratingSum / p.count) * 10) / 10 : null,
  }));
}

export function ReviewsStatsTrend({ points, total, loading, bucket, height = 200 }: Props) {
  const data = useMemo(() => toChartData(points), [points]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-[var(--r-md)] border border-[var(--line)]" style={{ height }}>
        <div className="h-24 w-full animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)] mx-6" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] text-[var(--fg-4)]"
        style={{ height, fontSize: 13 }}
      >
        No reviews in this period.
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
        Reviews per {bucket}
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 10, fill: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="count"
            orientation="left"
            tick={{ fontSize: 11, fill: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="rating"
            orientation="right"
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--fg)",
            }}
            cursor={{ fill: "var(--row-hover)" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--fg-3)" }} />
          <Bar
            yAxisId="count"
            dataKey="Reviews"
            fill="var(--bronze)"
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
          <Line
            yAxisId="rating"
            dataKey="Avg rating"
            stroke="var(--good)"
            strokeWidth={2}
            dot={{ fill: "var(--good)", r: 3 }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
