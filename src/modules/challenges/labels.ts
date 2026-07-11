/** Plain-language display labels shared by the Overview UI and PDF export. */

export const CHALLENGE_LABELS = {
  salesTarget: "Sales target",
  salesTargetReached: "Sales target reached",
  productsPct: "Product sales %",
  snacks: "Snacks",
  spendPerVisit: "Spend per visit",
  runningCostsPct: "Running costs %",
  reviewCount: "Review count",
  reviewRating: "Review rating",
  visitorCounts: "Visitor counts",
  lockedTooltip: "Unlocks once sales target is reached",
  gatedBadge: "Needs sales target",
} as const;

export const PERIOD_LABELS = {
  visitors: ["Visitors 1–10", "Visitors 11–20", "Visitors 21–end"] as const,
  snacks: ["Snacks 1–10", "Snacks 11–20", "Snacks 21–end"] as const,
  table: ["1–10", "11–20", "21–end"] as const,
} as const;

export const LEGEND_ITEMS = [
  { label: CHALLENGE_LABELS.salesTarget, max: "must hit to unlock bonuses", tiers: "1.2M / 0.9M / 0.7M ฿" },
  { label: CHALLENGE_LABELS.productsPct, max: "up to 5 000 ฿", tiers: "7% → 1 500 · 8% → 3 000 · 9% → 5 000" },
  { label: CHALLENGE_LABELS.snacks, max: "1 250 ฿", tiers: "≥ 0.45" },
  { label: CHALLENGE_LABELS.spendPerVisit, max: "1 250 ฿", tiers: "≥ 190 ฿" },
  { label: CHALLENGE_LABELS.runningCostsPct, max: "1 250 ฿", tiers: "< 9.5%" },
  { label: CHALLENGE_LABELS.reviewCount, max: "625 ฿", tiers: "≥ 4%" },
  { label: CHALLENGE_LABELS.reviewRating, max: "625 ฿", tiers: "+0.1 stars vs Google" },
] as const;
