"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Stat } from "@/components/ui/stat";
import { ShopMultiSelect } from "@/components/ui/filters/ShopMultiSelect";
import { PillButton } from "@/components/ui/pill-button";
import {
  DEFAULT_PRESET,
  PERIOD_PRESETS,
  type PeriodPreset,
  type ReviewsStatsResult,
} from "../../lib/stats";
import { ReviewsStatsTrend } from "./ReviewsStatsTrend";
import { ReviewsStatsTable } from "./ReviewsStatsTable";

function fmt1(n: number | null): string {
  return n == null ? "—" : (Math.round(n * 10) / 10).toFixed(1);
}

function fmtPct(n: number | null): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

function PctDelta({ current, prior, periodHint }: { current: number; prior: number; periodHint: string }) {
  if (prior === 0) {
    return current > 0 ? (
      <span style={{ color: "var(--good)" }}>+{current} new vs prior {periodHint}</span>
    ) : (
      <span style={{ color: "var(--fg-4)" }}>first period with data</span>
    );
  }
  const pct = Math.round(((current - prior) / prior) * 100);
  if (pct === 0) return <span style={{ color: "var(--fg-4)" }}>· flat vs prior {periodHint}</span>;
  return (
    <span style={{ color: pct > 0 ? "var(--good)" : "var(--bad)" }}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% vs prior {periodHint}
    </span>
  );
}

function AvgDelta({ current, prior, periodHint }: { current: number | null; prior: number | null; periodHint: string }) {
  if (current == null) return null;
  if (prior == null) return <span style={{ color: "var(--fg-4)" }}>no prior baseline</span>;
  const diff = Math.round((current - prior) * 10) / 10;
  if (diff === 0) return <span style={{ color: "var(--fg-4)" }}>· flat vs prior {periodHint}</span>;
  return (
    <span style={{ color: diff > 0 ? "var(--good)" : "var(--bad)" }}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(1)} vs prior {periodHint}
    </span>
  );
}

function ShareDelta({ current, prior, periodHint, goodWhenDown = false }: {
  current: number; prior: number | null; periodHint: string; goodWhenDown?: boolean;
}) {
  if (prior == null) return null;
  const diff = Math.round(current * 100) - Math.round(prior * 100);
  if (diff === 0) return <span style={{ color: "var(--fg-4)" }}>· flat vs prior {periodHint}</span>;
  const good = diff < 0 ? goodWhenDown : !goodWhenDown;
  return (
    <span style={{ color: good ? "var(--good)" : "var(--bad)" }}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}% vs prior {periodHint}
    </span>
  );
}

function lowStarShare(d: [number, number, number, number, number] | null, count: number): number {
  if (!d || count === 0) return 0;
  return (d[0] + d[1] + d[2]) / count;
}

export function ReviewsStatsClient() {
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [selected, setSelected] = useState<string[]>([]); // [] = all shops
  const [data, setData] = useState<ReviewsStatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const shopsKey = selected.join(",");

  // One fetch effect; the period preset and shop selection change the query,
  // "Sync now" bumps the token to re-read the freshly synced rows.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ preset });
    if (selected.length > 0) params.set("shops", shopsKey);
    fetch(`/api/reviews/stats?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json && typeof json === "object" && !json.error) setData(json as ReviewsStatsResult);
        else setData(null);
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, shopsKey, reloadToken]);

  async function syncNow() {
    setSyncing(true);
    try {
      const res = await fetch("/api/challenges/reviews/sync", { method: "POST" });
      if (res.ok) setReloadToken((t) => t + 1);
    } catch {
      // nightly cron is the fallback; keep the current view on failure
    } finally {
      setSyncing(false);
    }
  }

  const shopOptions = useMemo(
    () => (data?.shops ?? []).map((s) => ({ id: s.key, name: s.title })),
    [data],
  );

  const periodHint = PERIOD_PRESETS.find((p) => p.key === preset)?.label.toLowerCase() ?? "period";
  const overall = data?.overall ?? null;
  // Share of 1★–3★ ("needs attention") — a decrease renders green.
  const lowShare = overall ? lowStarShare(overall.distribution, overall.count) : 0;
  const hasCurrent = !!overall && overall.count > 0;

  const bucket = preset === "7d" ? "day" : preset === "12m" ? "month" : "week";

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {PERIOD_PRESETS.map((p) => (
            <PillButton key={p.key} active={preset === p.key} onClick={() => setPreset(p.key)}>
              Last {p.label}
            </PillButton>
          ))}
        </div>
        <span style={{ flex: 1 }} aria-hidden />
        <PillButton active={false} onClick={syncNow} disabled={syncing}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <RefreshCwIcon size={12} /> {syncing ? "Syncing…" : "Sync now"}
          </span>
        </PillButton>
      </div>
      <ShopMultiSelect
        options={shopOptions}
        selected={selected}
        onChange={setSelected}
        allLabel="All shops"
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          className="min-w-0"
          label={`Reviews (last ${periodHint})`}
          value={overall ? overall.count.toLocaleString() : "—"}
          delta={
            overall && hasCurrent ? (
              <PctDelta current={overall.count} prior={overall.priorCount} periodHint={periodHint} />
            ) : undefined
          }
          hint={hasCurrent ? undefined : "Waiting for the review sync"}
        />
        <Stat
          className="min-w-0"
          label="Average rating"
          value={overall ? fmt1(overall.avg) : "—"}
          delta={
            overall && hasCurrent ? (
              <AvgDelta current={overall.avg} prior={overall.priorAvg} periodHint={periodHint} />
            ) : undefined
          }
          hint={hasCurrent ? undefined : "Waiting for the review sync"}
        />
        <Stat
          className="min-w-0"
          label="Replied"
          value={overall ? fmtPct(overall.replyRate) : "—"}
          hint={hasCurrent ? "with a public reply" : "Waiting for the review sync"}
        />
        <Stat
          className="min-w-0"
          label="1–3★ share"
          value={hasCurrent ? fmtPct(lowShare) : "—"}
          delta={
            overall && hasCurrent ? (
              <ShareDelta
                current={lowShare}
                prior={overall.priorCount > 0 ? lowStarShare(overall.priorDistribution, overall.priorCount) : null}
                periodHint={periodHint}
                goodWhenDown
              />
            ) : undefined
          }
          hint={hasCurrent ? "needs attention" : "Waiting for the review sync"}
        />
      </div>

      {/* Trend */}
      <ReviewsStatsTrend
        points={data?.overallPoints ?? []}
        total={overall?.count ?? 0}
        loading={loading}
        bucket={bucket}
      />

      {/* Per-shop breakdown */}
      <ReviewsStatsTable shops={data?.shops ?? []} preset={preset} loading={loading} />
    </div>
  );
}
