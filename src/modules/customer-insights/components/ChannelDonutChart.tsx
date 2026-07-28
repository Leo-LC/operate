"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--bronze)",
  "var(--good)",
  "var(--info)",
];

interface ChannelDonutChartProps {
  data: { label: string; count: number }[];
  loading: boolean;
}

export function ChannelDonutChart({ data, loading }: ChannelDonutChartProps) {
  if (loading) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
          Discovery channels
        </p>
        <div className="mx-auto h-48 w-48 animate-pulse rounded-full bg-[var(--bg-2)]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
          Discovery channels
        </p>
        <div className="flex h-48 items-center justify-center text-sm text-[var(--fg-4)]">
          No data for this period.
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({ name: d.label, value: d.count }));

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
        Discovery channels
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--fg)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--fg-3)" }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
