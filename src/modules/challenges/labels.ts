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
  intro:
    "Each month we highlight one shop that demonstrates strong, consistent execution — and recognise standout results across key metrics. The goal is shared learning, not comparison.",
  shopSpotlight: "Shop Spotlight",
  shopSpotlightSubtitle: "A practical example of what strong execution can look like this month",
  targetsMet: "targets met",
  whatTheyAchieved: "What they achieved",
  standoutMetrics: "Standout metrics",
  practicesWorthNoting: "Practices worth noting",
  whatOthersCanTry: "What other shops can try",
  metricRecognition: "Metric recognition",
  monthInProgress: "Month in progress — figures update as data comes in.",
  footerNote:
    "Each shop operates in different conditions. The actions behind these results can be understood and adapted — not copied blindly.",
  insufficientData: "Not enough data yet for a full spotlight this month.",
  dataPending: "Data pending",
  noPriorMonth: "Not enough prior-month data",
  alsoStrong: "Also strong",
  recognitions: {
    snacks: "Snack performance",
    reviews: "Review performance",
    spend: "Average spend",
    completion: "Challenge completion",
    improved: "Most improved",
  },
} as const;
