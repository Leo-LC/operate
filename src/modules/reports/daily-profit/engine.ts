import type {
  DailyProfitRow,
  EngineInput,
  EngineOutput,
  FinanceCostActual,
  FinanceCostRule,
  FinanceLocation,
  ValueStatus,
} from "./types";

const DAY_MS = 86_400_000;

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDays(value: string, amount: number): string {
  return formatDateOnly(new Date(parseDateOnly(value).getTime() + amount * DAY_MS));
}

export function inclusiveDays(from: string, to: string): number {
  return Math.max(0, Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / DAY_MS) + 1);
}

export function datesBetween(from: string, to: string): string[] {
  const count = inclusiveDays(from, to);
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}

function monthEnd(year: number, month: number): string {
  return formatDateOnly(new Date(Date.UTC(year, month, 0)));
}

function maxDate(a: string, b: string) { return a > b ? a : b; }
function minDate(a: string, b: string) { return a < b ? a : b; }

export interface CostPeriod {
  from: string;
  to: string;
  amount: number;
  status: ValueStatus;
  actual: FinanceCostActual | null;
}

export function periodsForRule(rule: FinanceCostRule, actuals: FinanceCostActual[], from: string, to: string): CostPeriod[] {
  const relevantActuals = actuals.filter((actual) => actual.cost_rule_id === rule.id);
  const periods: Array<{ from: string; to: string }> = [];

  if (rule.cadence === "monthly") {
    const start = parseDateOnly(maxDate(from, rule.effective_from));
    const endLimit = minDate(to, rule.effective_to ?? to);
    let year = start.getUTCFullYear();
    let month = start.getUTCMonth() + 1;
    while (`${year}-${String(month).padStart(2, "0")}-01` <= endLimit) {
      const periodFrom = maxDate(`${year}-${String(month).padStart(2, "0")}-01`, rule.effective_from);
      const periodTo = minDate(monthEnd(year, month), rule.effective_to ?? monthEnd(year, month));
      if (periodFrom <= periodTo && periodTo >= from && periodFrom <= to) periods.push({ from: periodFrom, to: periodTo });
      month += 1;
      if (month === 13) { month = 1; year += 1; }
    }
  } else {
    const periodFrom = rule.effective_from;
    const defaultEnd = rule.cadence === "annual"
      ? addDays(`${parseDateOnly(periodFrom).getUTCFullYear() + 1}-${periodFrom.slice(5)}`, -1)
      : periodFrom;
    const periodTo = rule.effective_to ?? defaultEnd;
    if (periodTo >= from && periodFrom <= to) periods.push({ from: periodFrom, to: periodTo });
  }

  return periods.map((period) => {
    const actual = relevantActuals.find((row) => row.service_from === period.from && row.service_to === period.to)
      ?? relevantActuals.find((row) => row.service_from <= period.to && row.service_to >= period.from)
      ?? null;
    return {
      ...period,
      amount: actual ? Number(actual.amount) : Number(rule.estimated_amount),
      status: actual ? "actual" : "estimated",
      actual,
    };
  });
}

export function allocationWeights(
  rule: FinanceCostRule,
  targetLocations: FinanceLocation[],
  revenueByLocation: Map<string, number>,
): Map<string, number> {
  if (targetLocations.length === 0) return new Map();
  if (rule.scope_type === "location" && rule.location_id) return new Map([[rule.location_id, 1]]);

  if (rule.allocation_method === "custom") {
    const raw = targetLocations.map((location) => [location.id, Number(rule.custom_allocations?.[location.id] ?? 0)] as const);
    const total = raw.reduce((sum, [, weight]) => sum + weight, 0);
    if (total > 0) return new Map(raw.map(([id, weight]) => [id, weight / total]));
  }

  if (rule.allocation_method === "revenue") {
    const totalRevenue = targetLocations.reduce((sum, location) => sum + (revenueByLocation.get(location.id) ?? 0), 0);
    if (totalRevenue > 0) {
      return new Map(targetLocations.map((location) => [location.id, (revenueByLocation.get(location.id) ?? 0) / totalRevenue]));
    }
  }

  const equal = 1 / targetLocations.length;
  return new Map(targetLocations.map((location) => [location.id, equal]));
}

function emptyDay(date: string): DailyProfitRow {
  return {
    date,
    revenue: 0,
    directExpenses: 0,
    payroll: 0,
    recurringCosts: 0,
    adjustments: 0,
    economicProfit: 0,
    margin: 0,
    cashIn: 0,
    cashOut: 0,
    estimatedAmount: 0,
    status: "actual",
  };
}

function targetsForRule(rule: FinanceCostRule, locations: FinanceLocation[]): FinanceLocation[] {
  if (rule.scope_type === "location") return locations.filter((location) => location.id === rule.location_id);
  if (rule.scope_type === "entity") return locations.filter((location) => location.legalEntityId === rule.legal_entity_id);
  return locations;
}

export function calculateDailyProfit(input: EngineInput): EngineOutput {
  const dates = datesBetween(input.from, input.to);
  const locationMap = new Map(input.locations.map((location) => [location.id, location]));
  const dailyByLocation = new Map<string, Map<string, DailyProfitRow>>();
  const categoryMap = new Map<string, { amount: number; estimated: boolean; label: string }>();

  for (const locationId of input.selectedLocationIds) {
    const location = locationMap.get(locationId);
    const activeDates = dates.filter((date) => !location?.operationalStartDate || date >= location.operationalStartDate);
    dailyByLocation.set(locationId, new Map(activeDates.map((date) => [date, emptyDay(date)])));
  }

  for (const entry of input.entries) {
    const day = dailyByLocation.get(entry.locationId)?.get(entry.date);
    if (!day) continue;
    day.revenue += entry.revenue;
    day.directExpenses += entry.directExpenses;
    day.cashIn += entry.cashIn;
    day.cashOut += entry.directExpenses + entry.hrCash;
  }

  for (const adjustment of input.adjustments) {
    const targets = adjustment.scope_type === "location"
      ? input.selectedLocationIds.filter((id) => id === adjustment.location_id)
      : adjustment.scope_type === "entity"
        ? input.selectedLocationIds.filter((id) => locationMap.get(id)?.legalEntityId === adjustment.legal_entity_id)
        : input.selectedLocationIds;
    if (targets.length === 0) continue;
    const amountPerTarget = adjustment.amount / targets.length;
    for (const locationId of targets) {
      const day = dailyByLocation.get(locationId)?.get(adjustment.adjustment_date);
      if (!day) continue;
      if (adjustment.kind === "income") day.adjustments += amountPerTarget;
      if (adjustment.kind === "expense") { day.adjustments -= amountPerTarget; day.cashOut += amountPerTarget; }
      if (adjustment.kind === "reclassification") day.directExpenses = Math.max(0, day.directExpenses - amountPerTarget);
    }
    const signed = adjustment.kind === "income" ? -adjustment.amount : adjustment.kind === "expense" ? adjustment.amount : 0;
    const current = categoryMap.get(adjustment.category) ?? { amount: 0, estimated: false, label: adjustment.category };
    current.amount += signed;
    categoryMap.set(adjustment.category, current);
  }

  for (const period of input.payroll) {
    const monthFrom = `${period.year}-${String(period.month).padStart(2, "0")}-01`;
    const monthTo = monthEnd(period.year, period.month);
    const perDay = period.amount / inclusiveDays(monthFrom, monthTo);
    for (const date of datesBetween(maxDate(input.from, monthFrom), minDate(input.to, monthTo))) {
      const day = dailyByLocation.get(period.locationId)?.get(date);
      if (!day) continue;
      day.payroll += perDay;
      if (period.status === "estimated") day.estimatedAmount += perDay;
    }
    const current = categoryMap.get("payroll") ?? { amount: 0, estimated: false, label: "Payroll" };
    const overlapDays = Math.max(0, inclusiveDays(maxDate(input.from, monthFrom), minDate(input.to, monthTo)));
    current.amount += perDay * overlapDays;
    current.estimated ||= period.status === "estimated";
    categoryMap.set("payroll", current);
  }

  const revenueByLocation = new Map<string, number>();
  for (const [locationId, days] of Array.from(dailyByLocation.entries())) {
    revenueByLocation.set(locationId, Array.from(days.values()).reduce((sum, day) => sum + day.revenue, 0));
  }

  for (const rule of input.costRules.filter((row) => row.is_active)) {
    const targetLocations = targetsForRule(rule, input.locations).filter((location) => input.selectedLocationIds.includes(location.id));
    const weights = allocationWeights(rule, targetLocations, revenueByLocation);
    for (const period of periodsForRule(rule, input.costActuals, input.from, input.to)) {
      const perDay = period.amount / inclusiveDays(period.from, period.to);
      const overlapFrom = maxDate(input.from, period.from);
      const overlapTo = minDate(input.to, period.to);
      if (overlapFrom > overlapTo) continue;
      for (const [locationId, weight] of Array.from(weights.entries())) {
        for (const date of datesBetween(overlapFrom, overlapTo)) {
          const day = dailyByLocation.get(locationId)?.get(date);
          if (!day) continue;
          const allocated = perDay * weight;
          day.recurringCosts += allocated;
          if (period.status === "estimated") day.estimatedAmount += allocated;
        }
        if (period.actual?.paid_on && !input.adjustments.some((a) => a.kind === "reclassification" && a.cost_rule_id === rule.id)) {
          const paidDay = dailyByLocation.get(locationId)?.get(period.actual.paid_on);
          if (paidDay) paidDay.cashOut += Number(period.actual.amount) * weight;
        }
      }
      const current = categoryMap.get(rule.category) ?? { amount: 0, estimated: false, label: rule.label };
      current.amount += perDay * inclusiveDays(overlapFrom, overlapTo);
      current.estimated ||= period.status === "estimated";
      categoryMap.set(rule.category, current);
    }
  }

  for (const days of Array.from(dailyByLocation.values())) {
    for (const day of Array.from(days.values())) {
      day.economicProfit = day.revenue - day.directExpenses - day.payroll - day.recurringCosts + day.adjustments;
      day.margin = day.revenue > 0 ? (day.economicProfit / day.revenue) * 100 : 0;
      day.status = day.estimatedAmount > 0 ? "estimated" : "actual";
    }
  }

  const direct = Array.from(dailyByLocation.values()).flatMap((days) => Array.from(days.values())).reduce((sum, day) => sum + day.directExpenses, 0);
  categoryMap.set("direct_operating", { amount: direct, estimated: false, label: "Daily operating expenses" });

  return {
    dailyByLocation,
    categories: Array.from(categoryMap.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      amount: value.amount,
      status: value.estimated ? "estimated" as const : "actual" as const,
    })).sort((a, b) => b.amount - a.amount),
  };
}
