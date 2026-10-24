import { describe, expect, it } from "vitest";
import {
  bucketKey,
  computeReviewsStats,
  PERIOD_PRESETS,
  periodBounds,
  startOfWeek,
  type StatPart,
} from "./stats";

// Fixed "now" (UTC) so tests are deterministic: 2026-10-24 12:00 UTC.
const NOW = new Date(Date.UTC(2026, 9, 24, 12, 0, 0));

function iso(s: string): string {
  return new Date(s).toISOString();
}

function part(overrides: Partial<StatPart> = {}): StatPart {
  return {
    locationId: "locations/A",
    period: "current",
    star: 5,
    replied: false,
    key: "",
    n: 1,
    ...overrides,
  };
}

describe("periodBounds", () => {
  it("covers the last 7 calendar days including today", () => {
    const b = periodBounds("7d", NOW);
    expect(b.currentFrom.toISOString()).toBe(iso("2026-10-18T00:00:00Z"));
    expect(b.currentTo.toISOString()).toBe(iso("2026-10-24T00:00:00Z"));
    expect(b.endExclusive.toISOString()).toBe(iso("2026-10-25T00:00:00Z"));
    expect(b.priorTo.toISOString()).toBe(iso("2026-10-17T00:00:00Z"));
    expect(b.priorFrom.toISOString()).toBe(iso("2026-10-11T00:00:00Z"));
  });

  it("prior and current windows have equal length for 12 months", () => {
    const b = periodBounds("12m", NOW);
    const days = (a: Date, z: Date) => Math.round((z.getTime() - a.getTime()) / 86400000);
    expect(days(b.priorFrom, b.currentFrom)).toBe(days(b.currentFrom, b.endExclusive));
    expect(days(b.priorFrom, b.currentFrom)).toBe(365);
  });
});

describe("bucketKey", () => {
  it("buckets weeks on Monday (UTC)", () => {
    // 2026-10-24 is a Saturday → Monday is 2026-10-19
    expect(new Date(Date.UTC(2026, 9, 24)).getUTCDay()).toBe(6);
    expect(startOfWeek(new Date(Date.UTC(2026, 9, 24))).toISOString()).toBe(iso("2026-10-19T00:00:00Z"));
  });

  it("formats day and month keys", () => {
    expect(bucketKey(new Date(Date.UTC(2026, 9, 24)), "day")).toBe("2026-10-24");
    expect(bucketKey(new Date(Date.UTC(2026, 9, 24)), "month")).toBe("2026-10");
  });
});

describe("computeReviewsStats", () => {
  it("counts current parts and computes the average", () => {
    const res = computeReviewsStats(
      [
        part({ star: 5, key: "2026-10-19" }),
        part({ star: 4 }),
        part({ star: 1, locationId: "locations/B" }),
      ],
      [{ locationId: "locations/A", title: "Shop A" }, { locationId: "locations/B", title: "Shop B" }],
      "30d",
      null,
      NOW,
    );
    expect(res.overall.count).toBe(3);
    expect(res.overall.avg).toBeCloseTo(10 / 3);
    expect(res.shops).toHaveLength(2);
    expect(res.shops[0].count).toBe(2); // sorted by count desc
    expect(res.shops[0].title).toBe("Shop A");
  });

  it("derives the prior window from prior parts", () => {
    const res = computeReviewsStats(
      [part({ period: "prior", star: 5 }), part({ star: 3 })],
      [{ locationId: "locations/A", title: "Shop A" }],
      "30d",
      null,
      NOW,
    );
    expect(res.overall.count).toBe(1);
    expect(res.overall.priorCount).toBe(1);
    expect(res.overall.priorAvg).toBe(5);
  });

  it("multiplies by n (SQL group weights)", () => {
    const res = computeReviewsStats(
      [
        part({ star: 5, n: 3, replied: true, key: "2026-10-19" }),
        part({ star: 2, n: 2, locationId: "locations/B" }),
      ],
      [{ locationId: "locations/A", title: "Shop A" }, { locationId: "locations/B", title: "Shop B" }],
      "30d",
      null,
      NOW,
    );
    expect(res.overall.count).toBe(5);
    expect(res.overall.avg).toBeCloseTo((15 + 4) / 5);
    expect(res.overall.replyRate).toBeCloseTo(3 / 5);
    expect(res.overall.distribution).toEqual([0, 2, 0, 0, 3]);
  });

  it("filters the overall numbers by selected shops, but keeps every shop listed", () => {
    const res = computeReviewsStats(
      [
        part({ star: 5, key: "2026-10-19" }),
        part({ star: 1, key: "2026-10-19", locationId: "locations/B" }),
      ],
      [{ locationId: "locations/A", title: "Shop A" }, { locationId: "locations/B", title: "Shop B" }],
      "30d",
      new Set(["locations/A"]),
      NOW,
    );
    expect(res.overall.count).toBe(1);
    expect(res.overall.avg).toBe(5);
    expect(res.overallPoints.reduce((s, p) => s + p.count, 0)).toBe(1);
    expect(res.shops).toHaveLength(2);
  });

  it("carries the prior distribution for share deltas", () => {
    const res = computeReviewsStats(
      [
        part({ star: 5 }),
        part({ period: "prior", star: 1 }),
        part({ period: "prior", star: 2 }),
      ],
      [{ locationId: "locations/A", title: "Shop A" }],
      "30d",
      null,
      NOW,
    );
    expect(res.overall.distribution).toEqual([0, 0, 0, 0, 1]);
    expect(res.overall.priorDistribution).toEqual([1, 1, 0, 0, 0]);
  });

  it("handles empty data without NaN", () => {
    const res = computeReviewsStats([], [], "30d", null, NOW);
    expect(res.overall.count).toBe(0);
    expect(res.overall.avg).toBeNull();
    expect(res.overall.replyRate).toBeNull();
    expect(res.overall.priorDistribution).toBeNull();
    expect(res.shops).toEqual([]);
    expect(res.overallPoints.every((p) => p.count === 0)).toBe(true);
    // The series still lists every bucket of the window
    expect(res.overallPoints).toHaveLength(5); // 30d → 5 ISO weeks
  });

  it("produces daily buckets for the 7d preset", () => {
    const res = computeReviewsStats([], [], "7d", null, NOW);
    expect(res.granularity).toBe("day");
    expect(res.overallPoints).toHaveLength(7);
    expect(res.overallPoints[6].label).toBe("24 Oct");
  });

  it("produces weekly buckets for the 30d preset", () => {
    const res = computeReviewsStats([], [], "30d", null, NOW);
    expect(res.granularity).toBe("week");
    expect(res.overallPoints).toHaveLength(5);
  });

  it("produces monthly buckets for the 12m preset", () => {
    const res = computeReviewsStats([], [], "12m", null, NOW);
    expect(res.granularity).toBe("month");
    expect(res.overallPoints.length).toBeGreaterThanOrEqual(12);
    expect(res.overallPoints.length).toBeLessThanOrEqual(14);
  });

  it("drops parts with invalid ratings", () => {
    const res = computeReviewsStats(
      [part({ star: 0 }), part({ star: 6 }), part({ star: 4 })],
      [{ locationId: "locations/A", title: "Shop A" }],
      "30d",
      null,
      NOW,
    );
    expect(res.overall.count).toBe(1);
    expect(res.overall.avg).toBe(4);
    expect(res.shops).toHaveLength(1);
  });

  it("uses the titles list for display names", () => {
    const res = computeReviewsStats(
      [part()],
      [{ locationId: "locations/A", title: "Renamed shop" }],
      "30d",
      null,
      NOW,
    );
    expect(res.shops[0].title).toBe("Renamed shop");
  });

  it("falls back to the location id when no title exists", () => {
    const res = computeReviewsStats([part()], [], "30d", null, NOW);
    expect(res.shops[0].title).toBe("locations/A");
  });
});

describe("PERIOD_PRESETS", () => {
  it("has 4 presets with increasing windows", () => {
    expect(PERIOD_PRESETS).toHaveLength(4);
    expect(PERIOD_PRESETS.map((p) => p.days)).toEqual([7, 30, 90, 365]);
  });
});
