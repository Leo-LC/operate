import { describe, expect, it } from "vitest";
import { groupStoresByLocation, type StoreEntry } from "./group-stores";

function entry(over: Partial<StoreEntry> & { store_id: string }): StoreEntry {
  return {
    account_key: "pattaya",
    location_id: null,
    date: "2026-10-11",
    revenue_total: 0,
    ticket_count: 0,
    receipt_count: 0,
    snacks_sold: 0,
    avg_ticket: 0,
    buckets: { drinks: 0, ticket: 0, snack: 0, goodies: 0, surcharge: 0 },
    payments: { cash: 0, scan: 0, credit_card: 0 },
    unmapped: { line_items: 0, payments: 0 },
    ...over,
  };
}

describe("groupStoresByLocation", () => {
  it("merges old + new POS of the same location into one shop", () => {
    const groups = groupStoresByLocation([
      entry({ store_id: "old", location_id: "loc-pattaya", revenue_total: 100, receipt_count: 2, ticket_count: 2 }),
      entry({ store_id: "new", location_id: "loc-pattaya", revenue_total: 4950, receipt_count: 8, ticket_count: 8 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].groupKey).toBe("loc-pattaya");
    expect(groups[0].revenue_total).toBe(5050);
    expect(groups[0].receipt_count).toBe(10);
    expect(groups[0].store_ids).toEqual(["old", "new"]);
    // Representative store = most receipts (the new POS).
    expect(groups[0].store_id).toBe("new");
  });

  it("keeps unmapped stores as their own group (today's behavior)", () => {
    const groups = groupStoresByLocation([
      entry({ store_id: "a", account_key: "laguna", revenue_total: 10 }),
      entry({ store_id: "b", account_key: "samui", revenue_total: 20 }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.groupKey).sort()).toEqual(["a", "b"]);
  });

  it("mixes mapped and unmapped rows correctly", () => {
    const groups = groupStoresByLocation([
      entry({ store_id: "old", location_id: "loc-pattaya", revenue_total: 5 }),
      entry({ store_id: "zzz", location_id: null, account_key: "other", revenue_total: 7 }),
    ]);
    expect(groups).toHaveLength(2);
  });
});
