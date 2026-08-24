import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseOwner } from "@/modules/loyverse/lib/guard";
import { MERCH_TIERS, normalizeLocationKey, PANIER_THRESHOLD, REVENUE_THRESHOLDS, SNACKS_THRESHOLD } from "@/modules/challenges/constants";

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? bangkokToday();

  const supabase = getSupabaseServerClient();

  const { data: snapshots, error: snapErr } = await supabase
    .from("loyverse_daily_snapshots")
    .select("*")
    .eq("date", date)
    .order("store_id");

  if (snapErr) return Response.json({ error: snapErr.message }, { status: 500 });

  const rows = snapshots ?? [];
  const locationIds = rows.map((r) => r.location_id).filter(Boolean) as string[];
  const { data: locs } = await supabase
    .from("locations")
    .select("id, name")
    .in("id", locationIds.length ? locationIds : ["00000000-0000-0000-0000-000000000000"]);
  const locById = new Map((locs ?? []).map((l) => [l.id as string, l.name as string]));

  const preview = rows.map((snap) => {
    const locationName = snap.location_id ? (locById.get(snap.location_id as string) ?? null) : null;
    const revenue = Number(snap.revenue_total ?? 0);
    const goodies = Number(snap.sales_goodies_net ?? 0);
    const entry_count = Number(snap.sale_count ?? 0) - Number(snap.refund_count ?? 0);
    const snacks_sold = Number(snap.snacks_sold ?? 0);
    const panier = Number(snap.avg_ticket ?? 0);
    const merchPct = revenue > 0 ? goodies / revenue : 0;
    const snacksRatio = entry_count > 0 ? snacks_sold / entry_count : 0;

    const locKey = locationName ? normalizeLocationKey(locationName) : null;
    const revenueThreshold = locKey ? (REVENUE_THRESHOLDS[locKey] ?? null) : null;
    const revenueGated = revenueThreshold !== null ? revenue >= revenueThreshold : null;

    // Best merch tier reached
    const merchTier = MERCH_TIERS.find((t) => merchPct >= t.threshold) ?? null;

    return {
      account_key: snap.account_key,
      store_id: snap.store_id,
      location_id: snap.location_id,
      location_name: locationName,
      date: snap.date,
      loyverse: {
        entry_count,
        snacks_sold,
        panier,
        revenue,
        merch_pct: merchPct,
        snacks_ratio: snacksRatio,
      },
      thresholds: {
        revenue_threshold: revenueThreshold,
        revenue_gated: revenueGated,
        snacks_threshold: SNACKS_THRESHOLD,
        snacks_pass: snacksRatio >= SNACKS_THRESHOLD,
        panier_threshold: PANIER_THRESHOLD,
        panier_pass: panier >= PANIER_THRESHOLD,
        merch_tiers: MERCH_TIERS,
        merch_tier: merchTier,
        merch_pass: merchTier !== null,
      },
      meta: {
        receipt_count: snap.receipt_count,
        sale_count: snap.sale_count,
        refund_count: snap.refund_count,
      },
      // Flag: challenges/AGENTS.md revenue = sum sales net (no vat_7) — we respect that
      note: "Revenue = sum sales net (VAT-inclus, jamais + vat_7) — cf challenges/AGENTS.md",
    };
  });

  return Response.json({ date, count: preview.length, preview });
}
