"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { MonthSelector } from "./MonthSelector";

interface LocationCard {
  locationId: string;
  locationTitle: string;
  count: number;
  avgRating: number;
  currentRating: number;
  totalReviewCount: number;
  ratingTarget: number;
  entryCount: number | null;
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

function Stat({
  label,
  value,
  sub,
  loading,
  status,
}: {
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
  status?: "good" | "bad" | "neutral";
}) {
  const valueColor =
    status === "good"
      ? "text-[var(--good)]"
      : status === "bad"
      ? "text-[var(--bad)]"
      : "text-[var(--fg)]";

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">
        {label}
      </span>
      {loading ? (
        <div className="h-7 w-10 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
      ) : (
        <>
          <span className={`font-mono text-xl tabular-nums ${valueColor}`}>{value}</span>
          {sub && <span className="font-mono text-[10px] tabular-nums text-[var(--fg-4)]">{sub}</span>}
        </>
      )}
    </div>
  );
}

function EntryCountInput({
  locationId,
  month,
  initial,
  loading,
  onSaved,
}: {
  locationId: string;
  month: string;
  initial: number | null;
  loading: boolean;
  onSaved: (count: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(initial !== null ? String(initial) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commit() {
    const val = parseInt(draft, 10);
    if (isNaN(val) || val < 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/challenges/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, month, entryCount: val }),
      });
      onSaved(val);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">Entries</span>
        <div className="h-7 w-10 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">Entries</span>
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="w-20 rounded-[var(--r-sm)] border border-[var(--bronze)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-lg tabular-nums text-[var(--fg)] outline-none"
          autoFocus
        />
      ) : (
        <button
          onClick={startEdit}
          title="Click to enter"
          className="group flex w-fit items-baseline gap-1 text-left"
        >
          <span className="font-mono text-xl tabular-nums text-[var(--fg)]">
            {initial !== null ? initial : "—"}
          </span>
          <span className="text-[10px] text-[var(--fg-4)] opacity-0 transition-opacity group-hover:opacity-100">
            edit
          </span>
        </button>
      )}
    </div>
  );
}

function LocationCardTile({
  card,
  month,
  loading,
  onEntryUpdated,
}: {
  card: LocationCard;
  month: string;
  loading: boolean;
  onEntryUpdated: (locationId: string, count: number) => void;
}) {
  const hasRatingData = card.currentRating > 0;
  const ratingStatus: "good" | "bad" | "neutral" =
    !hasRatingData || card.count === 0
      ? "neutral"
      : card.avgRating >= card.ratingTarget
      ? "good"
      : "bad";

  const ratio =
    card.entryCount !== null && card.count > 0
      ? Math.round(card.entryCount / card.count)
      : null;

  return (
    <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
      <p className="text-sm font-medium text-[var(--fg)]">{shortName(card.locationTitle)}</p>

      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Reviews"
          value={loading ? "—" : String(card.count)}
          loading={loading}
        />
        <Stat
          label="Avg this month"
          value={loading ? "—" : card.count > 0 ? card.avgRating.toFixed(1) : "—"}
          sub={hasRatingData && card.ratingTarget > 0 ? `target ${card.ratingTarget.toFixed(1)}` : undefined}
          loading={loading}
          status={ratingStatus}
        />
        <Stat
          label="GBP rating"
          value={loading ? "—" : card.currentRating > 0 ? card.currentRating.toFixed(1) : "—"}
          sub={card.totalReviewCount > 0 ? `${card.totalReviewCount} total` : undefined}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-3">
        <EntryCountInput
          locationId={card.locationId}
          month={month}
          initial={card.entryCount}
          loading={loading}
          onSaved={(count) => onEntryUpdated(card.locationId, count)}
        />
        <Stat
          label="Entries / review"
          value={loading ? "—" : ratio !== null ? `${ratio}:1` : "—"}
          loading={loading}
        />
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

  function handleEntryUpdated(locationId: string, count: number) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        locations: prev.locations.map((loc) =>
          loc.locationId === locationId ? { ...loc, entryCount: count } : loc
        ),
      };
    });
  }

  const cards = data?.locations ?? [];

  return (
    <div className="flex flex-col gap-6">
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
            {syncing ? "Syncing…" : "Sync reviews"}
          </button>
        </div>
      </div>

      {loading && cards.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]"
            />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
          <span className="text-sm text-[var(--fg-4)]">No data yet — run a sync first.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {cards.map((card) => (
            <LocationCardTile
              key={card.locationId}
              card={card}
              month={month}
              loading={loading}
              onEntryUpdated={handleEntryUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
