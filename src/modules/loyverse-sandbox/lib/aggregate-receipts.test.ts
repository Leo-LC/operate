import { describe, expect, it } from "vitest";
import {
  aggregateReceipts,
  buildFieldDiffs,
  buildItemCategoryMap,
  computeCoverage,
  dateRangeForDay,
} from "./aggregate-receipts";
import type { LoyverseReceipt } from "../types";

function mkReceipt(overrides: Partial<LoyverseReceipt> = {}): LoyverseReceipt {
  return {
    receipt_number: "R-001",
    receipt_type: "SALE",
    receipt_date: "2026-08-23T10:00:00.000Z",
    created_at: "2026-08-23T10:00:00.000Z",
    store_id: "store-1",
    total_tax: 0,
    surcharge: 0,
    cancelled_at: null,
    line_items: [],
    payments: [],
    ...overrides,
  };
}

describe("aggregateReceipts", () => {
  const itemCategoryMap = new Map<string, string | null>([
    ["item-drink", "cat-drinks"],
    ["item-ticket", "cat-ticket"],
    ["item-snack", "cat-snack"],
  ]);
  const categoryNames = new Map<string, string>([
    ["cat-drinks", "Drinks"],
    ["cat-ticket", "Ticket Entry"],
    ["cat-snack", "Snacks"],
  ]);

  it("aggregates a single sale into drinks bucket and payment cash", () => {
    const receipts: LoyverseReceipt[] = [
      mkReceipt({
        line_items: [{ item_id: "item-drink", item_name: "Coffee", total_money: 100, quantity: 1 }],
        payments: [{ type: "cash", name: "Cash", money_amount: 100 }],
        total_tax: 7,
        surcharge: 2,
      }),
    ];
    const { proposed, challenges, meta } = aggregateReceipts(receipts, "2026-08-23", "store-1", itemCategoryMap, categoryNames);
    expect(proposed.sales_drinks_net).toBe(100);
    expect(proposed.vat_7).toBe(7);
    expect(proposed.sales_card_surcharge).toBe(2);
    expect(proposed.payment_cash).toBe(100);
    expect(challenges.entry_count).toBe(1);
    expect(meta.receipt_count).toBe(1);
    expect(meta.sale_count).toBe(1);
  });

  it("negates amounts for REFUND receipts (VAT, buckets, payments, snacks)", () => {
    const receipts: LoyverseReceipt[] = [
      mkReceipt({
        receipt_type: "REFUND",
        line_items: [{ item_id: "item-snack", item_name: "Snack", total_money: 50, quantity: 2 }],
        payments: [{ type: "cash", name: "Cash", money_amount: 50 }],
        total_tax: 3,
      }),
    ];
    const { proposed, challenges, meta } = aggregateReceipts(receipts, "2026-08-23", "store-1", itemCategoryMap, categoryNames);
    expect(proposed.sales_snack_net).toBe(-50);
    expect(proposed.vat_7).toBe(-3);
    expect(proposed.payment_cash).toBe(-50);
    expect(challenges.snacks_sold).toBe(0);
    expect(challenges.entry_count).toBe(-1);
    expect(meta.refund_count).toBe(1);
  });

  it("ignores cancelled receipts entirely (not counted, no amounts)", () => {
    const receipts: LoyverseReceipt[] = [
      mkReceipt({ cancelled_at: "2026-08-23T11:00:00.000Z", line_items: [{ item_id: "item-drink", total_money: 999 }], total_tax: 999 }),
      mkReceipt({ line_items: [{ item_id: "item-drink", total_money: 10 }], total_tax: 1 }),
    ];
    const { proposed, meta } = aggregateReceipts(receipts, "2026-08-23", "store-1", itemCategoryMap, categoryNames);
    expect(proposed.sales_drinks_net).toBe(10);
    expect(proposed.vat_7).toBe(1);
    expect(meta.cancelled_count).toBe(1);
    expect(meta.receipt_count).toBe(1);
  });

  it("distributes line items across all sales buckets via category names", () => {
    const receipts: LoyverseReceipt[] = [
      mkReceipt({
        line_items: [
          { item_id: "item-drink", total_money: 10 },
          { item_id: "item-ticket", total_money: 20 },
          { item_id: "item-snack", total_money: 30, quantity: 3 },
          { item_id: "unknown-item", item_name: "T-Shirt Merch", total_money: 40 },
        ],
      }),
    ];
    const map = new Map<string, string | null>([
      ["item-drink", "cat-drinks"],
      ["item-ticket", "cat-ticket"],
      ["item-snack", "cat-snack"],
    ]);
    const cats = new Map<string, string>([
      ["cat-drinks", "Drinks"],
      ["cat-ticket", "Ticket"],
      ["cat-snack", "Snacks & Food"],
    ]);
    const { proposed, challenges } = aggregateReceipts(receipts, "2026-08-23", "store-1", map, cats);
    expect(proposed.sales_drinks_net).toBe(10);
    expect(proposed.sales_ticket_net).toBe(20);
    expect(proposed.sales_snack_net).toBe(30);
    expect(proposed.sales_goodies_net).toBe(40);
    expect(challenges.snacks_sold).toBe(3);
  });

  it("counts snacks_sold from snack quantity, clamps to 0 after refunds", () => {
    const receipts: LoyverseReceipt[] = [
      mkReceipt({ line_items: [{ item_id: "item-snack", total_money: 30, quantity: 5 }] }),
      mkReceipt({ receipt_type: "REFUND", line_items: [{ item_id: "item-snack", total_money: 30, quantity: 5 }] }),
      mkReceipt({ receipt_type: "REFUND", line_items: [{ item_id: "item-snack", total_money: 30, quantity: 1 }] }),
    ];
    const { challenges } = aggregateReceipts(receipts, "2026-08-23", "store-1", itemCategoryMap, categoryNames);
    expect(challenges.snacks_sold).toBe(0);
  });

  it("buckets payments by type/name keywords and counts unmapped", () => {
    const receipts: LoyverseReceipt[] = [
      mkReceipt({
        payments: [
          { type: "cash", money_amount: 100 },
          { type: "qr", name: "PromptPay", money_amount: 50 },
          { type: "card", name: "Visa", money_amount: 70 },
          { type: "unknown", name: "Mystery", money_amount: 9 },
        ],
      }),
    ];
    const { proposed, meta } = aggregateReceipts(receipts, "2026-08-23", "store-1", itemCategoryMap, categoryNames);
    expect(proposed.payment_cash).toBe(100);
    expect(proposed.payment_scan).toBe(50);
    expect(proposed.payment_credit_card).toBe(70);
    expect(meta.unmapped_payments).toBe(1);
  });

  it("filters by store_id and date (receipt_date slice)", () => {
    const receipts: LoyverseReceipt[] = [
      mkReceipt({ store_id: "store-1", receipt_date: "2026-08-23T23:00:00+07:00", line_items: [{ item_id: "item-drink", total_money: 10 }] }),
      mkReceipt({ store_id: "store-1", receipt_date: "2026-08-24T01:00:00+07:00", line_items: [{ item_id: "item-drink", total_money: 99 }] }),
      mkReceipt({ store_id: "store-2", receipt_date: "2026-08-23T12:00:00+07:00", line_items: [{ item_id: "item-drink", total_money: 99 }] }),
    ];
    const { proposed } = aggregateReceipts(receipts, "2026-08-23", "store-1", itemCategoryMap, categoryNames);
    expect(proposed.sales_drinks_net).toBe(10);
  });

  it("counts unmapped line items when bucket resolves to other", () => {
    const receipts: LoyverseReceipt[] = [
      mkReceipt({ line_items: [{ item_id: "item-unknown", item_name: "Unmapped Thing", total_money: 123 }] }),
    ];
    const { meta } = aggregateReceipts(receipts, "2026-08-23", "store-1", new Map(), new Map());
    expect(meta.unmapped_line_items).toBe(1);
  });
});

describe("dateRangeForDay", () => {
  it("returns Bangkok-offset bounds for a given date", () => {
    const range = dateRangeForDay("2026-08-23");
    expect(range.created_at_min).toBe("2026-08-23T00:00:00+07:00");
    expect(range.created_at_max).toBe("2026-08-23T23:59:59.999+07:00");
  });
});

describe("buildItemCategoryMap", () => {
  it("maps item.id -> category_id", () => {
    const map = buildItemCategoryMap([
      { id: "i1", item_name: "A", category_id: "c1" },
      { id: "i2", item_name: "B", category_id: null },
      { id: "i3", item_name: "C" },
    ]);
    expect(map.get("i1")).toBe("c1");
    expect(map.get("i2")).toBe(null);
    expect(map.get("i3")).toBe(null);
  });
});

describe("computeCoverage", () => {
  it("reports auto-fillable vs manual coverage", () => {
    const cov = computeCoverage();
    expect(cov.auto_fillable_count).toBe(9);
    expect(cov.total_trackable).toBeGreaterThan(cov.auto_fillable_count);
    expect(cov.percent).toBe(Math.round((9 / cov.total_trackable) * 100));
  });
});

describe("buildFieldDiffs", () => {
  it("computes deltas vs existing entry, null when no existing", () => {
    const diffs = buildFieldDiffs(
      { sales_drinks_net: 100, sales_ticket_net: 0, sales_snack_net: 0, sales_goodies_net: 0, sales_card_surcharge: 0, vat_7: 7, payment_cash: 50, payment_scan: 0, payment_credit_card: 0 },
      { sales_drinks_net: 90, vat_7: 7, payment_cash: 50 },
    );
    const drinks = diffs.find((d) => d.field === "sales_drinks_net")!;
    expect(drinks.proposed).toBe(100);
    expect(drinks.existing).toBe(90);
    expect(drinks.delta).toBe(10);
    const snack = diffs.find((d) => d.field === "sales_snack_net")!;
    expect(snack.existing).toBe(null);
    expect(snack.delta).toBe(null);
  });
});
