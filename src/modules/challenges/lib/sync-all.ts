import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { bangkokNow, bangkokToday, bangkokDates, bangkokMonth, previousMonth } from "@/lib/dates";
import { importLocationFromSheet } from "@/app/api/accounting/import-sheets/lib";
import { syncAllLoyverse } from "@/modules/loyverse/lib/sync";
import { isWriteBackEnabled, writeBackForDates } from "@/modules/loyverse/lib/write-back";
import { syncChallengesFromLoyverse } from "@/modules/challenges/lib/sync-from-loyverse";
import { syncReviews } from "@/modules/challenges/lib/sync-reviews";
import { syncDailyProfitMirror, isMirrorEnabled } from "@/modules/reports/daily-profit/sheet-mirror";

/** All Bangkok dates from `since` (inclusive) to today, ascending, capped at 30. */
function datesSince(since: string, today: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error(`Invalid since ${since} — expected YYYY-MM-DD`);
  if (since > today) throw new Error(`Invalid since ${since} — in the future`);
  const out: string[] = [];
  const d = new Date(`${since}T12:00:00Z`);
  const end = new Date(`${today}T12:00:00Z`);
  while (d <= end && out.length < 30) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export type SyncStepStatus = {
  ok: boolean;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  summary?: Record<string, unknown>;
};

export type SyncAllResult = {
  triggeredBy: "cron" | "manual";
  finishedAt: string;
  ok: boolean;
  steps: {
    sheets: SyncStepStatus;
    loyverse: SyncStepStatus;
    writeBack: SyncStepStatus;
    counters: SyncStepStatus;
    reviews: SyncStepStatus;
    mirror: SyncStepStatus;
  };
};

/**
 * Sequential nightly pipeline — the single orchestrator, fixed order.
 * It is the app's only scheduled job (see vercel.json).
 *
 * 1. sheets     — Google Sheets → daily_entries (costs/opex source; sales draft).
 * 2. loyverse   — receipts/shifts → snapshots (sales source of truth).
 * 3. writeBack  — Loyverse sales overwrite daily_entries sales fields (costs preserved).
 * 4. counters   — snapshots → challenge_counters (entries/snacks, force=true).
 * 5. reviews    — Google GBP → reviews_cache + ratings.
 * 6. mirror     — Google Sheets → finance_sheet_entries (Daily P&L snapshot + revisions).
 *
 * Order matters: sheets BEFORE write-back so Loyverse sales always win over
 * the Sheets draft, while manual costs from Sheets are preserved.
 * Sheets/reviews/mirror failures are non-fatal (noted in result); loyverse/
 * writeBack/counters failures mark the run as failed.
 */
export async function syncAllChallenges(opts?: {
  triggeredBy?: "cron" | "manual";
  respectSheetConfig?: boolean;
  /**
   * Retroactive re-sync from this date (YYYY-MM-DD, Bangkok) to today.
   * Rewrites Loyverse snapshots with force=true over the range (needed when
   * the category mapping changed, e.g. Snacks → Animal food) and replays the
   * write-back for every date in the range. Capped at 30 days (Loyverse API).
   * Counters always recompute full months from snapshots, so no range needed.
   */
  since?: string;
}): Promise<SyncAllResult> {
  const triggeredBy = opts?.triggeredBy ?? "cron";
  const respectSheetConfig = opts?.respectSheetConfig ?? triggeredBy === "cron";
  const supabase = getSupabaseServerClient();
  const todayBkk = bangkokToday();
  const retroDates = opts?.since ? datesSince(opts.since, todayBkk) : null;

  const steps: SyncAllResult["steps"] = {
    sheets: { ok: true },
    loyverse: { ok: true },
    writeBack: { ok: true },
    counters: { ok: true },
    reviews: { ok: true },
    mirror: { ok: true },
  };

  // ——— 1. Sheets → daily_entries (costs) ———
  try {
    if (respectSheetConfig) {
      const { data: config } = await supabase
        .from("sheet_sync_config")
        .select("enabled")
        .eq("organization_id", DEFAULT_ORG_ID)
        .single();
      if (!config?.enabled) {
        steps.sheets = { ok: true, skipped: true, skipReason: "sheet automation disabled" };
      }
    }
    if (!steps.sheets.skipped) {
      const accessToken = await getOrganizationAccessToken();
      if (!accessToken) throw new Error("Google account not connected or token expired");
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("is_active", true)
        .not("google_sheet_id", "is", null)
        .order("name");
      let inserted = 0;
      let failed = 0;
      for (const loc of locations ?? []) {
        const r = await importLocationFromSheet(loc.id as string, null, accessToken, supabase);
        inserted += r.inserted;
        if (r.error) failed++;
      }
      steps.sheets = { ok: failed === 0, summary: { locations: locations?.length ?? 0, inserted, failed } };
      if (failed > 0) steps.sheets.error = `${failed} location(s) failed`;

      // Keep Admin > Automations "last run" truthful: the dedicated sheet-sync
      // crons are gone, this pipeline is now the only Sheets importer.
      await supabase
        .from("sheet_sync_config")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_result: { total_inserted: inserted, failed_count: failed, location_count: locations?.length ?? 0 },
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", DEFAULT_ORG_ID);
    }
  } catch (e) {
    steps.sheets = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // ——— 2. Loyverse receipts/shifts → snapshots ———
  try {
    // Retro mode: force-rewrite the whole range with the current mapping
    // (backfill would skip already-synced dates).
    const result = retroDates
      ? await syncAllLoyverse({ triggeredBy, force: true, days: retroDates.length })
      : await syncAllLoyverse({ triggeredBy, backfill: true });
    steps.loyverse = {
      ok: result.status !== "failed",
      error: result.error ?? undefined,
      summary: { total_snapshots: result.total_snapshots, status: result.status },
    };
    if (result.status === "failed") throw new Error(result.error ?? "Loyverse sync failed");
  } catch (e) {
    steps.loyverse = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // ——— 3. Write-back Loyverse sales → daily_entries ———
  try {
    if (!isWriteBackEnabled()) {
      steps.writeBack = { ok: true, skipped: true, skipReason: "LOYVERSE_WRITE_ENABLED=false" };
    } else if (!steps.loyverse.ok) {
      steps.writeBack = { ok: false, error: "skipped — loyverse step failed" };
    } else {
      // Retro mode: replay every date in the range, else J + J-1.
      const dates = retroDates ?? bangkokDates(2);
      const results = await writeBackForDates(dates, { dryRun: false });
      const upserted = results.reduce((s, r) => s + r.daily_upserted, 0);
      const errors = results.flatMap((r) => r.errors);
      steps.writeBack = {
        ok: errors.length === 0,
        error: errors.length > 0 ? errors.join("; ") : undefined,
        summary: { dates: dates.length, daily_upserted: upserted },
      };
    }
  } catch (e) {
    steps.writeBack = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // ——— 4. Snapshots → challenge_counters ———
  try {
    if (!steps.loyverse.ok) {
      steps.counters = { ok: false, error: "skipped — loyverse step failed" };
    } else {
      const month = bangkokMonth();
      // Months to recompute: every month spanned by the retro range, else the
      // current month (+ previous when early-month, as J-1 belongs to it).
      const months = retroDates
        ? Array.from(new Set(retroDates.map((d) => d.slice(0, 7))))
        : [month, ...(bangkokNow().getUTCDate() <= 3 ? [previousMonth(month)] : [])];
      let upserted = 0;
      const errors: string[] = [];
      for (const m of months) {
        const r = await syncChallengesFromLoyverse(m, { dryRun: false, force: true });
        upserted += r.location_upserted;
        errors.push(...r.errors);
      }
      steps.counters = {
        ok: errors.length === 0,
        error: errors.length > 0 ? errors.join("; ") : undefined,
        summary: { months, location_upserted: upserted },
      };
    }
  } catch (e) {
    steps.counters = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // ——— 5. Google reviews → cache + ratings ———
  try {
    const r = await syncReviews();
    steps.reviews = { ok: true, summary: { synced: r.synced, locations: r.locations } };
  } catch (e) {
    steps.reviews = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // ——— 6. Sheets → finance_sheet_entries (Daily P&L mirror + revisions) ———
  // Non-fatal: without it the report falls back to daily_entries for new dates.
  try {
    if (!(await isMirrorEnabled())) {
      steps.mirror = { ok: true, skipped: true, skipReason: "finance mirror disabled" };
    } else {
      const { status, body } = await syncDailyProfitMirror({ userId: null, source: triggeredBy === "manual" ? "manual" : "cron" });
      const summary = body as { error?: string; inserted?: number; updated?: number; unchanged?: number; errors?: number };
      steps.mirror = {
        ok: status === 200 && !summary.error,
        error: summary.error,
        summary: { inserted: summary.inserted ?? 0, updated: summary.updated ?? 0, unchanged: summary.unchanged ?? 0, errors: summary.errors ?? 0 },
      };
    }
  } catch (e) {
    steps.mirror = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const ok = steps.loyverse.ok && steps.writeBack.ok && steps.counters.ok;
  return { triggeredBy, finishedAt: new Date().toISOString(), ok, steps };
}
