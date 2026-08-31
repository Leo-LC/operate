import { getAccounts, type Account } from "@/lib/loyverse/accounts";
import { fetchCatalogWithCache } from "@/lib/loyverse/catalog-cache";
import { loyverseFetch, loyverseFetchAll, LoyverseApiError } from "@/lib/loyverse/client";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { aggregateReceipts, dateRangeForDay } from "@/modules/loyverse-sandbox/lib/aggregate-receipts";
import { getLocationIdForStoreAsync } from "./store-mapping";
import type { LoyverseReceipt, LoyverseStore } from "@/modules/loyverse-sandbox/types";
import { LOYVERSE_SYNC_CONCURRENCY } from "../config";
import type { SyncAllResult, SyncPerAccountResult, SyncPerStoreResult } from "../types";

export type LoyverseShiftRaw = Record<string, unknown> & { id: string; store_id?: string };

function getBangkokDates(count: number): string[] {
  const dates: string[] = [];
  const bangkokNowMs = Date.now() + 7 * 60 * 60 * 1000;
  for (let i = 0; i < count; i++) {
    const ms = bangkokNowMs - i * 24 * 60 * 60 * 1000;
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

async function getMissingDatesForBackfill(): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const last30 = getBangkokDates(30);
  try {
    const [snapRes, shiftsRes] = await Promise.all([
      supabase.from("loyverse_daily_snapshots").select("date").gte("date", last30[last30.length - 1]).lte("date", last30[0]),
      supabase.from("loyverse_shifts_raw").select("date").gte("date", last30[last30.length - 1]).lte("date", last30[0]),
    ]);
    const existingSnap = new Set((snapRes.data ?? []).map((r) => r.date as string));
    const existingShifts = new Set((shiftsRes.data ?? []).map((r) => r.date as string));
    const missing = last30.filter((d) => !existingSnap.has(d) || !existingShifts.has(d));
    const mustInclude = getBangkokDates(2);
    for (const d of mustInclude) if (!missing.includes(d)) missing.push(d);
    return Array.from(new Set(missing)).sort().reverse().slice(0, 30);
  } catch {
    return getBangkokDates(2);
  }
}

function pLimit<T>(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    active--;
    if (queue.length > 0) {
      const fn = queue.shift()!;
      fn();
    }
  };
  return (fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then(resolve, reject)
          .finally(next);
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
}

async function upsertSnapshot(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  snapshot: {
    account_key: string;
    store_id: string;
    location_id: string | null;
    date: string;
    sales_drinks_net: number;
    sales_ticket_net: number;
    sales_snack_net: number;
    sales_goodies_net: number;
    sales_card_surcharge: number;
    vat_7: number;
    payment_cash: number;
    payment_scan: number;
    payment_credit_card: number;
    receipt_count: number;
    sale_count: number;
    refund_count: number;
    cancelled_count: number;
    revenue_total: number;
    snacks_sold: number;
    tickets_sold: number;
    avg_ticket: number;
    unmapped_line_items: number;
    unmapped_payments: number;
  },
) {
  const { error } = await supabase.from("loyverse_daily_snapshots").upsert(
    {
      ...snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_key,store_id,date" },
  );
  if (error) throw error;
}

async function upsertShiftsRaw(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  row: {
    account_key: string;
    store_id: string;
    location_id: string | null;
    date: string;
    shifts: LoyverseShiftRaw[];
  },
) {
  const { error } = await supabase.from("loyverse_shifts_raw").upsert(
    {
      account_key: row.account_key,
      store_id: row.store_id,
      location_id: row.location_id,
      date: row.date,
      shifts: row.shifts as unknown as never,
      shift_count: row.shifts.length,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_key,store_id,date" },
  );
  if (error) throw error;
}

async function syncShiftsForStoreDate(
  account: Account,
  storeId: string,
  date: string,
  supabase: ReturnType<typeof getSupabaseServerClient>,
  location_id: string | null,
): Promise<{ stored: boolean; shift_count: number; error?: string }> {
  const range = dateRangeForDay(date);
  try {
    const shifts = await loyverseFetchAll<LoyverseShiftRaw>(account, "/shifts", "shifts", {
      store_ids: storeId,
      created_at_min: range.created_at_min,
      created_at_max: range.created_at_max,
    });
    await upsertShiftsRaw(supabase, {
      account_key: account.key,
      store_id: storeId,
      location_id,
      date,
      shifts,
    });
    return { stored: true, shift_count: shifts.length };
  } catch (err) {
    const body = err instanceof LoyverseApiError ? (err.body ? ` ${JSON.stringify(err.body).slice(0, 300)}` : "") : "";
    const message = err instanceof LoyverseApiError ? `${err.message}${body} (${err.status})` : err instanceof Error ? err.message : String(err);
    return { stored: false, shift_count: 0, error: message };
  }
}

async function syncStoreDate(
  account: Account,
  storeId: string,
  date: string,
  catalog: Awaited<ReturnType<typeof fetchCatalogWithCache>>,
  supabase: ReturnType<typeof getSupabaseServerClient>,
  location_id: string | null,
): Promise<SyncPerStoreResult> {
  const range = dateRangeForDay(date);

  try {
    const receipts = await loyverseFetchAll<LoyverseReceipt>(account, "/receipts", "receipts", {
      store_id: storeId,
      created_at_min: range.created_at_min,
      created_at_max: range.created_at_max,
    });

    const { proposed, challenges, meta } = aggregateReceipts(
      receipts,
      date,
      storeId,
      catalog.itemCategoryMap,
      catalog.categoryNames,
    );

    const revenue_total =
      proposed.sales_drinks_net +
      proposed.sales_ticket_net +
      proposed.sales_snack_net +
      proposed.sales_goodies_net +
      proposed.sales_card_surcharge;

    const ticketsSold = challenges.tickets_sold;
    const avg_ticket = ticketsSold > 0 ? revenue_total / ticketsSold : 0;

    const row = {
      account_key: account.key,
      store_id: storeId,
      location_id,
      date,
      sales_drinks_net: proposed.sales_drinks_net,
      sales_ticket_net: proposed.sales_ticket_net,
      sales_snack_net: proposed.sales_snack_net,
      sales_goodies_net: proposed.sales_goodies_net,
      sales_card_surcharge: proposed.sales_card_surcharge,
      vat_7: proposed.vat_7,
      payment_cash: proposed.payment_cash,
      payment_scan: proposed.payment_scan,
      payment_credit_card: proposed.payment_credit_card,
      receipt_count: meta.receipt_count,
      sale_count: meta.sale_count,
      refund_count: meta.refund_count,
      cancelled_count: meta.cancelled_count,
      revenue_total,
      snacks_sold: challenges.snacks_sold,
      tickets_sold: challenges.tickets_sold,
      avg_ticket,
      unmapped_line_items: meta.unmapped_line_items,
      unmapped_payments: meta.unmapped_payments,
    };

    await upsertSnapshot(supabase, row);

    return {
      store_id: storeId,
      location_id,
      date,
      snapshot: {
        id: "",
        account_key: row.account_key,
        store_id: row.store_id,
        location_id: row.location_id,
        date: row.date,
        sales_drinks_net: row.sales_drinks_net,
        sales_ticket_net: row.sales_ticket_net,
        sales_snack_net: row.sales_snack_net,
        sales_goodies_net: row.sales_goodies_net,
        sales_card_surcharge: row.sales_card_surcharge,
        vat_7: row.vat_7,
        payment_cash: row.payment_cash,
        payment_scan: row.payment_scan,
        payment_credit_card: row.payment_credit_card,
        receipt_count: row.receipt_count,
        sale_count: row.sale_count,
        refund_count: row.refund_count,
        cancelled_count: row.cancelled_count,
        revenue_total: row.revenue_total,
        snacks_sold: row.snacks_sold,
        tickets_sold: row.tickets_sold,
        avg_ticket: row.avg_ticket,
        unmapped_line_items: row.unmapped_line_items,
        unmapped_payments: row.unmapped_payments,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    const body = err instanceof LoyverseApiError ? (err.body ? ` ${JSON.stringify(err.body).slice(0, 500)}` : "") : "";
    const message = err instanceof LoyverseApiError ? `${err.message}${body} (${err.status})` : err instanceof Error ? err.message : String(err);
    return { store_id: storeId, location_id, date, snapshot: null, error: message };
  }
}

async function syncAccount(
  account: Account,
  dates: string[],
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<SyncPerAccountResult> {
  const start = Date.now();
  try {
    const storesData = await loyverseFetch<{ stores: LoyverseStore[] }>(account, "/stores", { limit: 50 });
    const stores = storesData.stores ?? [];
    if (stores.length === 0) {
      return {
        account_key: account.key,
        stores_attempted: 0,
        snapshots_upserted: 0,
        per_store: [],
        error: "No stores returned for account",
        duration_ms: Date.now() - start,
      };
    }

    let catalog;
    try {
      catalog = await fetchCatalogWithCache(account);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        account_key: account.key,
        stores_attempted: stores.length,
        snapshots_upserted: 0,
        per_store: [],
        error: `Catalog fetch failed: ${msg}`,
        duration_ms: Date.now() - start,
      };
    }

    const per_store: SyncPerStoreResult[] = [];
    let snapshots_upserted = 0;
    const bangkokToday = getBangkokDates(1)[0];

    for (const store of stores) {
      const location_id = await getLocationIdForStoreAsync(store.id);

      let datesForStore = dates;
      try {
        const [snapRes, shiftsRes] = await Promise.all([
          supabase
            .from("loyverse_daily_snapshots")
            .select("date")
            .eq("account_key", account.key)
            .eq("store_id", store.id)
            .in("date", dates),
          supabase
            .from("loyverse_shifts_raw")
            .select("date")
            .eq("account_key", account.key)
            .eq("store_id", store.id)
            .in("date", dates),
        ]);
        const existingSnapSet = new Set((snapRes.data ?? []).map((r) => r.date as string));
        const existingShiftSet = new Set((shiftsRes.data ?? []).map((r) => r.date as string));

        if (existingShiftSet.size === 0 && dates.length <= 2) {
          const backfill = getBangkokDates(30);
          const extra = backfill.filter((d) => !dates.includes(d));
          datesForStore = [...dates, ...extra];
        } else if (existingSnapSet.size === 0 && dates.length <= 2) {
          const backfill = getBangkokDates(30);
          const extra = backfill.filter((d) => !dates.includes(d));
          datesForStore = [...dates, ...extra];
        } else {
          datesForStore = dates.filter((d) => {
            if (d === bangkokToday) return true;
            return !existingSnapSet.has(d) || !existingShiftSet.has(d);
          });
          if (datesForStore.length === 0) datesForStore = [bangkokToday];
        }
      } catch {
        datesForStore = dates;
      }

      for (const date of datesForStore) {
        const res = await syncStoreDate(account, store.id, date, catalog, supabase, location_id);
        per_store.push(res);
        if (res.snapshot) snapshots_upserted++;
        const shiftRes = await syncShiftsForStoreDate(account, store.id, date, supabase, location_id);
        if (shiftRes.error) {
          const target = per_store[per_store.length - 1];
          if (target) target.error = [target.error, `shifts: ${shiftRes.error}`].filter(Boolean).join(" | ");
        }
      }
    }

    return {
      account_key: account.key,
      stores_attempted: stores.length,
      snapshots_upserted,
      per_store,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof LoyverseApiError ? `${err.message} (${err.status})` : err instanceof Error ? err.message : String(err);
    return {
      account_key: account.key,
      stores_attempted: 0,
      snapshots_upserted: 0,
      per_store: [],
      error: message,
      duration_ms: Date.now() - start,
    };
  }
}

export async function syncAllLoyverse(opts?: {
  triggeredBy?: "manual" | "cron";
  dates?: string[];
  days?: number;
  backfill?: boolean;
}): Promise<SyncAllResult> {
  const triggeredBy = opts?.triggeredBy ?? "manual";
  let dates = opts?.dates;
  if (!dates && opts?.days) {
    dates = getBangkokDates(Math.min(30, Math.max(1, opts.days)));
  }
  if (!dates && opts?.backfill) {
    // Backfill: find missing dates in last 30d (J..J-29) per DB, else sync those missing
    dates = await getMissingDatesForBackfill();
  }
  if (!dates) dates = getBangkokDates(2);
  const started_at = new Date().toISOString();
  const startMs = Date.now();
  const supabase = getSupabaseServerClient();

  const accounts = getAccounts();
  if (accounts.length === 0) {
    throw new LoyverseApiError("No Loyverse accounts configured (LOYVERSE_ACCOUNTS / LOYVERSE_ACCESS_TOKEN)", 503);
  }

  // Insert running row
  const { data: runRow, error: insertErr } = await supabase
    .from("loyverse_sync_runs")
    .insert({
      status: "running",
      triggered_by: triggeredBy,
      started_at,
      total_accounts: accounts.length,
    })
    .select("id")
    .single();

  if (insertErr || !runRow) {
    throw new Error(`Failed to create sync run: ${insertErr?.message ?? "no id"}`);
  }

  const run_id = runRow.id as string;

  const limit = pLimit<SyncPerAccountResult>(LOYVERSE_SYNC_CONCURRENCY);
  const finalDates = dates ?? getBangkokDates(2);
  const per_account = await Promise.all(accounts.map((acc) => limit(() => syncAccount(acc, finalDates, supabase))));

  const total_snapshots = per_account.reduce((s, a) => s + a.snapshots_upserted, 0);
  const total_stores = per_account.reduce((s, a) => s + a.stores_attempted, 0);
  const hasErrors = per_account.some((a) => a.error);
  const finished_at = new Date().toISOString();
  const duration_ms = Date.now() - startMs;
  const status = hasErrors && total_snapshots === 0 ? "failed" : "completed";
  const error = hasErrors
    ? per_account
        .filter((a) => a.error)
        .map((a) => `${a.account_key}: ${a.error}`)
        .join("; ")
    : null;

  const per_account_json = per_account.map((a) => ({
    account_key: a.account_key,
    stores: a.stores_attempted,
    snapshots: a.snapshots_upserted,
    error: a.error,
  }));

  await supabase
    .from("loyverse_sync_runs")
    .update({
      status,
      finished_at,
      duration_ms,
      total_accounts: accounts.length,
      total_stores,
      total_snapshots,
      per_account: per_account_json,
      error,
    })
    .eq("id", run_id);

  return {
    run_id,
    status,
    triggered_by: triggeredBy,
    started_at,
    finished_at,
    duration_ms,
    total_snapshots,
    per_account,
    error,
  };
}
