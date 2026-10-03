import type { DailyProfitRow, EngineInput, EngineOutput, FinanceShopMonthlyInput } from "./types";

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
  return Array.from({ length: inclusiveDays(from, to) }, (_, index) => addDays(from, index));
}

export function monthDays(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function emptyDay(date: string): DailyProfitRow {
  return {
    date,
    sourceStatus: "missing",
    revenue: 0,
    directExpenses: 0,
    payroll: 0,
    recurringCosts: 0,
    serviceCharge: 0,
    bonus: 0,
    totalCosts: 0,
    adjustments: 0,
    economicProfit: 0,
    margin: 0,
    cashIn: 0,
    cashOut: 0,
    estimatedAmount: 0,
    status: "actual",
  };
}

function inputKey(locationId: string, year: number, month: number) {
  return `${locationId}:${year}-${month}`;
}

function fixedMonthlyTotal(input: FinanceShopMonthlyInput) {
  if (input.recurring_breakdown) {
    return Object.values(input.recurring_breakdown).reduce((sum, amount) => sum + Number(amount), 0);
  }
  return Number(input.rent_amount) + Number(input.electricity_amount) + Number(input.water_amount) + Number(input.other_fixed_amount);
}

function recurringBreakdown(input: FinanceShopMonthlyInput) {
  if (input.recurring_breakdown) return input.recurring_breakdown;
  return {
    rent: Number(input.rent_amount),
    marketing: 0,
    supportWorkers: 0,
    other: Number(input.electricity_amount) + Number(input.water_amount) + Number(input.other_fixed_amount),
  };
}

export function calculateDailyProfit(input: EngineInput): EngineOutput {
  const dates = datesBetween(input.from, input.to);
  const locationMap = new Map(input.locations.map((location) => [location.id, location]));
  const monthlyInputMap = new Map(input.monthlyInputs.map((row) => [inputKey(row.location_id, row.period_year, row.period_month), row]));
  const dailyByLocation = new Map<string, Map<string, DailyProfitRow>>();
  const recurringTotals = { rent: 0, marketing: 0, supportWorkers: 0, other: 0 };

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
    day.sourceStatus = "complete";
  }

  for (const [locationId, days] of Array.from(dailyByLocation.entries())) {
    for (const [date, day] of Array.from(days.entries())) {
      const parsed = parseDateOnly(date);
      const year = parsed.getUTCFullYear();
      const month = parsed.getUTCMonth() + 1;
      const settings = monthlyInputMap.get(inputKey(locationId, year, month));
      if (settings) {
        const divisor = monthDays(year, month);
        const breakdown = recurringBreakdown(settings);
        day.payroll = Number(settings.salaries_amount) / divisor;
        day.recurringCosts = fixedMonthlyTotal(settings) / divisor;
        day.serviceCharge = day.revenue * (Number(settings.service_charge_rate_pct) / 100) * Number(settings.employee_count);
        day.bonus = Number((settings as { bonus_amount?: number }).bonus_amount ?? 0) / divisor;
        recurringTotals.rent += Number(breakdown.rent) / divisor;
        recurringTotals.marketing += Number(breakdown.marketing) / divisor;
        recurringTotals.supportWorkers += Number(breakdown.supportWorkers) / divisor;
        recurringTotals.other += Number(breakdown.other) / divisor;
      }
      day.totalCosts = day.directExpenses + day.payroll + day.recurringCosts + day.serviceCharge + day.bonus;
      day.economicProfit = day.revenue - day.totalCosts;
      day.margin = day.revenue > 0 ? day.economicProfit / day.revenue * 100 : 0;
    }
  }

  const allDays = Array.from(dailyByLocation.values()).flatMap((days) => Array.from(days.values()));
  const total = (field: keyof Pick<DailyProfitRow, "directExpenses" | "payroll" | "recurringCosts" | "serviceCharge" | "bonus">) => allDays.reduce((sum, day) => sum + day[field], 0);
  return {
    dailyByLocation,
    categories: [
      { key: "daily_operating", label: "Sheet expenses excl. HR", amount: total("directExpenses"), status: "actual" as const },
      { key: "salaries", label: "Salaries", amount: total("payroll"), status: "actual" as const },
      { key: "fixed_costs", label: "Fixed costs", amount: total("recurringCosts"), status: "actual" as const },
      { key: "service_charge", label: "Service Charge", amount: total("serviceCharge"), status: "actual" as const },
      { key: "bonus", label: "Bonus", amount: total("bonus"), status: "actual" as const },
    ].sort((a, b) => b.amount - a.amount),
    expenseBreakdown: [
      { key: "operating", label: "Achats et exploitation", amount: total("directExpenses"), status: "actual" as const },
      { key: "payroll", label: "Salaires", amount: total("payroll"), status: "estimated" as const },
      { key: "rent", label: "Loyers", amount: recurringTotals.rent, status: "estimated" as const },
      { key: "marketing", label: "Marketing", amount: recurringTotals.marketing, status: "estimated" as const },
      { key: "support_workers", label: "Métiers support", amount: recurringTotals.supportWorkers, status: "estimated" as const },
      { key: "other_recurring", label: "Autres charges fixes", amount: recurringTotals.other, status: "estimated" as const },
      { key: "service_charge", label: "Service charge", amount: total("serviceCharge"), status: "estimated" as const },
      { key: "bonus", label: "Primes et bonus", amount: total("bonus"), status: "estimated" as const },
    ],
  };
}
