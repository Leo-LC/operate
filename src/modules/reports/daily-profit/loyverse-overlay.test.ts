import { describe, expect, it } from "vitest";
import { applyLoyverseOverlay, toSnapshotSale } from "./loyverse-overlay";
import type { SourceDailyEntry } from "./types";

function sheetEntry(overrides: Partial<SourceDailyEntry> = {}): SourceDailyEntry {
  return {
    locationId: "loc-1",
    date: "2026-09-24",
    revenue: 1000,
    vat: 70,
    directExpenses: 200,
    hrCash: 50,
    cashIn: 900,
    ...overrides,
  };
}

describe("toSnapshotSale", () => {
  it("sums the sales fields like the sheet revenue", () => {
    const snap = toSnapshotSale({
      location_id: "loc-1",
      date: "2026-09-24",
      sales_drinks_net: 500,
      sales_ticket_net: 300,
      sales_snack_net: 100,
      sales_goodies_net: 50,
      sales_card_surcharge: 10,
      vat_7: 67,
      payment_cash: 400,
      payment_scan: 300,
      payment_credit_card: 260,
    });
    expect(snap).toMatchObject({ locationId: "loc-1", date: "2026-09-24", revenue: 960, vat: 67, cashIn: 960 });
  });

  it("rejects rows without location or with invalid date", () => {
    expect(toSnapshotSale({ location_id: null, date: "2026-09-24" })).toBeNull();
    expect(toSnapshotSale({ location_id: "loc-1", date: "not-a-date" })).toBeNull();
  });
});

describe("applyLoyverseOverlay", () => {
  it("fills days with Loyverse sales but no accounting entry", () => {
    const map = new Map<string, SourceDailyEntry>();
    const only = applyLoyverseOverlay(map, [{ locationId: "loc-1", date: "2026-09-24", revenue: 960, vat: 67, cashIn: 960 }]);
    const entry = map.get("loc-1:2026-09-24");
    expect(entry).toMatchObject({ revenue: 960, vat: 67, cashIn: 960, directExpenses: 0, hrCash: 0 });
    expect(only.has("loc-1:2026-09-24")).toBe(true);
  });

  it("overrides sheet sales but preserves sheet expenses", () => {
    const map = new Map<string, SourceDailyEntry>([["loc-1:2026-09-24", sheetEntry()]]);
    const only = applyLoyverseOverlay(map, [{ locationId: "loc-1", date: "2026-09-24", revenue: 1500, vat: 105, cashIn: 1400 }]);
    const entry = map.get("loc-1:2026-09-24");
    expect(entry).toMatchObject({ revenue: 1500, vat: 105, cashIn: 1400, directExpenses: 200, hrCash: 50 });
    expect(only.size).toBe(0);
  });
});
