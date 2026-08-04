"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Coffee,
  Cookie,
  Star,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { MonthSelector } from "./MonthSelector";
import { SPOTLIGHT_LABELS } from "@/modules/challenges/labels";
import type { SpotlightResponse, MetricRecognition, RecognitionKind } from "@/modules/challenges/spotlight";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const RECOGNITION_ICONS: Record<RecognitionKind, LucideIcon> = {
  snacks: Cookie,
  reviews: Star,
  spend: Coffee,
  completion: CheckCircle2,
  improved: TrendingUp,
};

function RecognitionIcon({ kind }: { kind: RecognitionKind }) {
  const Icon = RECOGNITION_ICONS[kind];
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-2)] text-[var(--fg-3)]">
      <Icon className="size-3.5" aria-hidden />
    </div>
  );
}

function RecognitionCard({ recognition }: { recognition: MetricRecognition }) {
  const label = SPOTLIGHT_LABELS.recognitions[recognition.kind];
  const unavailableReason =
    recognition.unavailableReason === "noPriorMonth"
      ? SPOTLIGHT_LABELS.noPriorMonth
      : recognition.unavailableReason === "dataPending"
        ? SPOTLIGHT_LABELS.dataPending
        : undefined;

  return (
    <div className="flex flex-col gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2">
        <RecognitionIcon kind={recognition.kind} />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">{label}</p>
      </div>

      {recognition.unavailable ? (
        <>
          <p className="font-mono text-lg tabular-nums text-[var(--fg-4)]">—</p>
          {unavailableReason && (
            <p className="text-[11px] text-[var(--fg-4)]">{unavailableReason}</p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-[var(--fg)]">{recognition.locationTitle}</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-[var(--fg)]">{recognition.value}</p>
          {recognition.sub && (
            <p className="text-[11px] leading-snug text-[var(--fg-3)]">{recognition.sub}</p>
          )}
          {recognition.alsoStrong && recognition.alsoStrong.length > 0 && (
            <p className="text-[10px] text-[var(--fg-4)]">
              {SPOTLIGHT_LABELS.alsoStrong}: {recognition.alsoStrong.join(", ")}
            </p>
          )}
        </>
      )}
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
      <div className="rounded-[var(--r-md)] border border-[var(--line)] border-l-[3px] border-l-[var(--bronze)] bg-[var(--surface)] p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!featured?.available) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--line)] border-l-[3px] border-l-[var(--bronze)] bg-[var(--surface)] p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--fg-4)]">
          {SPOTLIGHT_LABELS.shopSpotlight}
        </p>
        <p className="mt-2 text-sm text-[var(--fg-3)]">{SPOTLIGHT_LABELS.insufficientData}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] border-l-[3px] border-l-[var(--bronze)] bg-[var(--surface)] p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--fg-4)]">
        {SPOTLIGHT_LABELS.shopSpotlight}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-[var(--fg)]">{featured.locationTitle}</h2>
      <p className="mt-1 text-sm text-[var(--fg-3)]">{SPOTLIGHT_LABELS.shopSpotlightSubtitle}</p>

      <div className="mt-4 inline-flex items-baseline gap-1.5 rounded-[var(--r-sm)] bg-[var(--bronze-soft)]/40 px-3 py-1.5">
        <span className="font-mono text-2xl font-bold tabular-nums text-[var(--fg)]">
          {featured.executionScore}/{featured.executionTotal}
        </span>
        <span className="text-xs text-[var(--fg-3)]">{SPOTLIGHT_LABELS.targetsMet}</span>
      </div>

      {featured.summaryStats && featured.summaryStats.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {featured.summaryStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--paper-2)] p-3"
            >
              <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--fg-4)]">{stat.label}</p>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[var(--fg)]">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {featured.achievements && featured.achievements.length > 0 && (
        <section className="mt-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
            {SPOTLIGHT_LABELS.whatTheyAchieved}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {featured.achievements.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-[var(--fg-2)]">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--bronze)]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {featured.standoutMetrics && featured.standoutMetrics.length > 0 && (
        <section className="mt-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
            {SPOTLIGHT_LABELS.standoutMetrics}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {featured.standoutMetrics.map((m) => (
              <span
                key={m.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-2)] px-2.5 py-1 text-xs text-[var(--fg-2)]"
              >
                <span className="font-medium">{m.label}</span>
                <span className="font-mono tabular-nums text-[var(--fg)]">{m.value}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {featured.practices && featured.practices.length > 0 && (
        <section className="mt-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
            {SPOTLIGHT_LABELS.practicesWorthNoting}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {featured.practices.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-[var(--fg-3)]">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {featured.learnings && featured.learnings.length > 0 && (
        <section className="mt-5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--paper-2)] p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
            {SPOTLIGHT_LABELS.whatOthersCanTry}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {featured.learnings.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-[var(--fg-2)]">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSelector value={month} onChange={setMonth} />
      </div>

      <p className="max-w-2xl text-sm leading-relaxed text-[var(--fg-3)]">{SPOTLIGHT_LABELS.intro}</p>

      {data?.monthInProgress && (
        <div className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--paper-2)] px-4 py-2.5 text-sm text-[var(--fg-3)]">
          {SPOTLIGHT_LABELS.monthInProgress}
        </div>
      )}

      {error && (
        <div className="rounded-[var(--r-sm)] border border-[var(--bad)]/30 bg-[var(--bad-soft)] px-4 py-2.5 text-sm text-[var(--bad)]">
          {error}
        </div>
      )}

      <SpotlightHero featured={data?.featured ?? null} loading={loading} />

      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
          {SPOTLIGHT_LABELS.metricRecognition}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]"
                />
              ))
            : (data?.recognitions ?? []).map((recognition) => (
                <RecognitionCard key={recognition.kind} recognition={recognition} />
              ))}
        </div>
      </section>

      <p className="max-w-2xl text-xs leading-relaxed text-[var(--fg-4)]">{SPOTLIGHT_LABELS.footerNote}</p>
    </div>
  );
}
