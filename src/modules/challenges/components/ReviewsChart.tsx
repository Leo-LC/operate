"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface WeekBucket {
  weekStart: string;
  count: number;
  avgRating: number;
}

interface ReviewsChartProps {
  data: WeekBucket[];
  loading: boolean;
}

function weekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
}

export function ReviewsChart({ data, loading }: ReviewsChartProps) {
  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
        <div className="h-32 w-full animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)] mx-6" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
        <span className="text-sm text-[var(--fg-4)]">No reviews this month.</span>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    week: weekLabel(d.weekStart),
    Reviews: d.count,
    "Avg rating": d.avgRating,
  }));

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
        Reviews per week
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
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
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--fg-3)" }}
          />
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
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
