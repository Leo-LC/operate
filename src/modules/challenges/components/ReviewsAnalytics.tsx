"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { MonthSelector } from "./MonthSelector";

interface LocationCard {
  locationId: string;
  locationTitle: string;
  count: number;
  avgRating: number;
  currentRating: number;
  totalReviewCount: number;
}

interface AnalyticsData {
  locations: LocationCard[];
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

function shortName(title: string): string {
  return title.replace(/^Capybara Coffee\s*/i, "").trim() || title;
}

function LocationCardTile({ card, loading }: { card: LocationCard; loading: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
      <p className="text-sm font-medium text-[var(--fg)]">{shortName(card.locationTitle)}</p>

      <div className="grid grid-cols-3 gap-3">
        {/* Reviews this month */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">
            Reviews
          </span>
          {loading ? (
            <div className="h-7 w-10 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
          ) : (
            <span className="font-mono text-xl tabular-nums text-[var(--fg)]">{card.count}</span>
          )}
        </div>

        {/* Monthly avg */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">
            Avg this month
          </span>
          {loading ? (
            <div className="h-7 w-10 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
          ) : (
            <span className="font-mono text-xl tabular-nums text-[var(--fg)]">
              {card.count > 0 ? card.avgRating.toFixed(1) : "—"}
            </span>
          )}
        </div>

        {/* Current GBP rating */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">
            GBP rating
          </span>
          {loading ? (
            <div className="h-7 w-10 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
          ) : (
            <div className="flex flex-col">
              <span className="font-mono text-xl tabular-nums text-[var(--fg)]">
                {card.currentRating > 0 ? card.currentRating.toFixed(1) : "—"}
              </span>
              {card.totalReviewCount > 0 && (
                <span className="font-mono text-[10px] tabular-nums text-[var(--fg-4)]">
                  {card.totalReviewCount} total
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReviewsAnalytics() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges/reviews/analytics?month=${m}`);
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
    fetchAnalytics(month);
  }, [month, fetchAnalytics]);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/challenges/reviews/sync", { method: "POST" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Sync failed");
      }
      await fetchAnalytics(month);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const cards = data?.locations ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <MonthSelector value={month} onChange={setMonth} />
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

      {/* Location cards */}
      {loading && cards.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]"
            />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
          <span className="text-sm text-[var(--fg-4)]">
            No data yet — run a sync first.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {cards.map((card) => (
            <LocationCardTile key={card.locationId} card={card} loading={loading} />
          ))}
        </div>
      )}
    </div>
  );
}
