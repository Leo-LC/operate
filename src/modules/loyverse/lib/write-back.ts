import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

const AUTO_FILLABLE_FIELDS = [
  "sales_drinks_net",
  "sales_ticket_net",
  "sales_snack_net",
  "sales_goodies_net",
  "sales_card_surcharge",
  "vat_7",
  "payment_cash",
  "payment_scan",
  "payment_credit_card",
] as const;

export function isWriteBackEnabled(): boolean {
  return process.env.LOYVERSE_WRITE_ENABLED === "true";
}

function periodForDay(day: number): 1 | 2 | 3 {
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

export type WriteBackResult = {
  enabled: boolean;
  dryRun: boolean;
  date: string;
  daily_upserted: number;
  daily_skipped: number;
  location_upserted: number;
  location_skipped: number;
  errors: string[];
  details: Array<{
    store_id: string;
    location_id: string | null;
    action: "upserted" | "skipped" | "error";
    error?: string;
  }>;
};

export async function writeBackForDate(
  date: string,
  opts?: { dryRun?: boolean; force?: boolean },
): Promise<WriteBackResult> {
  const dryRun = opts?.dryRun ?? false;
  const force = opts?.force ?? false;

  if (!force && !isWriteBackEnabled()) {
    throw new Error("LOYVERSE_WRITE_ENABLED is not true — write-back is disabled (Phase 4 off).");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date ${date} — expected YYYY-MM-DD`);
  }

  const supabase = getSupabaseServerClient();

  const { data: snapshots, error: snapErr } = await supabase
    .from("loyverse_daily_snapshots")
    .select("*")
    .eq("date", date);

  if (snapErr) throw new Error(`Failed to load snapshots: ${snapErr.message}`);

  const rows = (snapshots ?? []).filter((r) => r.location_id);

  const result: WriteBackResult = {
    enabled: isWriteBackEnabled() || force,
    dryRun,
    date,
    daily_upserted: 0,
    daily_skipped: 0,
    location_upserted: 0,
    location_skipped: 0,
    errors: [],
    details: [],
  };

  if (rows.length === 0) {
    return result;
  }

  // Group snapshots by location for location_entries aggregation per month/period
  const byLocationPeriod = new Map<string, { location_id: string; month: string; period: 1 | 2 | 3; entry_count: number; snacks_sold: number }>();

  for (const snap of rows) {
    const location_id = snap.location_id as string;
    const day = Number(date.slice(8, 10));
    const period = periodForDay(day);
    const month = date.slice(0, 7);
    const key = `${location_id}|${month}|${period}`;
    // Entrées = quantité catégorie TICKETS (tickets_sold, pas receipts) — gère les spelling TICKETS/Ticket/entry et Samui A ENTRY
    const entry_count = Number(snap.tickets_sold ?? 0);
    const snacks_sold = Number(snap.snacks_sold ?? 0);
    const existing = byLocationPeriod.get(key);
    if (existing) {
      existing.entry_count += entry_count;
      existing.snacks_sold += snacks_sold;
    } else {
      byLocationPeriod.set(key, { location_id, month, period, entry_count, snacks_sold });
    }
  }

  for (const snap of rows) {
    const location_id = snap.location_id as string;

    try {
      // Fetch existing daily_entries row to preserve manual fields
      const { data: existing } = await supabase
        .from("daily_entries")
        .select("*")
        .eq("location_id", location_id)
        .eq("entry_date", date)
        .maybeSingle();

      const existingRow = (existing ?? {}) as Record<string, unknown>;

      // Build upsert payload: preserve manual fields, overwrite auto fields from snapshot
      const payload: Record<string, unknown> = {
        organization_id: DEFAULT_ORG_ID,
        location_id,
        entry_date: date,
        updated_at: new Date().toISOString(),
      };

      // Preserve existing manual fields if any, otherwise default 0/null
      // For auto fields, take snapshot values
      const snapVals: Record<string, number> = {
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

      for (const f of AUTO_FILLABLE_FIELDS) {
        payload[f] = snapVals[f] ?? 0;
      }

      // If row exists, keep its manual fields (exp_*, hr_*, etc.) — not overwriting
      // For new rows, manual fields default to 0 via DB defaults

      // Idempotency: skip if existing auto fields already match snapshot
      if (existing) {
        let same = true;
        for (const f of AUTO_FILLABLE_FIELDS) {
          const existingVal = Number(existingRow[f] ?? 0);
          const newVal = Number(payload[f] ?? 0);
          if (existingVal !== newVal) {
            same = false;
            break;
          }
        }
        if (same) {
          result.daily_skipped++;
          result.details.push({ store_id: snap.store_id as string, location_id, action: "skipped" });
          continue;
        }
      }

      if (!dryRun) {
        // Upsert: keep manual fields from existing if present
        const upsertRow: Record<string, unknown> = { ...payload };
        if (existing) {
          // Preserve manual fields from existing row
          for (const [k, v] of Object.entries(existingRow)) {
            if (!(k in upsertRow) && k !== "id" && k !== "created_at") {
              upsertRow[k] = v;
            }
          }
        }
        // Ensure required fields
        if (!existing) {
          upsertRow.created_at = new Date().toISOString();
        }

        const { error: upsertErr } = await supabase
          .from("daily_entries")
          .upsert(upsertRow as never, { onConflict: "location_id,entry_date" });

        if (upsertErr) throw new Error(upsertErr.message);
      }

      result.daily_upserted++;
      result.details.push({ store_id: snap.store_id as string, location_id, action: "upserted" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`${location_id}: ${msg}`);
      result.details.push({ store_id: snap.store_id as string, location_id, action: "error", error: msg });
    }
  }

  // Write location_entries per period (aggregated)
  for (const [, agg] of Array.from(byLocationPeriod.entries())) {
    try {
      // Fetch existing location_entries for idempotency check
      const { data: existing } = await supabase
        .from("location_entries")
        .select("entry_count, snacks_sold")
        .eq("location_id", agg.location_id)
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("month", agg.month)
        .eq("period", agg.period)
        .maybeSingle();

      if (existing) {
        const existingEc = Number((existing as { entry_count: number }).entry_count ?? 0);
        const existingSs = Number((existing as { snacks_sold: number }).snacks_sold ?? 0);
        // For location_entries, we sum across days in period — but our agg is only for single date
        // So we need to fetch all snapshots for that month/period to compute total, not just this date
        // For Phase 4 simplicity: overwrite with single-day agg if dryRun false, but better to sum
        // Let's compute total for period from all snapshots in that month/period
        const monthStart = `${agg.month}-01`;
        const monthEnd = agg.month === "12" ? `${Number(agg.month.slice(0, 4)) + 1}-01-01` : `${agg.month.slice(0, 5)}${String(Number(agg.month.slice(5, 7)) + 1).padStart(2, "0")}-01`;
        const { data: periodSnaps } = await supabase
          .from("loyverse_daily_snapshots")
          .select("sale_count, refund_count, snacks_sold, date")
          .eq("location_id", agg.location_id)
          .gte("date", monthStart)
          .lt("date", monthEnd);

        let totalEc = 0;
        let totalSs = 0;
        for (const ps of periodSnaps ?? []) {
          const d = Number((ps.date as string).slice(8, 10));
          if (periodForDay(d) !== agg.period) continue;
          totalEc += Number((ps as { tickets_sold?: number }).tickets_sold ?? 0);
          totalSs += Number(ps.snacks_sold ?? 0);
        }

        if (existingEc === totalEc && existingSs === totalSs) {
          result.location_skipped++;
          continue;
        }

        if (!dryRun) {
          const { error: upsertErr } = await supabase.from("location_entries").upsert(
            {
              location_id: agg.location_id,
              organization_id: DEFAULT_ORG_ID,
              month: agg.month,
              period: agg.period,
              entry_count: totalEc,
              snacks_sold: totalSs,
              synced_at: new Date().toISOString(),
            } as never,
            { onConflict: "location_id,organization_id,month,period" },
          );
          if (upsertErr) throw new Error(upsertErr.message);
        }
        result.location_upserted++;
      } else {
        // No existing row — insert aggregated totals (single date for now, will be completed as more dates sync)
        const { data: periodSnaps } = await supabase
          .from("loyverse_daily_snapshots")
          .select("tickets_sold, snacks_sold, date")
          .eq("location_id", agg.location_id)
          .gte("date", `${agg.month}-01`)
          .lt("date", agg.month === "12" ? `${Number(agg.month.slice(0, 4)) + 1}-01-01` : `${agg.month.slice(0, 5)}${String(Number(agg.month.slice(5, 7)) + 1).padStart(2, "0")}-01`);

        let totalEc = 0;
        let totalSs = 0;
        for (const ps of periodSnaps ?? []) {
          const d = Number((ps.date as string).slice(8, 10));
          if (periodForDay(d) !== agg.period) continue;
          totalEc += Number((ps as { tickets_sold?: number }).tickets_sold ?? 0);
          totalSs += Number(ps.snacks_sold ?? 0);
        }

        if (!dryRun) {
          const { error: upsertErr } = await supabase.from("location_entries").upsert(
            {
              location_id: agg.location_id,
              organization_id: DEFAULT_ORG_ID,
              month: agg.month,
              period: agg.period,
              entry_count: totalEc,
              snacks_sold: totalSs,
              synced_at: new Date().toISOString(),
            } as never,
            { onConflict: "location_id,organization_id,month,period" },
          );
          if (upsertErr) throw new Error(upsertErr.message);
        }
        result.location_upserted++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`location_entries ${agg.location_id} ${agg.month} p${agg.period}: ${msg}`);
    }
  }

  return result;
}

export async function writeBackForDates(
  dates: string[],
  opts?: { dryRun?: boolean; force?: boolean },
): Promise<WriteBackResult[]> {
  const results: WriteBackResult[] = [];
  for (const d of dates) {
    const r = await writeBackForDate(d, opts);
    results.push(r);
  }
  return results;
}
