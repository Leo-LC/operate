import { isLoyverseConfigured } from "@/lib/loyverse/client";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseAccess } from "@/modules/loyverse/lib/guard";

export async function GET(request: Request) {
  const guard = await requireLoyverseAccess();
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
  const bangkokEnd = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const effectiveEnd = date ?? bangkokEnd;
  const end = new Date(effectiveEnd + "T00:00:00Z");
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const startStr = start.toISOString().slice(0, 10);
  // Previous period of same length for delta: [prevStart, prevEnd] = [start - days, start -1]
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(start.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevEnd.getUTCDate() - (days - 1));
  const prevStartStr = prevStart.toISOString().slice(0, 10);
  const prevEndStr = prevEnd.toISOString().slice(0, 10);

  try {
    // Restricted users with no location access see nothing
    if (guard.allowedLocationIds !== null && guard.allowedLocationIds.length === 0) {
      return Response.json({
        date_range: { start: startStr, end: effectiveEnd, days },
        kpis: { revenue_total: 0, vat_7: 0, ticket_count: 0, receipt_count: 0, snacks_sold: 0, store_count: 0, avg_ticket: 0, delta_vs_week_ago_pct: null },
        per_store: [],
        snapshots: [],
      });
    }

    // Fetch current period + previous period for delta (single query)
    let query = supabase
      .from("loyverse_daily_snapshots")
      .select("*")
      .gte("date", prevStartStr)
      .lte("date", effectiveEnd)
      .order("date", { ascending: false })
      .order("store_id", { ascending: true })
      .limit(1500);

    if (guard.allowedLocationIds !== null) {
      query = query.in("location_id", guard.allowedLocationIds);
    }

    const { data: snapshots, error } = await query;

    if (error) throw error;

    const rows = snapshots ?? [];

    // Separate current period vs previous period
    const currentRows = rows.filter((r) => r.date >= startStr && r.date <= effectiveEnd);
    const prevRows = rows.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr);

    const ticketsSoldForRow = (r: Record<string, unknown>): number => {
      const ts = Number((r as { tickets_sold?: number }).tickets_sold ?? 0);
      // Fallback for rows before migration: use sale_count - refund_count
      if (ts > 0) return ts;
      const sc = Number((r as { sale_count?: number }).sale_count ?? 0);
      const rc = Number((r as { refund_count?: number }).refund_count ?? 0);
      return Math.max(0, sc - rc);
    };

    // Aggregate KPIs over current period (sum across all days in [start, end])
    const kpis = {
      revenue_total: currentRows.reduce((s, r) => s + Number(r.revenue_total ?? 0), 0),
      vat_7: currentRows.reduce((s, r) => s + Number(r.vat_7 ?? 0), 0),
      ticket_count: currentRows.reduce((s, r) => s + ticketsSoldForRow(r as Record<string, unknown>), 0),
      receipt_count: currentRows.reduce((s, r) => s + Number(r.receipt_count ?? 0), 0),
      snacks_sold: currentRows.reduce((s, r) => s + Number(r.snacks_sold ?? 0), 0),
      store_count: new Set(currentRows.map((r) => r.store_id)).size,
    };
    const avgTicket = kpis.ticket_count > 0 ? kpis.revenue_total / kpis.ticket_count : 0;

    // Per-store aggregated over current period
    type PerStoreAgg = {
      account_key: string;
      store_id: string;
      location_id: string | null;
      date: string;
      revenue_total: number;
      ticket_count: number;
      receipt_count: number;
      snacks_sold: number;
      avg_ticket: number;
      buckets: { drinks: number; ticket: number; snack: number; goodies: number; surcharge: number };
      payments: { cash: number; scan: number; credit_card: number };
      unmapped: { line_items: number; payments: number };
    };
    const agg = new Map<string, PerStoreAgg>();
    for (const r of currentRows) {
      const key = r.store_id as string;
      const existing = agg.get(key);
      const rev = Number(r.revenue_total ?? 0);
      const tc = ticketsSoldForRow(r as Record<string, unknown>);
      const rc = Number(r.receipt_count ?? 0);
      const ss = Number(r.snacks_sold ?? 0);
      const buckets = {
        drinks: Number(r.sales_drinks_net ?? 0),
        ticket: Number(r.sales_ticket_net ?? 0),
        snack: Number(r.sales_snack_net ?? 0),
        goodies: Number(r.sales_goodies_net ?? 0),
        surcharge: Number(r.sales_card_surcharge ?? 0),
      };
      const payments = {
        cash: Number(r.payment_cash ?? 0),
        scan: Number(r.payment_scan ?? 0),
        credit_card: Number(r.payment_credit_card ?? 0),
      };
      const unmapped = {
        line_items: Number(r.unmapped_line_items ?? 0),
        payments: Number(r.unmapped_payments ?? 0),
      };
      if (!existing) {
        agg.set(key, {
          account_key: r.account_key as string,
          store_id: r.store_id as string,
          location_id: (r.location_id as string | null) ?? null,
          date: effectiveEnd,
          revenue_total: rev,
          ticket_count: tc,
          receipt_count: rc,
          snacks_sold: ss,
          avg_ticket: 0,
          buckets: { ...buckets },
          payments: { ...payments },
          unmapped: { ...unmapped },
        });
      } else {
        existing.revenue_total += rev;
        existing.ticket_count += tc;
        existing.receipt_count += rc;
        existing.snacks_sold += ss;
        existing.buckets.drinks += buckets.drinks;
        existing.buckets.ticket += buckets.ticket;
        existing.buckets.snack += buckets.snack;
        existing.buckets.goodies += buckets.goodies;
        existing.buckets.surcharge += buckets.surcharge;
        existing.payments.cash += payments.cash;
        existing.payments.scan += payments.scan;
        existing.payments.credit_card += payments.credit_card;
        existing.unmapped.line_items += unmapped.line_items;
        existing.unmapped.payments += unmapped.payments;
      }
    }
    for (const v of Array.from(agg.values())) v.avg_ticket = v.ticket_count > 0 ? v.revenue_total / v.ticket_count : 0;
    const perStore = Array.from(agg.values());

    // Delta vs previous period (same duration, immediately preceding)
    const prevRevenue = prevRows.reduce((s, r) => s + Number(r.revenue_total ?? 0), 0);
    const deltaVsPrev = prevRevenue > 0 ? ((kpis.revenue_total - prevRevenue) / prevRevenue) * 100 : null;

    return Response.json({
      date_range: { start: startStr, end: effectiveEnd, days, prev_start: prevStartStr, prev_end: prevEndStr },
      kpis: { ...kpis, avg_ticket: avgTicket, delta_vs_week_ago_pct: deltaVsPrev, delta_vs_prev_period_pct: deltaVsPrev, prev_revenue_total: prevRevenue, prev_vat_7: prevRows.reduce((s, r) => s + Number(r.vat_7 ?? 0), 0) },
      per_store: perStore,
      snapshots: rows,
      prev_snapshots: prevRows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
