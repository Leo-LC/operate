import { describe, expect, it } from "vitest";
import { buildCashSafeRows } from "./cash-safes";
import type { FinanceLocation } from "./types";

const locations: FinanceLocation[] = [
  { id: "a", name: "A", legalEntityId: null, operationalStartDate: null },
  { id: "b", name: "B", legalEntityId: null, operationalStartDate: null },
  { id: "c", name: "C", legalEntityId: null, operationalStartDate: null },
];

describe("cash safes", () => {
  it("keeps one independent value per shop and selects the latest at or before the date", () => {
    const result = buildCashSafeRows(locations, [
      { location_id: "a", entry_date: "2026-09-01", cash_safe: 1_000 },
      { location_id: "a", entry_date: "2026-09-03", cash_safe: 1_500 },
      { location_id: "a", entry_date: "2026-09-05", cash_safe: 9_999 },
      { location_id: "b", entry_date: "2026-09-04", cash_safe: 0 },
    ], "2026-09-04");

    expect(result).toEqual([
      { locationId: "a", locationName: "A", amount: 1_500, asOf: "2026-09-03", isStale: true },
      { locationId: "b", locationName: "B", amount: 0, asOf: "2026-09-04", isStale: false },
      { locationId: "c", locationName: "C", amount: null, asOf: null, isStale: true },
    ]);
  });
});
