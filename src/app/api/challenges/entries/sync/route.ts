import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchReceiptsForMonth } from "@/lib/loyverse";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID, LOYVERSE_TO_GBP } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month parameter required in YYYY-MM format" }, { status: 400 });
  }

  if (Object.keys(LOYVERSE_TO_GBP).length === 0) {
    return Response.json(
      { error: "LOYVERSE_TO_GBP mapping is empty — fill in constants.ts after running GET /api/challenges/entries/stores" },
      { status: 503 }
    );
  }

  try {
    const receipts = await fetchReceiptsForMonth(month);

    // Count receipts per Loyverse store
    const countByStore = new Map<string, number>();
    for (const r of receipts) {
      countByStore.set(r.store_id, (countByStore.get(r.store_id) ?? 0) + 1);
    }

    const syncedAt = new Date().toISOString();
    const rows = Array.from(countByStore.entries())
      .filter(([storeId]) => LOYVERSE_TO_GBP[storeId])
      .map(([storeId, count]) => ({
        location_id: LOYVERSE_TO_GBP[storeId],
        organization_id: DEFAULT_ORG_ID,
        month,
        entry_count: count,
        synced_at: syncedAt,
      }));

    if (rows.length === 0) {
      return Response.json({ synced: 0, month, note: "No matching stores found in mapping" });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("location_entries")
      .upsert(rows, { onConflict: "location_id,organization_id,month" });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ synced: rows.length, month, syncedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
