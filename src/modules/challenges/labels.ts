/** Plain-language display labels shared by the Overview UI and PDF export. */

export const CHALLENGE_LABELS = {
  salesTarget: "Sales target",
  salesTargetReached: "Sales target reached",
  productsPct: "Merchandising sales %",
  snacks: "Snacks",
  spendPerVisit: "Spend per visit",
  runningCostsPct: "Running costs %",
  reviewCount: "Review count",
  reviewRating: "Review rating",
  visitorCounts: "Visitor counts",
  lockedTooltip: "Unlocks once sales target is reached",
  lockedUntilSalesTarget: "Locked",
  gatedBadge: "Needs sales target",
  salesTargetTbd: "To be defined",
} as const;

/** Friendlier labels shown in Team view. */
export const TEAM_CHALLENGE_LABELS = {
  salesTarget: "Monthly sales",
  salesTargetReached: "Sales target reached",
  productsPct: "Merch & goodies",
  snacks: "Snack sales",
  spendPerVisit: "Spend per visitor",
  runningCostsPct: "Stock costs",
  reviewCount: "Google reviews",
  reviewRating: "Review rating",
  visitorCounts: "Visitor counts",
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

export const TEAM_LEGEND_ITEMS = [
  { label: TEAM_CHALLENGE_LABELS.salesTarget, max: "unlocks bonuses", tiers: "1.2M / 0.9M / 0.7M ฿" },
  { label: TEAM_CHALLENGE_LABELS.productsPct, max: "up to 5 000 ฿", tiers: "7% · 8% · 9% of sales" },
  { label: TEAM_CHALLENGE_LABELS.snacks, max: "1 250 ฿", tiers: "~1 snack / 2 visitors" },
  { label: TEAM_CHALLENGE_LABELS.spendPerVisit, max: "1 250 ฿", tiers: "190 ฿ / visitor" },
  { label: TEAM_CHALLENGE_LABELS.runningCostsPct, max: "1 250 ฿", tiers: "under 9.5% of sales" },
  { label: TEAM_CHALLENGE_LABELS.reviewCount, max: "625 ฿", tiers: "4 reviews / 100 visitors" },
  { label: TEAM_CHALLENGE_LABELS.reviewRating, max: "625 ฿", tiers: "+0.1★ vs Google · min 10/mo" },
] as const;

export const VIEW_MODE_LABELS = {
  internal: "Internal",
  team: "Team",
} as const;

export const SPOTLIGHT_LABELS = {
  shopSpotlight: "Featured shop",
  shopSpotlightSubtitle: "Strong all-round execution this month",
  targetsMet: "of 6 targets hit",
  scoreLabel: "Monthly score",
  metricGridTitle: "How they did",
  tipsTitle: "Ideas to try",
  metricRecognition: "Shout-outs this month",
  metricRecognitionSubtitle: "Standout results in each area",
  monthInProgress: "Month still in progress — numbers update as the month goes on.",
  footerNote: "Every shop is different. Take the habits, adapt them to your team.",
  insufficientData: "Not enough data for a featured shop yet.",
  dataPending: "Waiting for data",
  noPriorMonth: "No comparison yet",
  alsoStrong: "Also notable",
  statusPass: "Hit",
  statusMiss: "Missed",
  statusPending: "Pending",
  saveAsPdf: "Save as PDF",
  recognitions: {
    revenue: "Sales",
    merch: "Merch",
    snacks: "Snacks",
    reviews: "Reviews",
    spend: "Avg. spend",
    completion: "Most targets hit",
    improved: "Most improved",
  },
  recognitionHints: {
    revenue: "Highest sales vs target",
    merch: "Best merch share of sales",
    snacks: "Best snack sales per visit",
    reviews: "Best review results",
    spend: "Highest spend per visitor",
    completion: "Most challenge targets met",
    improved: "Biggest step forward vs last month",
  },
} as const;
