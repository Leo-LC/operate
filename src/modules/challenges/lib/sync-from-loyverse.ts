import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

function periodForDay(day: number): 1 | 2 | 3 {
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

export type ChallengesSyncResult = {
  month: string;
  dryRun: boolean;
  location_upserted: number;
  location_skipped: number;
  location_exists_overwritten: number;
  errors: string[];
  details: Array<{ location_id: string; location_name: string | null; period: 1 | 2 | 3; entry_count: number; snacks_sold: number; action: "upserted" | "skipped" | "exists_skip" | "error"; error?: string }>;
};

export async function syncChallengesFromLoyverse(
  month: string,
  opts?: { dryRun?: boolean; force?: boolean },
): Promise<ChallengesSyncResult> {
  const dryRun = opts?.dryRun ?? false;
  const force = opts?.force ?? false;
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error(`Invalid month ${month} — expected YYYY-MM`);

  const supabase = getSupabaseServerClient();
  const monthStart = `${month}-01`;
  const nextMonth = month === "12" ? `${Number(month.slice(0, 4)) + 1}-01-01` : `${month.slice(0, 5)}${String(Number(month.slice(5, 7)) + 1).padStart(2, "0")}-01`;

  const [snapRes, locRes] = await Promise.all([
    supabase.from("loyverse_daily_snapshots").select("location_id, date, tickets_sold, snacks_sold").gte("date", monthStart).lt("date", nextMonth),
    supabase.from("locations").select("id, name").eq("organization_id", DEFAULT_ORG_ID),
  ]);
  if (snapRes.error) throw new Error(snapRes.error.message);

  const locNames = new Map((locRes.data ?? []).map((l) => [l.id as string, l.name as string]));

  // Agrège Loyverse par location/period
  const agg = new Map<string, { location_id: string; period: 1 | 2 | 3; entry_count: number; snacks_sold: number }>();
  for (const snap of snapRes.data ?? []) {
    const locId = snap.location_id as string | null;
    if (!locId) continue;
    const day = Number((snap.date as string).slice(8, 10));
    const period = periodForDay(day);
    const key = `${locId}|${period}`;
    const ec = Number((snap as { tickets_sold?: number }).tickets_sold ?? 0);
    const ss = Number(snap.snacks_sold ?? 0);
    const prev = agg.get(key);
    if (prev) { prev.entry_count += ec; prev.snacks_sold += ss; } else agg.set(key, { location_id: locId, period, entry_count: ec, snacks_sold: ss });
  }

  const result: ChallengesSyncResult = {
    month,
    dryRun,
    location_upserted: 0,
    location_skipped: 0,
    location_exists_overwritten: 0,
    errors: [],
    details: [],
  };

  for (const [, a] of agg) {
    try {
      const { data: existing } = await supabase
        .from("location_entries")
        .select("entry_count, snacks_sold")
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("location_id", a.location_id)
        .eq("month", month)
        .eq("period", a.period)
        .maybeSingle();

      const exists = !!existing;
      const existingEc = existing ? Number((existing as { entry_count: number | null }).entry_count ?? 0) : null;
      const existingSs = existing ? Number((existing as { snacks_sold: number | null }).snacks_sold ?? 0) : null;

      // Garde-fou: n'écrase pas une saisie manuelle existante sauf force=true
      // Si la période a déjà une valeur (même 0) on considère qu'elle a été saisie manuellement
      const hasExisting = existing !== null && (existingEc !== null || existingSs !== null) && (existingEc !== 0 || existingSs !== 0 || (existing as { entry_count: unknown }).entry_count !== null);
      // Plus simple: si existing row existe et force=false, on skip si déjà rempli
      if (exists && !force) {
        // Si déjà rempli avec des valeurs non nulles, on skip
        const isFilled = (existing as { entry_count: number | null }).entry_count !== null || (existing as { snacks_sold: number | null }).snacks_sold !== null;
        if (isFilled) {
          // Mais si les valeurs Loyverse sont identiques, on considère skipped, sinon on note qu'on aurait écrasé
          if (existingEc === a.entry_count && existingSs === a.snacks_sold) {
            result.location_skipped++;
            result.details.push({ location_id: a.location_id, location_name: locNames.get(a.location_id) ?? null, period: a.period, entry_count: a.entry_count, snacks_sold: a.snacks_sold, action: "skipped" });
          } else {
            result.location_exists_overwritten++;
            result.details.push({ location_id: a.location_id, location_name: locNames.get(a.location_id) ?? null, period: a.period, entry_count: a.entry_count, snacks_sold: a.snacks_sold, action: "exists_skip" });
          }
          continue;
        }
      }

      if (exists && existingEc === a.entry_count && existingSs === a.snacks_sold) {
        result.location_skipped++;
        result.details.push({ location_id: a.location_id, location_name: locNames.get(a.location_id) ?? null, period: a.period, entry_count: a.entry_count, snacks_sold: a.snacks_sold, action: "skipped" });
        continue;
      }

      if (!dryRun) {
        const { error } = await supabase.from("location_entries").upsert(
          {
            location_id: a.location_id,
            organization_id: DEFAULT_ORG_ID,
            month,
            period: a.period,
            entry_count: a.entry_count,
            snacks_sold: a.snacks_sold,
            synced_at: new Date().toISOString(),
          } as never,
          { onConflict: "location_id,organization_id,month,period" },
        );
        if (error) throw new Error(error.message);
      }
      result.location_upserted++;
      result.details.push({ location_id: a.location_id, location_name: locNames.get(a.location_id) ?? null, period: a.period, entry_count: a.entry_count, snacks_sold: a.snacks_sold, action: "upserted" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`${a.location_id} p${a.period}: ${msg}`);
      result.details.push({ location_id: a.location_id, location_name: locNames.get(a.location_id) ?? null, period: a.period, entry_count: a.entry_count, snacks_sold: a.snacks_sold, action: "error", error: msg });
    }
  }

  return result;
}
