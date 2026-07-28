"use client";

import { useCallback, useEffect, useState } from "react";
import { UsersIcon, RefreshCwIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DateInput } from "@/components/ui/date-input";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import type { CustomerInsightsSummary } from "../types";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { ChannelBarChart } from "./ChannelBarChart";
import { WeeklyLineChart } from "./WeeklyLineChart";
import { UnmatchedReviewPanel } from "./UnmatchedReviewPanel";
import {
  DATE_PRESET_OPTIONS,
  detectPreset,
  getDateRangeForPreset,
  type DatePreset,
} from "../lib/date-presets";

export function CustomerInsightsClient() {
  const [datePreset, setDatePreset] = useState<DatePreset>("all_time");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shop, setShop] = useState("all");
  const [data, setData] = useState<CustomerInsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = getDateRangeForPreset(preset);
    setFrom(range.from);
    setTo(range.to);
  };

  const handleFromChange = (value: string) => {
    setFrom(value);
    setDatePreset(detectPreset(value, to));
  };

  const handleToChange = (value: string) => {
    setTo(value);
    setDatePreset(detectPreset(from, value));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (shop !== "all") params.set("shop", shop);

      const res = await fetch(`/api/customer-insights/summary?${params.toString()}`);
      const json = (await res.json()) as CustomerInsightsSummary;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, shop]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const configured = data?.meta.configured ?? false;
  const error = data?.meta.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Performance"
        title="Customer Insights"
        subtitle="Google Form responses aggregated by shop, discovery channel, and country."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
          >
            <RefreshCwIcon className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {!configured && (
        <div
          className="rounded-lg border p-4 text-sm"
          style={{
            borderColor: "var(--warn)",
            background: "color-mix(in srgb, var(--warn) 8%, var(--surface))",
            color: "var(--fg-2)",
          }}
        >
          Google account not linked. Sign in with Google (same account used for accounting sheets)
          to grant spreadsheet access.
        </div>
      )}

      {configured && error && (
        <div
          className="rounded-lg border p-4 text-sm"
          style={{
            borderColor: "var(--bad)",
            background: "color-mix(in srgb, var(--bad) 8%, var(--surface))",
            color: "var(--fg-2)",
          }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--fg-4)]">Period</span>
          <select
            value={datePreset}
            onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {DATE_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--fg-4)]">From</span>
          <DateInput value={from} onChange={(e) => handleFromChange(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--fg-4)]">To</span>
          <DateInput value={to} onChange={(e) => handleToChange(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--fg-4)]">Shop</span>
          <select
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">All shops</option>
            {(data?.meta.shops ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
        <Stat
          label="Total submissions"
          value={loading ? "—" : (data?.totalSubmissions ?? 0).toLocaleString()}
          icon={<UsersIcon style={{ width: 18, height: 18 }} />}
          iconColor="var(--bronze)"
          hint={
            data?.meta.dateRange.min && data?.meta.dateRange.max
              ? `All-time range: ${data.meta.dateRange.min} → ${data.meta.dateRange.max}`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HorizontalBarChart
          title="Submissions by shop"
          data={data?.byShop ?? []}
          loading={loading}
          color="var(--bronze)"
        />
        <ChannelBarChart data={data?.byChannel ?? []} loading={loading} />
        <HorizontalBarChart
          title="Top visitor countries"
          data={data?.topCountries ?? []}
          loading={loading}
          color="var(--info)"
        />
      </div>

      <WeeklyLineChart data={data?.byWeek ?? []} loading={loading} />

      {data && (
        <UnmatchedReviewPanel
          shops={data.unmatched.shops}
          channels={data.unmatched.channels}
          countries={data.unmatched.countries}
        />
      )}
    </div>
  );
}
