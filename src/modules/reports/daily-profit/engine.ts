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
    revenue: 0,
    directExpenses: 0,
    payroll: 0,
    recurringCosts: 0,
    serviceCharge: 0,
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
  return Number(input.rent_amount) + Number(input.electricity_amount) + Number(input.water_amount) + Number(input.other_fixed_amount);
}

export function calculateDailyProfit(input: EngineInput): EngineOutput {
  const dates = datesBetween(input.from, input.to);
  const locationMap = new Map(input.locations.map((location) => [location.id, location]));
  const monthlyInputMap = new Map(input.monthlyInputs.map((row) => [inputKey(row.location_id, row.period_year, row.period_month), row]));
  const dailyByLocation = new Map<string, Map<string, DailyProfitRow>>();

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

  for (const [locationId, days] of Array.from(dailyByLocation.entries())) {
    for (const [date, day] of Array.from(days.entries())) {
      const parsed = parseDateOnly(date);
      const year = parsed.getUTCFullYear();
      const month = parsed.getUTCMonth() + 1;
      const settings = monthlyInputMap.get(inputKey(locationId, year, month));
      if (settings) {
        const divisor = monthDays(year, month);
        day.payroll = Number(settings.salaries_amount) / divisor;
        day.recurringCosts = fixedMonthlyTotal(settings) / divisor;
        day.serviceCharge = day.revenue * (Number(settings.service_charge_rate_pct) / 100) * Number(settings.employee_count);
      }
      day.economicProfit = day.revenue - day.directExpenses - day.payroll - day.recurringCosts - day.serviceCharge;
      day.margin = day.revenue > 0 ? day.economicProfit / day.revenue * 100 : 0;
    }
  }

  const allDays = Array.from(dailyByLocation.values()).flatMap((days) => Array.from(days.values()));
  const total = (field: keyof Pick<DailyProfitRow, "directExpenses" | "payroll" | "recurringCosts" | "serviceCharge">) => allDays.reduce((sum, day) => sum + day[field], 0);
  return {
    dailyByLocation,
    categories: [
      { key: "daily_operating", label: "Sheet expenses excl. HR", amount: total("directExpenses"), status: "actual" as const },
      { key: "salaries", label: "Manual salaries", amount: total("payroll"), status: "actual" as const },
      { key: "fixed_costs", label: "Manual fixed costs", amount: total("recurringCosts"), status: "actual" as const },
      { key: "service_charge", label: "Calculated service charge", amount: total("serviceCharge"), status: "actual" as const },
    ].sort((a, b) => b.amount - a.amount),
  };
}
