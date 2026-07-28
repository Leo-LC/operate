"use client";

import type { ReactNode } from "react";
import { FORM_CHANNEL_CHOICES } from "../normalize/channel";

/** Fixed, distinct colors — recognizable in screenshots without hover. */
const CHANNEL_COLORS: Record<string, string> = {
  Instagram: "#E4405F",
  Facebook: "#1877F2",
  Tiktok: "#14B8A6",
  Google: "#F59E0B",
  Website: "#8B5CF6",
  "Chat GPT (or any AI)": "#10A37F",
  "Walking by": "#64748B",
  "Friend's recommendation": "#EC4899",
  "Hotel / Concierge recommendation": "#D97706",
};

const FALLBACK_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function channelColor(label: string, index: number): string {
  return CHANNEL_COLORS[label] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

interface ChannelBarChartProps {
  data: { label: string; count: number }[];
  loading: boolean;
}

export function ChannelBarChart({ data, loading }: ChannelBarChartProps) {
  if (loading) {
    return (
      <ChartShell>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
          ))}
        </div>
      </ChartShell>
    );
  }

  if (data.length === 0) {
    return (
      <ChartShell>
        <div className="flex h-48 items-center justify-center text-sm text-[var(--fg-4)]">
          No data for this period.
        </div>
      </ChartShell>
    );
  }

  const total = data.reduce((sum, row) => sum + row.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <ChartShell>
      <div className="mb-3 grid grid-cols-[12px_minmax(0,1fr)_1fr_40px_44px] items-center gap-x-2 gap-y-0 border-b border-[var(--line)] pb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">
        <span />
        <span>Channel</span>
        <span />
        <span className="text-right">#</span>
        <span className="text-right">%</span>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {data.map((row, index) => {
          const color = channelColor(row.label, index);
          const pct = total > 0 ? (row.count / total) * 100 : 0;
          const barPct = (row.count / maxCount) * 100;

          return (
            <div
              key={row.label}
              className="grid grid-cols-[12px_minmax(0,1fr)_1fr_40px_44px] items-center gap-x-2 py-2.5"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: color }}
                aria-hidden
              />
              <span
                className="text-sm leading-snug text-[var(--fg-2)]"
                title={row.label}
              >
                {row.label}
              </span>
              <div
                className="h-2.5 overflow-hidden rounded-full"
                style={{ background: "var(--bg-2)" }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${barPct}%`, background: color }}
                />
              </div>
              <span className="mono text-right text-sm tabular-nums text-[var(--fg)]">
                {row.count}
              </span>
              <span className="mono text-right text-xs tabular-nums text-[var(--fg-4)]">
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--fg-4)]">
        {total.toLocaleString()} responses · {data.length} of {FORM_CHANNEL_CHOICES.length} channels
      </p>
    </ChartShell>
  );
}

function ChartShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
        Discovery channels
      </p>
      {children}
    </div>
  );
}
