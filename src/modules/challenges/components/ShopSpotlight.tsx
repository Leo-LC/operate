"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Coffee,
  Cookie,
  Leaf,
  Lightbulb,
  Minus,
  Shirt,
  Star,
  StarHalf,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { MonthSelector } from "./MonthSelector";
import { SPOTLIGHT_LABELS } from "@/modules/challenges/labels";
import type {
  SpotlightResponse,
  MetricRecognition,
  RecognitionKind,
  SpotlightMetricRow,
} from "@/modules/challenges/spotlight";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const METRIC_ICONS: Record<string, LucideIcon> = {
  merch: Shirt,
  snacks: Cookie,
  spend: Coffee,
  opex: Leaf,
  reviews: Star,
  rating: StarHalf,
};

type ThemeKey = RecognitionKind;
const RECOGNITION_THEME: Record<
  ThemeKey,
  { accent: string; soft: string; icon: LucideIcon }
> = {
  snacks: { accent: "var(--warn)", soft: "var(--warn-soft)", icon: Cookie },
  reviews: { accent: "var(--bronze)", soft: "var(--bronze-soft)", icon: Star },
  spend: { accent: "var(--bronze-2)", soft: "var(--bronze-soft)", icon: Coffee },
  completion: { accent: "var(--good)", soft: "var(--good-soft)", icon: CheckCircle2 },
  improved: { accent: "var(--info)", soft: "var(--info-soft)", icon: TrendingUp },
};

function metricStatusStyles(passes: boolean | null): {
  border: string;
  bg: string;
  badge: string;
  badgeLabel: string;
  Icon: LucideIcon;
} {
  if (passes === true) {
    return {
      border: "border-[var(--good)]/30",
      bg: "bg-[var(--good-soft)]/50",
      badge: "bg-[var(--good-soft)] text-[var(--good)]",
      badgeLabel: SPOTLIGHT_LABELS.statusPass,
      Icon: Check,
    };
  }
  if (passes === false) {
    return {
      border: "border-[var(--warn)]/25",
      bg: "bg-[var(--warn-soft)]/40",
      badge: "bg-[var(--warn-soft)] text-[var(--warn)]",
      badgeLabel: SPOTLIGHT_LABELS.statusMiss,
      Icon: X,
    };
  }
  return {
    border: "border-[var(--line)]",
    bg: "bg-[var(--paper-2)]",
    badge: "bg-[var(--bg-2)] text-[var(--fg-4)]",
    badgeLabel: SPOTLIGHT_LABELS.statusPending,
    Icon: Minus,
  };
}

function ScoreBar({ score, total }: { score: number; total: number }) {
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full transition-colors ${
            i < score ? "bg-[var(--good)]" : "bg-[var(--bg-2)]"
          }`}
        />
      ))}
    </div>
  );
}

function MetricTile({ metric }: { metric: SpotlightMetricRow }) {
  const styles = metricStatusStyles(metric.passes);
  const Icon = METRIC_ICONS[metric.id] ?? CheckCircle2;
  const StatusIcon = styles.Icon;

  return (
    <div
      className={`flex flex-col gap-2 rounded-[var(--r-sm)] border p-3 ${styles.border} ${styles.bg}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--fg-3)]">
            <Icon className="size-3.5" aria-hidden />
          </div>
          <p className="truncate text-xs font-medium text-[var(--fg-2)]">{metric.label}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${styles.badge}`}
        >
          <StatusIcon className="size-2.5" aria-hidden />
          {styles.badgeLabel}
        </span>
      </div>
      <div>
        <p className="font-mono text-lg font-bold tabular-nums leading-none text-[var(--fg)]">
          {metric.value}
        </p>
        <p className="mt-1 text-[10px] text-[var(--fg-4)]">Target: {metric.target}</p>
      </div>
    </div>
  );
}

function RecognitionCard({ recognition }: { recognition: MetricRecognition }) {
  const theme = RECOGNITION_THEME[recognition.kind];
  const Icon = theme.icon;
  const label = SPOTLIGHT_LABELS.recognitions[recognition.kind];
  const hint = SPOTLIGHT_LABELS.recognitionHints[recognition.kind];
  const unavailableReason =
    recognition.unavailableReason === "noPriorMonth"
      ? SPOTLIGHT_LABELS.noPriorMonth
      : recognition.unavailableReason === "dataPending"
        ? SPOTLIGHT_LABELS.dataPending
        : undefined;

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
      <div className="h-1" style={{ background: theme.accent }} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: theme.soft, color: theme.accent }}
          >
            <Icon className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--fg)]">{label}</p>
            <p className="text-[10px] leading-snug text-[var(--fg-4)]">{hint}</p>
          </div>
        </div>

        {recognition.unavailable ? (
          <div className="mt-auto">
            <p className="font-mono text-2xl tabular-nums text-[var(--fg-4)]">—</p>
            {unavailableReason && (
              <p className="mt-1 text-[11px] text-[var(--fg-4)]">{unavailableReason}</p>
            )}
          </div>
        ) : (
          <div className="mt-auto">
            <p
              className="text-base font-semibold leading-tight"
              style={{ color: theme.accent }}
            >
              {recognition.locationTitle}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[var(--fg)]">
              {recognition.value}
            </p>
            {recognition.sub && (
              <p className="mt-1 text-[11px] text-[var(--fg-4)]">{recognition.sub}</p>
            )}
            {recognition.alsoStrong && recognition.alsoStrong.length > 0 && (
              <p className="mt-2 text-[10px] text-[var(--fg-4)]">
                {SPOTLIGHT_LABELS.alsoStrong}: {recognition.alsoStrong.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpotlightHero({
  featured,
  loading,
}: {
  featured: SpotlightResponse["featured"] | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
        <div className="h-24 animate-pulse bg-[var(--bronze-soft)]/30" />
        <div className="space-y-4 p-5">
          <div className="h-8 w-48 animate-pulse rounded bg-[var(--bg-2)]" />
          <div className="h-3 w-full animate-pulse rounded bg-[var(--bg-2)]" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!featured?.available) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
        <p className="text-sm text-[var(--fg-3)]">{SPOTLIGHT_LABELS.insufficientData}</p>
      </div>
    );
  }

  const score = featured.executionScore ?? 0;
  const total = featured.executionTotal ?? 6;
  const scorePct = Math.round((score / total) * 100);

  return (
    <article className="overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
      {/* Header band */}
      <div className="border-b border-[var(--line)] bg-gradient-to-r from-[var(--bronze-soft)]/60 via-[var(--paper-2)] to-[var(--surface)] px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--bronze-2)]">
              {SPOTLIGHT_LABELS.shopSpotlight}
            </p>
            <h2 className="font-display text-3xl font-medium italic text-[var(--fg)] md:text-4xl">
              {featured.locationTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--fg-3)]">{SPOTLIGHT_LABELS.shopSpotlightSubtitle}</p>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
            <div
              className="relative flex size-16 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(var(--good) ${scorePct}%, var(--bg-2) ${scorePct}%)`,
              }}
            >
              <div className="flex size-[52px] flex-col items-center justify-center rounded-full bg-[var(--surface)]">
                <span className="font-mono text-xl font-bold tabular-nums leading-none text-[var(--fg)]">
                  {score}
                </span>
                <span className="text-[9px] text-[var(--fg-4)]">/{total}</span>
              </div>
            </div>
            <div className="min-w-[120px]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
                {SPOTLIGHT_LABELS.scoreLabel}
              </p>
              <p className="mt-0.5 text-sm font-medium text-[var(--fg)]">
                {score} {SPOTLIGHT_LABELS.targetsMet}
              </p>
              <div className="mt-2 w-full">
                <ScoreBar score={score} total={total} />
              </div>
            </div>
          </div>
        </div>

        {featured.summaryStats && featured.summaryStats.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {featured.summaryStats.map((stat) => (
              <span
                key={stat.label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--good)]/20 bg-[var(--good-soft)]/60 px-3 py-1"
              >
                <span className="text-[10px] font-medium text-[var(--fg-3)]">{stat.label}</span>
                <span className="font-mono text-xs font-bold tabular-nums text-[var(--good)]">
                  {stat.value}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Metric grid */}
      {featured.metricBreakdown && featured.metricBreakdown.length > 0 && (
        <section className="px-5 py-5 md:px-6">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-4)]">
            {SPOTLIGHT_LABELS.metricGridTitle}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featured.metricBreakdown.map((metric) => (
              <MetricTile key={metric.id} metric={metric} />
            ))}
          </div>
        </section>
      )}

      {/* Tips */}
      {featured.tips && featured.tips.length > 0 && (
        <section className="border-t border-[var(--line)] bg-[var(--paper-2)] px-5 py-4 md:px-6">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="size-3.5 text-[var(--bronze)]" aria-hidden />
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-4)]">
              {SPOTLIGHT_LABELS.tipsTitle}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {featured.tips.map((tip) => (
              <p
                key={tip}
                className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-snug text-[var(--fg-2)]"
              >
                {tip}
              </p>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

export function ShopSpotlight() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<SpotlightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/challenges/spotlight?month=${m}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load spotlight");
      }
      const json = (await res.json()) as SpotlightResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spotlight");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month);
  }, [month, fetchData]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm text-[var(--fg-3)]">{SPOTLIGHT_LABELS.intro}</p>
        <MonthSelector value={month} onChange={setMonth} />
      </div>

      {data?.monthInProgress && (
        <div className="flex items-center gap-2 rounded-[var(--r-sm)] border border-[var(--warn)]/20 bg-[var(--warn-soft)]/50 px-4 py-2.5">
          <span className="size-2 shrink-0 rounded-full bg-[var(--warn)]" aria-hidden />
          <p className="text-sm text-[var(--fg-2)]">{SPOTLIGHT_LABELS.monthInProgress}</p>
        </div>
      )}

      {error && (
        <div className="rounded-[var(--r-sm)] border border-[var(--bad)]/30 bg-[var(--bad-soft)] px-4 py-2.5 text-sm text-[var(--bad)]">
          {error}
        </div>
      )}

      <SpotlightHero featured={data?.featured ?? null} loading={loading} />

      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[var(--fg)]">
            {SPOTLIGHT_LABELS.metricRecognition}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--fg-4)]">
            {SPOTLIGHT_LABELS.metricRecognitionSubtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]"
                />
              ))
            : (data?.recognitions ?? []).map((recognition) => (
                <RecognitionCard key={recognition.kind} recognition={recognition} />
              ))}
        </div>
      </section>

      <p className="text-center text-xs italic text-[var(--fg-4)]">{SPOTLIGHT_LABELS.footerNote}</p>
    </div>
  );
}
