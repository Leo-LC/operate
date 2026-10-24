import { describe, expect, it } from "vitest";
import {
  aggregateItemSales,
  aggregatePrices,
  dayCountInclusive,
  monthRange,
  normalizeName,
  searchMatch,
} from "./item-analysis";

describe("normalizeName", () => {
  it("lowercases, strips accents and collapses spaces", () => {
    expect(normalizeName("Cartes Postales  Set ")).toBe("cartes postales set");
    expect(normalizeName("Café Glacé")).toBe("cafe glace");
  });
});

describe("searchMatch", () => {
  it("matches every term (case/accent insensitive)", () => {
    expect(searchMatch("carte post", "Cartes postales set")).toBe(true);
    expect(searchMatch("postcard", "Postcard A5")).toBe(true);
    expect(searchMatch("introuvable", "Postcard A5")).toBe(false);
    expect(searchMatch("postcard postales", "Postcard A5")).toBe(false); // AND sémantique
    expect(searchMatch("", "Postcard A5")).toBe(true);
  });
});

describe("dayCountInclusive / monthRange", () => {
  it("counts inclusive days", () => {
    expect(dayCountInclusive("2026-09-01", "2026-09-01")).toBe(1);
    expect(dayCountInclusive("2026-09-01", "2026-09-30")).toBe(30);
    expect(dayCountInclusive("2026-02-01", "2026-02-28")).toBe(28);
  });
  it("resolves month ranges incl. leap year", () => {
    expect(monthRange("2026-09")).toEqual({ first: "2026-09-01", last: "2026-09-30" });
    expect(monthRange("2024-02")).toEqual({ first: "2024-02-01", last: "2024-02-29" });
  });
});

describe("aggregateItemSales", () => {
  const rows = [
    {
      location_id: "loc-bkk",
      date: "2026-09-01",
      sales_by_item: [
        { item_name: "Postcard A5", category_name: "Merch", quantity: 2, total_money: 200 },
        { item_name: "cartes postales", category_name: null, quantity: 1, total_money: 40 },
      ],
    },
    {
      location_id: "loc-samui",
      date: "2026-09-01",
      sales_by_item: [
        { item_name: "Postcard A5", category_name: "Merch", quantity: 1, total_money: 100 },
      ],
    },
    {
      location_id: "loc-bkk",
      date: "2026-09-02",
      sales_by_item: [
        // refund partiel déjà signé côté sync → total négatif conservé
        { item_name: "postcard a5", category_name: "Merch", quantity: -1, total_money: -100 },
      ],
    },
    {
      location_id: null,
      date: "2026-09-03",
      sales_by_item: [
        { item_name: "Cartes Postales", category_name: "Merch", quantity: 1, total_money: 40 },
      ],
    },
  ];

  it("merges items across rows/locations/case on normalized name", () => {
    const res = aggregateItemSales(rows, "2026-09-01", "2026-09-30");
    const names = res.items.map((i) => i.item_name);
    expect(names).toHaveLength(2); // "Cartes Postales" et "cartes postales" fusionnés
    expect(names).toContain("Cartes Postales");

    const postcard = res.items.find((i) => i.item_name === "Postcard A5")!;
    expect(postcard.quantity).toBe(2 + 1 - 1);
    expect(postcard.total_money).toBe(200 + 100 - 100);
    expect(postcard.by_location["loc-bkk"]).toBe(100);
    expect(postcard.by_location["loc-samui"]).toBe(100);
  });

  it("builds full-range daily series with zero-filled gaps", () => {
    const res = aggregateItemSales(rows, "2026-09-01", "2026-09-05");
    expect(res.dates).toHaveLength(5);
    const postcard = res.series["Postcard A5"]!;
    expect(postcard["2026-09-01"]).toEqual({ q: 3, m: 300 });
    expect(postcard["2026-09-02"]).toEqual({ q: -1, m: -100 });
    expect(postcard["2026-09-03"]).toEqual({ q: 0, m: 0 });
    expect(res.days_with_rows).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  it("handles empty rows", () => {
    const res = aggregateItemSales([], "2026-09-01", "2026-09-30");
    expect(res.items).toEqual([]);
    expect(res.dates).toHaveLength(30);
    expect(res.days_with_rows).toEqual([]);
  });

  it("accepts not-a-month-long ranges and skips absurd spans", () => {
    const res = aggregateItemSales([], "2026-09-30", "2026-09-01");
    expect(res.dates).toEqual([]);
  });
});

describe("aggregatePrices", () => {
  it("merges buckets by normalized name and sorts price asc", () => {
    const res = aggregatePrices([
      { prices_by_item: { "Postcard A5": [{ p: 40, n: 2, q: 2, m: 80 }, { p: 20, n: 1, q: 1, m: 20 }] } },
      { prices_by_item: { "postcard a5": [{ p: 40, n: 3, q: 3, m: 120 }] } },
    ]);
    expect(Object.keys(res)).toHaveLength(1);
    const buckets = res["Postcard A5"]!;
    expect(buckets.map((b) => b.p)).toEqual([20, 40]);
    expect(buckets.find((b) => b.p === 40)).toEqual({ p: 40, n: 5, q: 5, m: 200 });
  });
  it("handles empty/missing prices", () => {
    expect(aggregatePrices([{ prices_by_item: null }, {}])).toEqual({});
  });
});
