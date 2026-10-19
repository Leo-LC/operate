"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ClockIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon } from "lucide-react";

interface LocationResult {
  location_id: string;
  location_name: string;
  inserted: number;
  skipped_existing: number;
  error: string | null;
}

interface LastRunResult {
  total_inserted?: number;
  failed_count?: number;
  location_count?: number;
  error?: string;
  results?: LocationResult[];
}

interface AutomationsClientProps {
  initialEnabled: boolean;
  lastRunAt: string | null;
  lastRunResult: LastRunResult | null;
  recentRuns?: RecentRun[];
}

export interface RecentRun {
  id: string;
  job: string;
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean;
  result: Record<string, unknown> | null;
}

/** One-line summary of a stored run payload, per job shape. */
function runSummary(run: RecentRun): string {
  const r = run.result ?? {};
  if (typeof r.error === "string" && r.error) return r.error;
  if (typeof r.total_inserted === "number") {
    const failed = typeof r.failed_count === "number" ? r.failed_count : 0;
    return `${r.total_inserted} row(s) imported${failed > 0 ? ` — ${failed} location(s) failed` : ""}`;
  }
  const steps = r.steps as Record<string, { ok?: boolean; skipped?: boolean }> | undefined;
  if (steps) {
    const failed = Object.entries(steps).filter(([, s]) => s?.ok === false).map(([name]) => name);
    return failed.length > 0 ? `failed: ${failed.join(", ")}` : `ok — ${Object.keys(steps).length} steps`;
  }
  return run.ok ? "ok" : "failed";
}

function formatRunAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  }) + " (Thailand time)";
}

export function AutomationsClient({ initialEnabled, lastRunAt, lastRunResult, recentRuns = [] }: AutomationsClientProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [runResult, setRunResult] = useState<LastRunResult | null>(lastRunResult);
  const [runAt, setRunAt] = useState<string | null>(lastRunAt);
  const [running, setRunning] = useState(false);

  async function handleToggle(next: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sheet-sync-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to update");
        return;
      }
      setEnabled(next);
      toast.success(next ? "Automation enabled" : "Automation disabled");
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/accounting/import-sheets/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { total_inserted?: number; failed_count?: number; location_count?: number; error?: string; results?: LocationResult[] };
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }
      const now = new Date().toISOString();
      setRunAt(now);
      setRunResult(data);
      toast.success(`Done — ${data.total_inserted ?? 0} rows imported`);
    } catch {
      toast.error("Unexpected error");
    } finally {
      setRunning(false);
    }
  }

  const hasError = runResult?.error || (runResult?.failed_count ?? 0) > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)" }}>Automations</h2>
        <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4 }}>
          Scheduled tasks that run automatically in the background.
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: "transparent",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "var(--r-md)",
              background: "var(--bronze-1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <ClockIcon size={16} color="var(--bronze)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Google Sheets import</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                Runs nightly at 23:30 Thailand time, as step 1 of the global pipeline (sheets &rarr; Loyverse &rarr; write-back &rarr; counters &rarr; reviews &rarr; finance mirror). This switch turns off the Sheets import only.
              </div>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => void handleToggle(!enabled)}
            disabled={saving}
            style={{
              flexShrink: 0,
              width: 44, height: 24,
              borderRadius: 12,
              background: enabled ? "var(--bronze)" : "var(--line)",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              position: "relative",
              transition: "background 200ms",
              opacity: saving ? 0.6 : 1,
            }}
          >
            <span style={{
              position: "absolute",
              top: 3, left: enabled ? 23 : 3,
              width: 18, height: 18,
              borderRadius: "50%",
              background: "white",
              transition: "left 200ms",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        {/* Status row */}
        <div style={{ height: 1, background: "var(--line)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          {/* Last run info */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {runAt ? (
              <>
                {hasError
                  ? <XCircleIcon size={14} color="var(--red, #e53e3e)" />
                  : <CheckCircleIcon size={14} color="var(--green, #38a169)" />
                }
                <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
                  Last run: {formatRunAt(runAt)}
                  {runResult && !runResult.error && (
                    <> &mdash; {runResult.total_inserted ?? 0} rows imported
                    {(runResult.failed_count ?? 0) > 0 && <>, {runResult.failed_count} location(s) failed</>}
                    </>
                  )}
                  {runResult?.error && <> &mdash; {runResult.error}</>}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Never run</span>
            )}
          </div>

          {/* Run now button */}
          <button
            onClick={() => void handleRunNow()}
            disabled={running}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px",
              fontSize: 12, fontWeight: 500,
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--fg-2)",
              cursor: running ? "not-allowed" : "pointer",
              opacity: running ? 0.6 : 1,
              transition: "border-color 150ms, color 150ms",
            }}
            onMouseEnter={(e) => { if (!running) { e.currentTarget.style.borderColor = "var(--bronze)"; e.currentTarget.style.color = "var(--bronze)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--fg-2)"; }}
          >
            <RefreshCwIcon size={12} style={{ animation: running ? "spin 1s linear infinite" : "none" }} />
            {running ? "Running…" : "Run now"}
          </button>
        </div>

        {/* Per-location breakdown */}
        {runResult?.results && runResult.results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {runResult.results.map((r) => (
              <div key={r.location_id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "4px 8px", borderRadius: "var(--r-sm)",
                background: r.error ? "var(--red-1, rgba(229,62,62,0.06))" : "var(--bg)",
                fontSize: 12,
              }}>
                <span style={{ color: "var(--fg-2)", fontWeight: 500 }}>{r.location_name}</span>
                <span style={{ color: r.error ? "var(--red, #e53e3e)" : "var(--fg-3)" }}>
                  {r.error ?? `${r.inserted} new, ${r.skipped_existing} skipped`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent runs of every background automation (cron_runs table, written by src/lib/cron.ts) */}
      {recentRuns.length > 0 && (
        <div style={{
          background: "transparent",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Recent scheduled runs</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
              Last runs of every background automation — the nightly global pipeline (sheets &rarr; Loyverse &rarr; write-back &rarr; counters &rarr; reviews &rarr; finance mirror).
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentRuns.map((run) => (
              <div key={run.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "4px 8px", borderRadius: "var(--r-sm)",
                background: run.ok ? "var(--bg)" : "var(--red-1, rgba(229,62,62,0.06))",
                fontSize: 12,
              }}>
                <span style={{ color: "var(--fg-2)", fontWeight: 500, minWidth: 120 }}>{run.job.replace(/-/g, " ")}</span>
                <span style={{ color: run.ok ? "var(--fg-3)" : "var(--red, #e53e3e)", flex: 1 }}>{runSummary(run)}</span>
                <span style={{ color: "var(--fg-4)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  {run.ok
                    ? <CheckCircleIcon size={12} color="var(--green, #38a169)" />
                    : <XCircleIcon size={12} color="var(--red, #e53e3e)" />}
                  {formatRunAt(run.started_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}