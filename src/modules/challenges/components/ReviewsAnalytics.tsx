"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { MonthSelector } from "./MonthSelector";
import { LocationFilter } from "./LocationFilter";
import { ReviewsSummary } from "./ReviewsSummary";
import { ReviewsChart } from "./ReviewsChart";

interface AnalyticsData {
  count: number;
  avgRating: number;
  byRating: Record<1 | 2 | 3 | 4 | 5, number>;
  byWeek: Array<{ weekStart: string; count: number; avgRating: number }>;
  lastSyncedAt: string | null;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never synced";
  const d = new Date(iso);
  return `Last synced ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} at ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function ReviewsAnalytics() {
  const [month, setMonth] = useState(currentMonth);
  const [location, setLocation] = useState("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (m: string, loc: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: m, location: loc });
      const res = await fetch(`/api/challenges/reviews/analytics?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as AnalyticsData;
      setData(json);
    } catch (e) {
      console.error("[ReviewsAnalytics] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(month, location);
  }, [month, location, fetchAnalytics]);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/challenges/reviews/sync", { method: "POST" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Sync failed");
      }
      await fetchAnalytics(month, location);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MonthSelector value={month} onChange={setMonth} />
          <LocationFilter value={location} onChange={setLocation} />
        </div>
        <div className="flex items-center gap-3">
          {syncError && (
            <span className="text-xs text-[var(--bad)]">{syncError}</span>
          )}
          <span className="text-xs text-[var(--fg-4)]">
            {loading ? "Loading…" : formatSyncTime(data?.lastSyncedAt ?? null)}
          </span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex h-8 items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--fg-2)] transition-colors hover:border-[var(--fg-4)] hover:text-[var(--fg)] disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCwIcon size={13} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <ReviewsSummary data={data} loading={loading} />

      {/* Chart */}
      <ReviewsChart data={data?.byWeek ?? []} loading={loading} />

      {/* Rating breakdown */}
      {!loading && data && data.count > 0 && (
        <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">
            Rating breakdown
          </p>
          <div className="flex flex-col gap-2">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = data.byRating[star] ?? 0;
              const pct = data.count > 0 ? Math.round((count / data.count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-6 text-right font-mono text-sm tabular-nums text-[var(--fg-3)]">
                    {star}★
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-[var(--bg-2)]" style={{ height: 8 }}>
                    <div
                      className="h-full rounded-full bg-[var(--bronze)] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-sm tabular-nums text-[var(--fg-3)]">
                    {count}
                  </span>
                  <span className="w-8 text-right font-mono text-xs tabular-nums text-[var(--fg-4)]">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
