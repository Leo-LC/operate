/**
 * Group per-store entries by shop (Nexus location).
 *
 * A shop can span several Loyverse stores over time (e.g. Pattaya old POS +
 * new POS = the SAME shop). Grouping by `location_id` (fallback: `store_id`
 * for unmapped rows) keeps ONE card per shop with continuous history, while
 * overlapping cutover dates sum naturally (old + new sales = shop total).
 */

export type StoreBuckets = {
  drinks: number;
  ticket: number;
  snack: number;
  goodies: number;
  surcharge: number;
};

export type StorePayments = {
  cash: number;
  scan: number;
  credit_card: number;
};

export type StoreEntry = {
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string;
  revenue_total: number;
  ticket_count: number;
  receipt_count: number;
  snacks_sold: number;
  avg_ticket: number;
  buckets: StoreBuckets;
  payments: StorePayments;
  unmapped: { line_items: number; payments: number };
};

export type GroupedStore = StoreEntry & {
  /** location_id when mapped, otherwise store_id (unchanged single-store behavior). */
  groupKey: string;
  store_ids: string[];
};

export function groupKeyFor(e: Pick<StoreEntry, "location_id" | "store_id">): string {
  return e.location_id ?? e.store_id;
}

function zeroBuckets(): StoreBuckets {
  return { drinks: 0, ticket: 0, snack: 0, goodies: 0, surcharge: 0 };
}

function zeroPayments(): StorePayments {
  return { cash: 0, scan: 0, credit_card: 0 };
}

export function groupStoresByLocation(entries: StoreEntry[]): GroupedStore[] {
  const byGroup = new Map<string, StoreEntry[]>();
  for (const e of entries) {
    const k = groupKeyFor(e);
    const arr = byGroup.get(k);
    if (arr) arr.push(e);
    else byGroup.set(k, [e]);
  }
  return Array.from(byGroup.entries()).map(([groupKey, members]) => mergeMembers(groupKey, members));
}

function mergeMembers(groupKey: string, members: StoreEntry[]): GroupedStore {
  const first = members[0];
  // Representative store = most receipts in range (e.g. the new POS going forward).
  let rep = first;
  for (const m of members) {
    if (m.receipt_count > rep.receipt_count) rep = m;
  }
  // Label = account with most revenue (stable when a shop spans one account).
  let label = first;
  for (const m of members) {
    if (m.revenue_total > label.revenue_total) label = m;
  }
  const buckets = zeroBuckets();
  const payments = zeroPayments();
  let revenue_total = 0;
  let ticket_count = 0;
  let receipt_count = 0;
  let snacks_sold = 0;
  let line_items = 0;
  let pays = 0;
  const store_ids: string[] = [];
  for (const m of members) {
    revenue_total += m.revenue_total;
    ticket_count += m.ticket_count;
    receipt_count += m.receipt_count;
    snacks_sold += m.snacks_sold;
    line_items += m.unmapped.line_items;
    pays += m.unmapped.payments;
    buckets.drinks += m.buckets.drinks;
    buckets.ticket += m.buckets.ticket;
    buckets.snack += m.buckets.snack;
    buckets.goodies += m.buckets.goodies;
    buckets.surcharge += m.buckets.surcharge;
    payments.cash += m.payments.cash;
    payments.scan += m.payments.scan;
    payments.credit_card += m.payments.credit_card;
    store_ids.push(m.store_id);
  }
  return {
    account_key: label.account_key,
    store_id: rep.store_id,
    location_id: first.location_id,
    date: first.date,
    revenue_total,
    ticket_count,
    receipt_count,
    snacks_sold,
    avg_ticket: ticket_count > 0 ? revenue_total / ticket_count : 0,
    buckets,
    payments,
    unmapped: { line_items, payments: pays },
    groupKey,
    store_ids,
  };
}
