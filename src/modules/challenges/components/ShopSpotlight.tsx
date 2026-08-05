"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  Check,
  CheckCircle2,
  Coffee,
  Cookie,
  Leaf,
  Lightbulb,
  Minus,
  PrinterIcon,
  Shirt,
  Star,
  StarHalf,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthSelector } from "./MonthSelector";
import { buildSpotlightPrintHtml } from "@/modules/challenges/exportSpotlightHtml";
import { SPOTLIGHT_LABELS } from "@/modules/challenges/labels";
import type {
  SpotlightResponse,
  MetricRecognition,
  RecognitionKind,
  RecognitionVisual,
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
  revenue: { accent: "var(--bronze-2)", soft: "var(--bronze-soft)", icon: Banknote },
  merch: { accent: "var(--bronze)", soft: "var(--bronze-soft)", icon: Shirt },
  snacks: { accent: "var(--warn)", soft: "var(--warn-soft)", icon: Cookie },
  reviews: { accent: "var(--bronze)", soft: "var(--bronze-soft)", icon: Star },
  spend: { accent: "var(--bronze-2)", soft: "var(--bronze-soft)", icon: Coffee },
  completion: { accent: "var(--good)", soft: "var(--good-soft)", icon: CheckCircle2 },
  improved: { accent: "var(--info)", soft: "var(--info-soft)", icon: TrendingUp },
};

function metricStatusStyles(passes: boolean | null): {
  border: string;
  bg: string;
  accent: string;
  badge: string;
  badgeLabel: string;
  Icon: LucideIcon;
} {
  if (passes === true) {
    return {
      border: "border-[var(--good)]/35",
      bg: "bg-[var(--good-soft)]/70",
      accent: "var(--good)",
      badge: "bg-[var(--good)]/15 text-[var(--good)]",
      badgeLabel: SPOTLIGHT_LABELS.statusPass,
      Icon: Check,
    };
  }
  if (passes === false) {
    return {
      border: "border-[var(--warn)]/35",
      bg: "bg-[var(--warn-soft)]/60",
      accent: "var(--warn)",
      badge: "bg-[var(--warn)]/15 text-[var(--warn)]",
      badgeLabel: SPOTLIGHT_LABELS.statusMiss,
      Icon: X,
    };
  }
  return {
    border: "border-[var(--line)]",
    bg: "bg-[var(--surface)]",
    accent: "var(--fg-4)",
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

function RingGauge({
  primary,
  secondary,
  progress,
  tone = "good",
  size = "md",
}: {
  primary: string;
  secondary: string;
  progress: number;
  tone?: "good" | "bronze" | "warn";
  size?: "sm" | "md";
}) {
  const color =
    tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--bronze-2)";
  const pct = Math.min(Math.max(progress, 0), 100);
  const dim = size === "sm" ? 52 : 60;
  const inner = size === "sm" ? 42 : 48;

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: dim,
          height: dim,
          background: `conic-gradient(${color} ${pct}%, var(--bg-2) ${pct}%)`,
        }}
      >
        <div
          className="flex items-center justify-center rounded-full bg-[var(--surface)]"
          style={{ width: inner, height: inner }}
        >
          <span className="font-mono text-xs font-bold tabular-nums leading-none text-[var(--fg)]">
            {primary}
          </span>
        </div>
      </div>
      <p className="min-w-0 text-[10px] leading-snug text-[var(--fg-3)]">{secondary}</p>
    </div>
  );
}

function RecognitionVisualDisplay({
  visual,
  accent,
}: {
  visual: RecognitionVisual;
  accent: string;
}) {
  switch (visual.type) {
    case "ring":
      return (
        <RingGauge
          primary={visual.primary}
          secondary={visual.secondary}
          progress={visual.progress}
          tone={visual.tone}
          size="sm"
        />
      );
    case "tiers":
      return (
        <div>
          <div className="mb-2 flex gap-1">
            {Array.from({ length: visual.maxTier }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < visual.tier ? "" : "bg-[var(--bg-2)]"
                }`}
                style={i < visual.tier ? { background: accent } : undefined}
              />
            ))}
          </div>
          <p className="font-mono text-lg font-bold tabular-nums text-[var(--fg)]">
            {visual.pctLabel}
          </p>
          {visual.tier > 0 && (
            <p className="mt-0.5 text-[11px] font-semibold" style={{ color: accent }}>
              Tier {visual.tier} reached
            </p>
          )}
          {visual.nextLabel && (
            <p className="mt-1 text-[10px] text-[var(--fg-4)]">{visual.nextLabel}</p>
          )}
        </div>
      );
    case "dual":
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {[visual.left, visual.right].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--paper-2)] px-2 py-2 text-center"
            >
              <p className="text-[8px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
                {stat.label}
              </p>
              <p className="mt-1 font-mono text-base font-bold tabular-nums leading-none text-[var(--fg)]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      );
    case "hero":
      return (
        <div className="flex flex-col items-center py-1 text-center">
          <p className="font-mono text-2xl font-bold tabular-nums leading-none text-[var(--fg)]">
            {visual.value}
          </p>
          {visual.unit && (
            <p className="mt-1 text-[11px] font-medium text-[var(--fg-3)]">{visual.unit}</p>
          )}
        </div>
      );
    case "delta":
      return (
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold tabular-nums text-[var(--info)]">
            {visual.delta}
          </span>
          <div className="min-w-0 flex-1">
            <ScoreBar score={visual.to} total={visual.total} />
            <p className="mt-1 text-[10px] text-[var(--fg-4)]">
              {visual.from} → {visual.to} of {visual.total} targets
            </p>
          </div>
        </div>
      );
  }
}

function MetricTile({ metric }: { metric: SpotlightMetricRow }) {
  const styles = metricStatusStyles(metric.passes);
  const Icon = METRIC_ICONS[metric.id] ?? CheckCircle2;
  const StatusIcon = styles.Icon;

  return (
    <div
      className={`flex overflow-hidden rounded-[var(--r-sm)] border ${styles.border} ${styles.bg}`}
    >
      <div className="w-1 shrink-0" style={{ background: styles.accent }} />
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2">
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--surface)]"
          style={{ background: styles.accent }}
        >
          <Icon className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-3)]">
            {metric.label}
          </p>
          <p className="font-mono text-base font-bold tabular-nums leading-tight text-[var(--fg)]">
            {metric.value}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${styles.badge}`}
          >
            <StatusIcon className="size-2.5" aria-hidden />
            {styles.badgeLabel}
          </span>
          <p className="mt-0.5 text-[9px] text-[var(--fg-4)]">{metric.target}</p>
        </div>
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
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: theme.soft, color: theme.accent }}
          >
            <Icon className="size-3.5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--fg)]">{label}</p>
            <p className="text-[10px] leading-snug text-[var(--fg-4)]">{hint}</p>
          </div>
        </div>

        {recognition.unavailable ? (
          <div className="mt-auto py-2">
            <p className="font-mono text-2xl tabular-nums text-[var(--fg-4)]">—</p>
            {unavailableReason && (
              <p className="mt-1 text-[11px] text-[var(--fg-4)]">{unavailableReason}</p>
            )}
          </div>
        ) : (
          <div className="mt-auto space-y-2">
            <p
              className="text-sm font-semibold leading-tight"
              style={{ color: theme.accent }}
            >
              {recognition.locationTitle}
            </p>

            {recognition.visual ? (
              <RecognitionVisualDisplay visual={recognition.visual} accent={theme.accent} />
            ) : (
              <p className="font-mono text-2xl font-bold tabular-nums text-[var(--fg)]">
                {recognition.value}
              </p>
            )}

            {recognition.sub && (
              <p className="text-[10px] text-[var(--fg-4)]">{recognition.sub}</p>
            )}
            {recognition.alsoStrong && recognition.alsoStrong.length > 0 && (
              <p className="text-[10px] text-[var(--fg-4)]">
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
        <section className="border-t border-[var(--line)] bg-[var(--paper-2)]/40 px-5 py-4 md:px-6">
          <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-3)]">
            {SPOTLIGHT_LABELS.metricGridTitle}
          </h3>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
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

  function openPrintHtml(html: string) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      URL.revokeObjectURL(url);
      toast.error("Pop-up blocked — please allow pop-ups");
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function exportSpotlightPdf() {
    if (!data) return;
    openPrintHtml(buildSpotlightPrintHtml(data));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector value={month} onChange={setMonth} />
          <Button
            size="sm"
            variant="secondary"
            onClick={exportSpotlightPdf}
            disabled={loading || !data}
          >
            <PrinterIcon size={13} />
            {SPOTLIGHT_LABELS.saveAsPdf}
          </Button>
        </div>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
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
