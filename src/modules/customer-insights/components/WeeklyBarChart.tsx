"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, PanelBody, PanelFoot, PanelHead, PanelTitle } from "@/components/ui/panel";

interface WeeklyBarChartProps {
  data: { weekStart: string; count: number }[];
  loading: boolean;
}

interface WeeklyTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ payload?: { Submissions?: number } }>;
}

function weekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T12:00:00`);
  return `${date.getDate()} ${date.toLocaleDateString("en-GB", { month: "short" })}`;
}

function WeeklyTooltip({ active, label, payload }: WeeklyTooltipProps) {
  const count = payload?.[0]?.payload?.Submissions;
  if (!active || typeof count !== "number") return null;

  return (
    <div className="ci-tooltip">
      <p className="ci-tooltip-title">Week of {label}</p>
      <p className="ci-tooltip-row">
        Submissions <b>{count.toLocaleString()}</b>
      </p>
    </div>
  );
}

/** Weekly submission volume. Weeks start on Monday (see aggregate.ts). */
export function WeeklyBarChart({ data, loading }: WeeklyBarChartProps) {
  const chartData = data.map((row) => ({
    week: weekLabel(row.weekStart),
    Submissions: row.count,
  }));
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <Panel>
      <PanelHead>
        <PanelTitle>Submissions by week</PanelTitle>
      </PanelHead>

      <PanelBody>
        {loading ? (
          <div className="ci-skeleton-chart animate-pulse" aria-hidden />
        ) : data.length === 0 ? (
          <div className="ci-empty-chart">No submissions in this period.</div>
        ) : (
          <>
            <div
              className="ci-chart-frame"
              role="img"
              aria-label={`Submissions per week. ${total.toLocaleString()} responses across ${
                data.length
              } weeks. A data table follows.`}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-line)" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "var(--ui-fg-3)" }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    minTickGap={12}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    width={38}
                    tick={{ fontSize: 11, fill: "var(--ui-fg-3)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={(props) => (
                      <WeeklyTooltip {...(props as unknown as WeeklyTooltipProps)} />
                    )}
                    cursor={{ fill: "var(--ui-row-hover)" }}
                  />
                  <Bar
                    dataKey="Submissions"
                    fill="var(--ui-series-primary)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={36}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <table className="sr-only">
              <caption>Submissions per week</caption>
              <thead>
                <tr>
                  <th scope="col">Week starting</th>
                  <th scope="col">Submissions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.weekStart}>
                    <th scope="row">{weekLabel(row.weekStart)}</th>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </PanelBody>

      {!loading && data.length > 0 && (
        <PanelFoot>Weekly totals; weeks start on Monday.</PanelFoot>
      )}
    </Panel>
  );
}
