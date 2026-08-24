import { isLoyverseConfigured } from "@/lib/loyverse/client";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseOwner } from "@/modules/loyverse/lib/guard";

export async function GET(request: Request) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  if (!isLoyverseConfigured()) {
    return Response.json({ error: "Loyverse not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const daysParam = url.searchParams.get("days");
  const days = Math.min(30, Math.max(1, Number(daysParam ?? "7")));

  const supabase = getSupabaseServerClient();

  // Compute date range ending at `date` or today (Bangkok)
  const endDateStr = date ?? new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  // Actually use Bangkok date; simpler: derive from Date with +7 offset
  const bangkokEnd = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const effectiveEnd = date ?? bangkokEnd;
  const end = new Date(effectiveEnd + "T00:00:00Z");
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const startStr = start.toISOString().slice(0, 10);

  try {
    const { data: snapshots, error } = await supabase
      .from("loyverse_daily_snapshots")
      .select("*")
      .gte("date", startStr)
      .lte("date", effectiveEnd)
      .order("date", { ascending: false })
      .order("store_id", { ascending: true })
      .limit(1000);

    if (error) throw error;

    const rows = snapshots ?? [];

    // Aggregate KPIs for the end date (today) for dashboard header
    const todayRows = rows.filter((r) => r.date === effectiveEnd);
    const kpis = {
      revenue_total: todayRows.reduce((s, r) => s + Number(r.revenue_total ?? 0), 0),
      vat_7: todayRows.reduce((s, r) => s + Number(r.vat_7 ?? 0), 0),
      ticket_count: todayRows.reduce((s, r) => s + Number(r.sale_count ?? 0) - Number(r.refund_count ?? 0), 0),
      receipt_count: todayRows.reduce((s, r) => s + Number(r.receipt_count ?? 0), 0),
      snacks_sold: todayRows.reduce((s, r) => s + Number(r.snacks_sold ?? 0), 0),
      store_count: todayRows.length,
    };
    const avgTicket = kpis.ticket_count > 0 ? kpis.revenue_total / kpis.ticket_count : 0;

    // Per-store cards for end date
    const perStore = todayRows.map((r) => ({
      account_key: r.account_key,
      store_id: r.store_id,
      location_id: r.location_id,
      date: r.date,
      revenue_total: Number(r.revenue_total),
      ticket_count: Number(r.sale_count) - Number(r.refund_count),
      receipt_count: Number(r.receipt_count),
      snacks_sold: Number(r.snacks_sold),
      avg_ticket: Number(r.avg_ticket),
      buckets: {
        drinks: Number(r.sales_drinks_net),
        ticket: Number(r.sales_ticket_net),
        snack: Number(r.sales_snack_net),
        goodies: Number(r.sales_goodies_net),
        surcharge: Number(r.sales_card_surcharge),
      },
      payments: {
        cash: Number(r.payment_cash),
        scan: Number(r.payment_scan),
        credit_card: Number(r.payment_credit_card),
      },
      unmapped: {
        line_items: Number(r.unmapped_line_items),
        payments: Number(r.unmapped_payments),
      },
    }));

    // J-7 comparison for delta
    const weekAgo = new Date(end);
    weekAgo.setUTCDate(end.getUTCDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);
    const { data: weekAgoRows } = await supabase
      .from("loyverse_daily_snapshots")
      .select("revenue_total")
      .eq("date", weekAgoStr);

    const weekAgoRevenue = (weekAgoRows ?? []).reduce((s, r) => s + Number(r.revenue_total ?? 0), 0);
    const deltaVsWeekAgo = weekAgoRevenue > 0 ? ((kpis.revenue_total - weekAgoRevenue) / weekAgoRevenue) * 100 : null;

    return Response.json({
      date_range: { start: startStr, end: effectiveEnd, days },
      kpis: { ...kpis, avg_ticket: avgTicket, delta_vs_week_ago_pct: deltaVsWeekAgo },
      per_store: perStore,
      snapshots: rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
