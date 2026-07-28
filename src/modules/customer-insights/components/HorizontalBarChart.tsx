"use client";

import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface HorizontalBarChartProps {
  title: string;
  data: { label: string; count: number }[];
  loading: boolean;
  emptyMessage?: string;
  color?: string;
}

export function HorizontalBarChart({
  title,
  data,
  loading,
  emptyMessage = "No data for this period.",
  color = "var(--bronze)",
}: HorizontalBarChartProps) {
  if (loading) {
    return (
      <ChartShell title={title}>
        <div className="h-48 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
      </ChartShell>
    );
  }

  if (data.length === 0) {
    return (
      <ChartShell title={title}>
        <div className="flex h-48 items-center justify-center text-sm text-[var(--fg-4)]">
          {emptyMessage}
        </div>
      </ChartShell>
    );
  }

  const chartData = data.map((d) => ({ name: d.label, count: d.count }));
  const height = Math.max(160, data.length * 36 + 40);

  return (
    <ChartShell title={title}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 11, fill: "var(--fg-2)", fontFamily: "var(--font-sans)" }}
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
          <Bar dataKey="count" fill={color} radius={[0, 3, 3, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function ChartShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">{title}</p>
      {children}
    </div>
  );
}
