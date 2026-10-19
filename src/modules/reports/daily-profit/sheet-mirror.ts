import { createHash } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { parseDailyEntriesTab } from "@/app/api/accounting/import-sheets/lib";

// Daily P&L sheet mirror: the same DAILY_ENTRIES tab the accounting import reads,
// copied into finance_sheet_entries (+ a revision row per change) so the report
// keeps its own snapshot and history. Called by the nightly pipeline
// (sync-all step `mirror`), by POST /api/reports/daily-profit/sync (owner refresh)
// and by GET (cron bearer, kept for on-demand triggers).
//
// Isolation contract (daily-profit/isolation.test.ts): every write here stays on
// finance-prefixed tables — never on daily_entries or any operational table.

type MirrorRow = { id: string; location_id: string; entry_date: string; payload: Record<string, unknown>; source_hash: string };

function stableHash(payload: Record<string, unknown>) {
  const sorted = Object.fromEntries(Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)));
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter((key) => before[key] !== after[key]).sort();
}

export type MirrorSummary = {
  preview: boolean;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: number;
  results: Array<{ locationId: string; locationName: string; inserted: number; updated: number; unchanged: number; errors: string[] }>;
};

export type MirrorSyncOutcome = { status: number; body: MirrorSummary | { error: string; skipped?: boolean; reason?: string } };

export async function syncDailyProfitMirror(opts: {
  userId: string | null;
  source: "manual" | "cron";
  preview?: boolean;
}): Promise<MirrorSyncOutcome> {
  const preview = opts.preview === true;
  const { userId, source } = opts;

  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) return { status: 400, body: { error: "Google account is not connected or its token expired" } };

  const supabase = getSupabaseServerClient();
  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id,name,google_sheet_id")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .not("google_sheet_id", "is", null)
    .order("name");
  if (locationsError) return { status: 500, body: { error: locationsError.message } };

  const results: MirrorSummary["results"] = [];
  for (const location of locations ?? []) {
    const result = { locationId: String(location.id), locationName: String(location.name), inserted: 0, updated: 0, unchanged: 0, errors: [] as string[] };
    try {
      const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(String(location.google_sheet_id))}/values/DAILY_ENTRIES`;
      const sheetResponse = await fetch(sheetUrl, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      if (!sheetResponse.ok) throw new Error(`Sheets API ${sheetResponse.status}`);
      const sheet = await sheetResponse.json() as { values?: string[][] };
      const tab = parseDailyEntriesTab(sheet.values ?? []);
      if ("error" in tab) throw new Error(tab.error);
      result.errors.push(...tab.errors);

      const parsed: Array<{ entryDate: string; payload: Record<string, unknown>; sourceHash: string }> = tab.rows.map(({ entryDate, values, notes }) => {
        const payload: Record<string, unknown> = { ...values, notes };
        return { entryDate, payload, sourceHash: stableHash(payload) };
      });

      const dates = parsed.map((row) => row.entryDate);
      const existing = new Map<string, MirrorRow>();
      for (let offset = 0; offset < dates.length; offset += 200) {
        const page = dates.slice(offset, offset + 200);
        if (page.length === 0) continue;
        const { data, error } = await supabase.from("finance_sheet_entries").select("id,location_id,entry_date,payload,source_hash")
          .eq("organization_id", DEFAULT_ORG_ID).eq("location_id", location.id).in("entry_date", page);
        if (error) throw error;
        for (const row of data ?? []) existing.set(String(row.entry_date), row as MirrorRow);
      }

      for (const row of parsed) {
        const previous = existing.get(row.entryDate);
        if (previous?.source_hash === row.sourceHash) { result.unchanged += 1; continue; }
        if (previous) result.updated += 1; else result.inserted += 1;
        if (preview) continue;

        const { data: saved, error: saveError } = await supabase.from("finance_sheet_entries").upsert({
          organization_id: DEFAULT_ORG_ID,
          location_id: location.id,
          entry_date: row.entryDate,
          payload: row.payload,
          source_hash: row.sourceHash,
          source_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id,location_id,entry_date" }).select("id").single();
        if (saveError) throw saveError;

        const { error: revisionError } = await supabase.from("finance_sheet_revisions").insert({
          organization_id: DEFAULT_ORG_ID,
          finance_sheet_entry_id: saved.id,
          location_id: location.id,
          entry_date: row.entryDate,
          before_payload: previous?.payload ?? null,
          after_payload: row.payload,
          changed_fields: changedFields(previous?.payload ?? {}, row.payload),
          source_hash: row.sourceHash,
          created_by: userId,
        });
        if (revisionError) throw revisionError;
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : "Unknown sync error");
    }
    results.push(result);
  }

  const summary: MirrorSummary = {
    preview,
    inserted: results.reduce((sum, result) => sum + result.inserted, 0),
    updated: results.reduce((sum, result) => sum + result.updated, 0),
    unchanged: results.reduce((sum, result) => sum + result.unchanged, 0),
    errors: results.reduce((sum, result) => sum + result.errors.length, 0),
    results,
  };

  if (!preview) {
    await supabase.from("finance_sync_config").upsert({
      organization_id: DEFAULT_ORG_ID,
      last_run_at: new Date().toISOString(),
      last_run_result: summary,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    await supabase.from("finance_audit_events").insert({
      organization_id: DEFAULT_ORG_ID,
      user_id: userId,
      action: "finance.sheet_mirror.sync",
      entity_type: "finance_sheet_entries",
      reason: source === "cron" ? "Scheduled Daily P&L sync" : "Manual Daily P&L refresh",
      payload: summary,
    });
  }

  return { status: 200, body: summary };
}

/** `finance_sync_config.enabled` — the same on/off switch the cron used to check. */
export async function isMirrorEnabled(): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("finance_sync_config").select("enabled").eq("organization_id", DEFAULT_ORG_ID).maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}
