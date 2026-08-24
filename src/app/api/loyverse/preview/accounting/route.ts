import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseOwner } from "@/modules/loyverse/lib/guard";
import { buildFieldDiffs } from "@/modules/loyverse-sandbox/lib/aggregate-receipts";

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

  // Fetch existing daily_entries for mapped locations
  const locationIds = rows.map((r) => r.location_id).filter(Boolean) as string[];
  let existingByLocation = new Map<string, Record<string, unknown>>();
  if (locationIds.length > 0) {
    const { data: entries } = await supabase
      .from("daily_entries")
      .select("*")
      .eq("entry_date", date)
      .in("location_id", locationIds);
    for (const e of entries ?? []) {
      existingByLocation.set((e as { location_id: string }).location_id, e as Record<string, unknown>);
    }
  }

  // Fetch location names
  const { data: locs } = await supabase.from("locations").select("id, name").in("id", locationIds.length ? locationIds : ["00000000-0000-0000-0000-000000000000"]);
  const locNameById = new Map((locs ?? []).map((l) => [l.id as string, l.name as string]));

  const preview = rows.map((snap) => {
    const proposed = {
      sales_drinks_net: Number(snap.sales_drinks_net ?? 0),
      sales_ticket_net: Number(snap.sales_ticket_net ?? 0),
      sales_snack_net: Number(snap.sales_snack_net ?? 0),
      sales_goodies_net: Number(snap.sales_goodies_net ?? 0),
      sales_card_surcharge: Number(snap.sales_card_surcharge ?? 0),
      vat_7: Number(snap.vat_7 ?? 0),
      payment_cash: Number(snap.payment_cash ?? 0),
      payment_scan: Number(snap.payment_scan ?? 0),
      payment_credit_card: Number(snap.payment_credit_card ?? 0),
    };
    const existing = snap.location_id ? (existingByLocation.get(snap.location_id as string) as Record<string, number | string | null> | null) ?? null : null;
    const diffs = buildFieldDiffs(proposed, existing);
    return {
      account_key: snap.account_key,
      store_id: snap.store_id,
      location_id: snap.location_id,
      location_name: snap.location_id ? (locNameById.get(snap.location_id as string) ?? null) : null,
      date: snap.date,
      proposed,
      existing,
      diffs,
      meta: {
        receipt_count: snap.receipt_count,
        sale_count: snap.sale_count,
        refund_count: snap.refund_count,
        cancelled_count: snap.cancelled_count,
        unmapped_line_items: snap.unmapped_line_items,
        unmapped_payments: snap.unmapped_payments,
      },
    };
  });

  // Also include unmapped stores without snapshots (if any)
  return Response.json({ date, count: preview.length, preview });
}
