import type { LoyverseReceipt } from "@/modules/loyverse-sandbox/types";

export type LoyverseSnapshot = {
  id: string;
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string; // YYYY-MM-DD
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
  created_at: string;
  updated_at: string;
};

export type LoyverseSnapshotRow = LoyverseSnapshot;

export type LoyverseSyncStatus = "running" | "completed" | "failed";

export type LoyverseSyncRun = {
  id: string;
  status: LoyverseSyncStatus;
  triggered_by: "manual" | "cron";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  total_accounts: number;
  total_stores: number;
  total_snapshots: number;
  per_account: Array<{
    account_key: string;
    stores: number;
    snapshots: number;
    error?: string;
  }>;
  error: string | null;
  created_at: string;
};

export type LoyverseSyncRunRow = LoyverseSyncRun;

export type SyncPerStoreResult = {
  store_id: string;
  location_id: string | null;
  date: string;
  snapshot: LoyverseSnapshot | null;
  error?: string;
};

export type SyncPerAccountResult = {
  account_key: string;
  stores_attempted: number;
  snapshots_upserted: number;
  per_store: SyncPerStoreResult[];
  error?: string;
  duration_ms: number;
};

export type SyncAllResult = {
  run_id: string;
  status: LoyverseSyncStatus;
  triggered_by: "manual" | "cron";
  started_at: string;
  finished_at: string;
  duration_ms: number;
  total_snapshots: number;
  per_account: SyncPerAccountResult[];
  error: string | null;
};

export type LoyverseShiftRawRow = {
  id: string;
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string;
  shifts: Record<string, unknown>[];
  shift_count: number;
  fetched_at: string;
  created_at: string;
  updated_at: string;
};

// Re-export for convenience
export type { LoyverseReceipt };
