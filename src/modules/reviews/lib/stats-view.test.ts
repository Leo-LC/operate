import { describe, expect, it } from "vitest";
import {
  countComparison,
  describeStarRow,
  formatPercent,
  formatRating,
  formatUtcRange,
  lowStarCount,
  lowStarShare,
  ratingComparison,
  sharePointComparison,
  starRows,
} from "./stats-view";

describe("countComparison", () => {
  it("labels a change against the previous window", () => {
    expect(countComparison(975, 971, "30 days")).toEqual({
      direction: "up",
      tone: "positive",
      text: "0.4%",
      detail: "0.4% vs previous 30 days",
    });
  });

  it("reports new reviews when the previous window is empty", () => {
    expect(countComparison(12, 0, "7 days")).toEqual({
      direction: "up",
      tone: "positive",
      text: "12 new",
      detail: "12 new reviews; no reviews in the previous 7 days",
    });
  });

  it("does not claim growth when both windows are empty", () => {
    expect(countComparison(0, 0, "7 days")).toEqual({
      direction: "none",
      tone: "neutral",
      text: "No reviews",
      detail: "No reviews in either period",
    });
  });

  it("shows an absolute count instead of a misleading 0%", () => {
    expect(countComparison(10004, 10000, "30 days")).toEqual({
      direction: "up",
      tone: "positive",
      text: "+4",
      detail: "4 reviews vs previous 30 days (previously 10,000)",
    });
  });

  it("uses an absolute change for a tiny previous baseline", () => {
    expect(countComparison(286, 6, "30 days")).toEqual({
      direction: "up",
      tone: "positive",
      text: "+280 · was 6",
      detail: "280 reviews vs previous 30 days (previously 6)",
    });
  });

  it("uses an absolute change for an extreme percentage", () => {
    expect(countComparison(500, 100, "30 days")).toEqual({
      direction: "up",
      tone: "positive",
      text: "+400 · was 100",
      detail: "400 reviews vs previous 30 days (previously 100)",
    });
  });

  it("keeps a normal percentage for a reasonable baseline", () => {
    expect(countComparison(40, 20, "30 days")).toEqual({
      direction: "up",
      tone: "positive",
      text: "100%",
      detail: "100% vs previous 30 days",
    });
  });
});

describe("ratingComparison", () => {
  it("shows two decimals so small rating moves are visible", () => {
    expect(ratingComparison(4.7835, 4.8063, "30 days")).toEqual({
      direction: "down",
      tone: "negative",
      text: "0.02",
      detail: "0.02 vs previous 30 days",
      note: "delta calculated before rounding: 4.7835 vs 4.8063",
    });
  });

  it("explains the real KPI case without forcing the delta to match", () => {
    const comparison = ratingComparison(4.783589743589744, 4.80638516992791, "30 days");
    expect(comparison?.text).toBe("0.02");
    expect(comparison?.note).toBe("delta calculated before rounding: 4.7836 vs 4.8064");
  });

  it("returns null when there is no current rating", () => {
    expect(ratingComparison(null, 4.8, "30 days")).toBeNull();
  });

  it("reports a missing prior baseline", () => {
    expect(ratingComparison(4.8, null, "30 days")).toEqual({
      direction: "none",
      tone: "neutral",
      text: "No baseline",
      detail: "No prior baseline",
    });
  });

  it("never renders a negative zero", () => {
    const comparison = ratingComparison(4.8, 4.8000001, "30 days");
    expect(comparison?.text).toBe("No change");
    expect(comparison?.detail).toBe("No change vs previous 30 days");
    expect(comparison?.note).toBeUndefined();
  });
});

describe("sharePointComparison", () => {
  it("uses pp and treats an increase in 1★–3★ share as negative", () => {
    expect(sharePointComparison(0.0585, 0.0515, "30 days")).toEqual({
      direction: "up",
      tone: "negative",
      text: "0.7 pp",
      detail: "0.7 pp vs previous 30 days",
    });
  });

  it("treats a decrease in 1★–3★ share as an improvement", () => {
    expect(sharePointComparison(0.04, 0.06, "30 days")).toEqual({
      direction: "down",
      tone: "positive",
      text: "2 pp",
      detail: "2 pp vs previous 30 days",
    });
  });

  it("returns null when the current share is unknown", () => {
    expect(sharePointComparison(null, 0.05, "30 days")).toBeNull();
  });
});

describe("distribution helpers", () => {
  const distribution: [number, number, number, number, number] = [26, 9, 22, 36, 882];

  it("counts 1★–3★ reviews", () => {
    expect(lowStarCount(distribution)).toBe(57);
    expect(lowStarShare(distribution, 975)).toBeCloseTo(57 / 975);
  });

  it("returns a null share for an empty period", () => {
    expect(lowStarShare(distribution, 0)).toBeNull();
    expect(lowStarShare(null, 10)).toBeNull();
  });

  it("orders the compact panel from 5★ to 1★", () => {
    const rows = starRows(distribution, 975);
    expect(rows.map((r) => r.star)).toEqual([5, 4, 3, 2, 1]);
    expect(rows.map((r) => r.count)).toEqual([882, 36, 22, 9, 26]);
    expect(rows[0].share).toBeCloseTo(882 / 975);
  });

  it("keeps zero-review rows honest", () => {
    const rows = starRows([0, 0, 0, 0, 0], 0);
    expect(rows.every((r) => r.count === 0 && r.share === null)).toBe(true);
  });

  it("describes a row for assistive tech", () => {
    const [five] = starRows(distribution, 975);
    expect(describeStarRow(five)).toBe("5 stars: 882 reviews (90.5%)");
  });
});

describe("formatting", () => {
  it("formats percentages with an explicit empty state", () => {
    expect(formatPercent(0.6718)).toBe("67%");
    expect(formatPercent(null)).toBe("—");
  });

  it("formats ratings to two decimals so deltas stay consistent", () => {
    expect(formatRating(4.7835)).toBe("4.78");
    expect(formatRating(4.8)).toBe("4.80");
    expect(formatRating(5)).toBe("5.00");
    expect(formatRating(null)).toBe("—");
  });

  it("formats the UTC window from the API", () => {
    expect(formatUtcRange("2026-09-26T00:00:00.000Z", "2026-10-25T23:59:59.999Z")).toBe(
      "26 Sept – 25 Oct 2026",
    );
  });

  it("keeps both years when the window crosses a year boundary", () => {
    expect(formatUtcRange("2025-12-27T00:00:00.000Z", "2026-01-25T23:59:59.999Z")).toBe(
      "27 Dec 2025 – 25 Jan 2026",
    );
  });

  it("returns an empty label for invalid dates", () => {
    expect(formatUtcRange("nope", "2026-01-25T23:59:59.999Z")).toBe("");
  });
});
