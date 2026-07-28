"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface WeeklyLineChartProps {
  data: { weekStart: string; count: number }[];
  loading: boolean;
}

function weekLabel(weekStart: string): string {
  const d = new Date(`${weekStart}T12:00:00`);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
}

export function WeeklyLineChart({ data, loading }: WeeklyLineChartProps) {
  if (loading) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
          Submissions by week
        </p>
        <div className="h-48 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
          Submissions by week
        </p>
        <div className="flex h-48 items-center justify-center text-sm text-[var(--fg-4)]">
          No submissions in this period.
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    week: weekLabel(d.weekStart),
    Submissions: d.count,
  }));

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
        Submissions by week
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
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
            cursor={{ stroke: "var(--line)" }}
          />
          <Line
            type="monotone"
            dataKey="Submissions"
            stroke="var(--bronze)"
            strokeWidth={2}
            dot={{ fill: "var(--bronze)", r: 3 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
