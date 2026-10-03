export interface RecurringCostRuleRow {
  id: string;
  location_id: string | null;
  category: string;
  scope_type: string;
  cadence: string;
  estimated_amount: number | string;
  effective_from: string;
  effective_to: string | null;
}

export interface RecurringCostOverrideRow {
  cost_rule_id: string;
  service_from: string;
  service_to: string;
  amount: number | string;
}

export interface RecurringCostBreakdown {
  rent: number;
  marketing: number;
  supportWorkers: number;
  other: number;
  hasRules: boolean;
}

const EMPTY_BREAKDOWN: RecurringCostBreakdown = {
  rent: 0,
  marketing: 0,
  supportWorkers: 0,
  other: 0,
  hasRules: false,
};

export function recurringMonthKey(locationId: string, year: number, month: number) {
  return `${locationId}:${year}-${month}`;
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function categoryKey(category: string): keyof Pick<RecurringCostBreakdown, "rent" | "marketing" | "supportWorkers" | "other"> {
  if (category === "rent") return "rent";
  if (category === "marketing") return "marketing";
  if (category === "support_workers") return "supportWorkers";
  return "other";
}

function baseMonthlyAmount(rule: RecurringCostRuleRow, year: number, month: number) {
  const amount = Number(rule.estimated_amount ?? 0);
  if (rule.cadence === "annual") return amount / 12;
  if (rule.cadence === "one_off") {
    return rule.effective_from.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}` ? amount : 0;
  }
  return amount;
}

export function buildRecurringCostBreakdowns({
  periods,
  locationIds,
  rules,
  overrides,
}: {
  periods: Array<{ year: number; month: number }>;
  locationIds: string[];
  rules: RecurringCostRuleRow[];
  overrides: RecurringCostOverrideRow[];
}) {
  const locationSet = new Set(locationIds);
  const overrideByRuleMonth = new Map(
    overrides.map((override) => [`${override.cost_rule_id}:${override.service_from.slice(0, 7)}`, Number(override.amount ?? 0)]),
  );
  const result = new Map<string, RecurringCostBreakdown>();

  for (const rule of rules) {
    if (rule.scope_type !== "location" || !rule.location_id || !locationSet.has(rule.location_id)) continue;
    for (const period of periods) {
      const { start, end } = monthBounds(period.year, period.month);
      if (rule.effective_from > end || (rule.effective_to && rule.effective_to < start)) continue;
      const key = recurringMonthKey(rule.location_id, period.year, period.month);
      const current = result.get(key) ?? { ...EMPTY_BREAKDOWN };
      const monthLabel = `${period.year}-${String(period.month).padStart(2, "0")}`;
      const amount = overrideByRuleMonth.get(`${rule.id}:${monthLabel}`) ?? baseMonthlyAmount(rule, period.year, period.month);
      current[categoryKey(rule.category)] += amount;
      current.hasRules = true;
      result.set(key, current);
    }
  }

  return result;
}
