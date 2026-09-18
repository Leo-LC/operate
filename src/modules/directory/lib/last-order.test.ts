import { describe, expect, it } from "vitest";
import { computeLastOrderedAt, computeLastOrders } from "@/modules/directory/lib/last-order";
import type { SupplierOrder } from "@/modules/directory/types";

function order(partial: Partial<SupplierOrder>): SupplierOrder {
  return {
    id: "o1",
    contact_id: "c1",
    product_name: "Milk",
    qty: null,
    unit: "L",
    unit_price: 60,
    total: null,
    ordered_at: "2026-09-01",
    notes: null,
    ...partial,
  };
}

describe("computeLastOrders", () => {
  it("keeps the most recent row per product (case-insensitive)", () => {
    const rows = [
      order({ id: "a", product_name: "Milk", unit_price: 55, ordered_at: "2026-08-01" }),
      order({ id: "b", product_name: "milk", unit_price: 62, ordered_at: "2026-09-10" }),
      order({ id: "c", product_name: "Coffee beans", unit_price: 400, ordered_at: "2026-09-05" }),
    ];
    const result = computeLastOrders(rows);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.product_name.toLowerCase() === "milk")).toMatchObject({
      unit_price: 62,
      ordered_at: "2026-09-10",
    });
  });

  it("returns empty array when no orders", () => {
    expect(computeLastOrders([])).toEqual([]);
  });
});

describe("computeLastOrderedAt", () => {
  it("returns the latest date", () => {
    const rows = [
      order({ ordered_at: "2026-08-01" }),
      order({ id: "b", ordered_at: "2026-09-10" }),
    ];
    expect(computeLastOrderedAt(rows)).toBe("2026-09-10");
  });

  it("returns null when no orders", () => {
    expect(computeLastOrderedAt([])).toBeNull();
  });
});
