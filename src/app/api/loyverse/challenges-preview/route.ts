import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseAccess } from "@/modules/loyverse/lib/guard";
import { DEFAULT_ORG_ID } from "@/lib/constants";

function periodForDay(day: number): 1 | 2 | 3 {
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

export async function GET(request: Request) {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const month = url.searchParams.get("month"); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month=YYYY-MM requis" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const monthStart = `${month}-01`;
  const nextMonth = month === "12" ? `${Number(month.slice(0, 4)) + 1}-01-01` : `${month.slice(0, 5)}${String(Number(month.slice(5, 7)) + 1).padStart(2, "0")}-01`;

  try {
    const [snapRes, entriesRes, locRes] = await Promise.all([
      supabase.from("loyverse_daily_snapshots").select("location_id, store_id, account_key, date, tickets_sold, snacks_sold").gte("date", monthStart).lt("date", nextMonth),
      supabase.from("location_entries").select("location_id, period, entry_count, snacks_sold").eq("organization_id", DEFAULT_ORG_ID).eq("month", month),
      supabase.from("locations").select("id, name, loyverse_store_id").eq("organization_id", DEFAULT_ORG_ID),
    ]);
    if (snapRes.error) throw snapRes.error;
    if (entriesRes.error) throw entriesRes.error;

    const locNames = new Map((locRes.data ?? []).map((l) => [l.id as string, l.name as string]));
    const storeIdToLocation = new Map((locRes.data ?? []).filter((l) => (l as { loyverse_store_id?: string | null }).loyverse_store_id).map((l) => [(l as { loyverse_store_id: string }).loyverse_store_id, l.id as string]));

    // Agrège Loyverse par location/period (tickets = entrées, snacks)
    const loyverseAgg = new Map<string, { location_id: string; period: 1 | 2 | 3; entry_count: number; snacks_sold: number }>();
    const unmapped: { store_id: string; account_key: string; period: 1 | 2 | 3; entry_count: number; snacks_sold: number }[] = [];
    for (const snap of snapRes.data ?? []) {
      const locId = snap.location_id as string | null;
      const day = Number((snap.date as string).slice(8, 10));
      const period = periodForDay(day);
      const ec = Number((snap as { tickets_sold?: number }).tickets_sold ?? 0);
      const ss = Number((snap as { snacks_sold?: number }).snacks_sold ?? 0);
      if (!locId) {
        // Garde trace des shops non mappés pour debug (ex: Silom)
        const storeId = snap.store_id as string;
        const accountKey = (snap as { account_key?: string }).account_key ?? storeId;
        // tente de résoudre via locations.loyverse_store_id si mapping manquant dans snapshots
        const resolved = storeIdToLocation.get(storeId);
        if (resolved) {
          const key = `${resolved}|${period}`;
          const prev = loyverseAgg.get(key);
          if (prev) { prev.entry_count += ec; prev.snacks_sold += ss; } else loyverseAgg.set(key, { location_id: resolved, period, entry_count: ec, snacks_sold: ss });
        } else {
          unmapped.push({ store_id: storeId, account_key: accountKey, period, entry_count: ec, snacks_sold: ss });
        }
        continue;
      }
      const key = `${locId}|${period}`;
      const prev = loyverseAgg.get(key);
      if (prev) { prev.entry_count += ec; prev.snacks_sold += ss; } else loyverseAgg.set(key, { location_id: locId, period, entry_count: ec, snacks_sold: ss });
    }

    const existingMap = new Map<string, { entry_count: number | null; snacks_sold: number | null }>();
    for (const e of entriesRes.data ?? []) {
      const key = `${e.location_id}|${e.period}`;
      existingMap.set(key, { entry_count: e.entry_count as number | null, snacks_sold: e.snacks_sold as number | null });
    }

    const preview = Array.from(loyverseAgg.values())
      .map((agg) => {
        const key = `${agg.location_id}|${agg.period}`;
        const existing = existingMap.get(key);
        return {
          location_id: agg.location_id,
          location_name: locNames.get(agg.location_id) ?? agg.location_id,
          month,
          period: agg.period,
          proposed_entry_count: agg.entry_count,
          proposed_snacks_sold: agg.snacks_sold,
          existing_entry_count: existing?.entry_count ?? null,
          existing_snacks_sold: existing?.snacks_sold ?? null,
          will_overwrite: existing !== undefined,
        };
      })
      .sort((a, b) => a.location_name.localeCompare(b.location_name) || a.period - b.period);

    // Shops sans snapshot mais avec location_entries existante (pour voir les manuels)
    const loyverseKeys = new Set(preview.map((p) => `${p.location_id}|${p.period}`));
    for (const e of entriesRes.data ?? []) {
      const key = `${e.location_id}|${e.period as number}`;
      if (!loyverseKeys.has(key)) {
        preview.push({
          location_id: e.location_id as string,
          location_name: locNames.get(e.location_id as string) ?? (e.location_id as string),
          month,
          period: e.period as 1 | 2 | 3,
          proposed_entry_count: 0,
          proposed_snacks_sold: 0,
          existing_entry_count: e.entry_count as number | null,
          existing_snacks_sold: e.snacks_sold as number | null,
          will_overwrite: true,
        });
      }
    }
    preview.sort((a, b) => a.location_name.localeCompare(b.location_name) || a.period - b.period);

    // Agrège unmapped par store/period pour diagnostic
    const unmappedAgg = new Map<string, { store_id: string; account_key: string; period: 1 | 2 | 3; entry_count: number; snacks_sold: number }>();
    for (const u of unmapped) {
      const key = `${u.store_id}|${u.period}`;
      const prev = unmappedAgg.get(key);
      if (prev) { prev.entry_count += u.entry_count; prev.snacks_sold += u.snacks_sold; } else unmappedAgg.set(key, { ...u });
    }
    const unmappedPreview = Array.from(unmappedAgg.values()).map((u) => ({
      location_id: u.store_id,
      location_name: `⚠️ Non mappé: ${u.account_key} (${u.store_id.slice(0, 8)}…)`,
      month,
      period: u.period,
      proposed_entry_count: u.entry_count,
      proposed_snacks_sold: u.snacks_sold,
      existing_entry_count: null as number | null,
      existing_snacks_sold: null as number | null,
      will_overwrite: false as boolean,
      unmapped: true as const,
    }));

    return NextResponse.json({ month, preview, unmapped: unmappedPreview });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
