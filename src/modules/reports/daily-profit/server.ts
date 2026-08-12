import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { calculateDailyProfit } from "./engine";
import { DAILY_PROFIT_METHODOLOGY } from "./methodology";
import type {
  DailyProfitResponse,
  DailyProfitRow,
  FinanceLegalEntity,
  FinanceLocation,
  FinanceScopeType,
  FinanceShopMonthlyInput,
  SourceDailyEntry,
} from "./types";

function n(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthStart(value: string): string { return `${value.slice(0, 7)}-01`; }
function monthEnd(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function monthsBetween(from: string, to: string): Array<{ year: number; month: number }> {
  const [startYear, startMonth] = from.split("-").map(Number);
  const [endYear, endMonth] = to.split("-").map(Number);
  const result: Array<{ year: number; month: number }> = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push({ year, month });
    month += 1;
    if (month === 13) { month = 1; year += 1; }
  }
  return result;
}

function toSourceEntry(row: Record<string, unknown>, payload?: Record<string, unknown>): SourceDailyEntry {
  const value = payload ?? row;
  return {
    locationId: String(row.location_id),
    date: String(row.entry_date),
    revenue: DAILY_PROFIT_METHODOLOGY.revenueFields.reduce((sum, field) => sum + n(value[field]), 0),
    vat: n(value.vat_7),
    directExpenses: DAILY_PROFIT_METHODOLOGY.expenseFields.reduce((sum, field) => sum + n(value[field]), 0),
    hrCash: DAILY_PROFIT_METHODOLOGY.excludedFields.reduce((sum, field) => sum + n(value[field]), 0),
    cashIn: n(value.payment_cash) + n(value.payment_scan) + n(value.payment_credit_card),
  };
}

function sumDays(days: Iterable<DailyProfitRow>) {
  return Array.from(days).reduce((acc, day) => ({
    revenue: acc.revenue + day.revenue,
    directExpenses: acc.directExpenses + day.directExpenses,
    payroll: acc.payroll + day.payroll,
    recurringCosts: acc.recurringCosts + day.recurringCosts,
    serviceCharge: acc.serviceCharge + day.serviceCharge,
    adjustments: 0,
    economicProfit: acc.economicProfit + day.economicProfit,
    cashIn: acc.cashIn + day.cashIn,
    cashOut: acc.cashOut + day.cashOut,
    estimatedAmount: 0,
  }), { revenue: 0, directExpenses: 0, payroll: 0, recurringCosts: 0, serviceCharge: 0, adjustments: 0, economicProfit: 0, cashIn: 0, cashOut: 0, estimatedAmount: 0 });
}

export async function getDailyProfitData(
  supabase: SupabaseClient,
  params: { from: string; to: string; scopeType: FinanceScopeType; scopeId: string | null; canManage: boolean; allowedLocationIds?: string[] | null },
): Promise<DailyProfitResponse> {
  const extendedFrom = monthStart(params.from);
  const extendedTo = monthEnd(params.to);
  const periodMonths = monthsBetween(params.from, params.to);

  const [locationsResult, entitiesResult, assignmentsResult, mirrorResult, sourceResult, inputsResult, syncResult] = await Promise.all([
    supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase.from("finance_legal_entities").select("*").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase.from("finance_location_assignments").select("location_id,legal_entity_id,operational_start_date").eq("organization_id", DEFAULT_ORG_ID),
    supabase.from("finance_sheet_entries").select("location_id,entry_date,payload").eq("organization_id", DEFAULT_ORG_ID).gte("entry_date", extendedFrom).lte("entry_date", extendedTo),
    supabase.from("daily_entries").select("*").eq("organization_id", DEFAULT_ORG_ID).gte("entry_date", extendedFrom).lte("entry_date", extendedTo),
    supabase.from("finance_shop_monthly_inputs").select("*").eq("organization_id", DEFAULT_ORG_ID).gte("period_year", periodMonths[0]?.year ?? 2000).lte("period_year", periodMonths.at(-1)?.year ?? 2200),
    supabase.from("finance_sync_config").select("enabled,last_run_at,last_run_result").eq("organization_id", DEFAULT_ORG_ID).maybeSingle(),
  ]);
  const firstError = [locationsResult, entitiesResult, assignmentsResult, inputsResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const assignmentMap = new Map((assignmentsResult.data ?? []).map((row) => [String(row.location_id), row]));
  const locations: FinanceLocation[] = (locationsResult.data ?? [])
    .filter((row) => !params.allowedLocationIds || params.allowedLocationIds.includes(String(row.id)))
    .map((row) => {
      const assignment = assignmentMap.get(String(row.id));
      return {
        id: String(row.id),
        name: String(row.name),
        legalEntityId: assignment?.legal_entity_id ? String(assignment.legal_entity_id) : null,
        operationalStartDate: assignment?.operational_start_date ? String(assignment.operational_start_date) : null,
      };
    });
  const selectedLocationIds = locations.filter((location) => params.scopeType === "group" || location.id === params.scopeId).map((location) => location.id);

  const entryMap = new Map<string, SourceDailyEntry>();
  for (const row of sourceResult.data ?? []) {
    const source = toSourceEntry(row as Record<string, unknown>);
    entryMap.set(`${source.locationId}:${source.date}`, source);
  }
  for (const row of mirrorResult.data ?? []) {
    const source = toSourceEntry(row as Record<string, unknown>, (row.payload ?? {}) as Record<string, unknown>);
    entryMap.set(`${source.locationId}:${source.date}`, source);
  }
  const allEntries = Array.from(entryMap.values());
  const monthlyInputs = ((inputsResult.data ?? []) as FinanceShopMonthlyInput[]).filter((row) =>
    periodMonths.some((period) => period.year === Number(row.period_year) && period.month === Number(row.period_month)),
  );

  const engine = calculateDailyProfit({
    from: params.from,
    to: params.to,
    selectedLocationIds,
    locations,
    entries: allEntries,
    monthlyInputs,
  });

  const allDays = new Map<string, DailyProfitRow>();
  for (const days of Array.from(engine.dailyByLocation.values())) {
    for (const [date, day] of Array.from(days.entries())) {
      const target = allDays.get(date) ?? { ...day, revenue: 0, directExpenses: 0, payroll: 0, recurringCosts: 0, serviceCharge: 0, adjustments: 0, economicProfit: 0, margin: 0, cashIn: 0, cashOut: 0, estimatedAmount: 0, status: "actual" as const };
      target.revenue += day.revenue;
      target.directExpenses += day.directExpenses;
      target.payroll += day.payroll;
      target.recurringCosts += day.recurringCosts;
      target.serviceCharge += day.serviceCharge;
      target.economicProfit += day.economicProfit;
      target.cashIn += day.cashIn;
      target.cashOut += day.cashOut;
      target.margin = target.revenue > 0 ? target.economicProfit / target.revenue * 100 : 0;
      allDays.set(date, target);
    }
  }
  const daily = Array.from(allDays.values()).sort((a, b) => a.date.localeCompare(b.date));
  const totals = sumDays(daily);
  const totalCosts = totals.directExpenses + totals.payroll + totals.recurringCosts + totals.serviceCharge;
  const byScope = selectedLocationIds.map((locationId) => {
    const location = locations.find((row) => row.id === locationId)!;
    const sum = sumDays(engine.dailyByLocation.get(locationId)?.values() ?? []);
    const costs = sum.directExpenses + sum.payroll + sum.recurringCosts + sum.serviceCharge;
    return { id: locationId, name: location.name, revenue: sum.revenue, costs, economicProfit: sum.economicProfit, margin: sum.revenue > 0 ? sum.economicProfit / sum.revenue * 100 : 0, estimatedAmount: 0 };
  }).sort((a, b) => b.economicProfit - a.economicProfit);

  const selectedEntries = allEntries.filter((entry) => selectedLocationIds.includes(entry.locationId) && entry.date >= params.from && entry.date <= params.to);
  const latestSheetDate = selectedEntries.map((entry) => entry.date).sort().at(-1) ?? null;
  const missingInputs: string[] = [];
  for (const locationId of selectedLocationIds) {
    const locationName = locations.find((row) => row.id === locationId)?.name ?? "Shop";
    for (const period of periodMonths) {
      if (!monthlyInputs.some((row) => row.location_id === locationId && Number(row.period_year) === period.year && Number(row.period_month) === period.month)) {
        missingInputs.push(`${locationName}: ${period.year}-${String(period.month).padStart(2, "0")} non renseigné`);
      }
    }
  }
  const warnings: string[] = [];
  if ((mirrorResult.data ?? []).length === 0) warnings.push("Le miroir finance est vide : lecture directe des données Accounting.");
  if (!syncResult.data?.enabled) warnings.push("La synchronisation automatique Daily P&L est désactivée.");
  if (latestSheetDate && latestSheetDate < params.to) warnings.push(`Dernière donnée quotidienne disponible : ${latestSheetDate}.`);
  if (missingInputs.length > 0) warnings.push(`${missingInputs.length} saisie(s) shop/mois manquante(s), comptée(s) à zéro.`);

  const shopSettings = monthlyInputs
    .filter((row) => selectedLocationIds.includes(row.location_id))
    .map((row) => ({
      locationId: row.location_id,
      locationName: locations.find((location) => location.id === row.location_id)?.name ?? "Shop",
      period: `${row.period_year}-${String(row.period_month).padStart(2, "0")}`,
      salaries: n(row.salaries_amount), rent: n(row.rent_amount), electricity: n(row.electricity_amount), water: n(row.water_amount), otherFixed: n(row.other_fixed_amount),
      serviceChargeRatePct: n(row.service_charge_rate_pct), employeeCount: n(row.employee_count),
    }))
    .sort((a, b) => a.period.localeCompare(b.period) || a.locationName.localeCompare(b.locationName));
  const locationName = locations.find((location) => location.id === params.scopeId)?.name;

  return {
    period: { from: params.from, to: params.to },
    asOf: new Date().toISOString(),
    scope: { type: params.scopeType, id: params.scopeId, label: params.scopeType === "group" ? "Global" : locationName ?? "Shop" },
    canManage: params.canManage,
    legalEntities: (entitiesResult.data ?? []) as FinanceLegalEntity[],
    locations,
    summary: { ...totals, totalCosts, margin: totals.revenue > 0 ? totals.economicProfit / totals.revenue * 100 : 0, netCash: totals.cashIn - totals.cashOut },
    daily,
    byScope,
    categories: engine.categories,
    coverage: {
      score: Math.max(0, 100 - warnings.length * 10 - missingInputs.length * 5),
      mirrorActive: (mirrorResult.data ?? []).length > 0,
      latestSheetDate,
      lastSyncAt: syncResult.data?.last_run_at ?? null,
      payrollEstimatedMonths: 0,
      missingCostSetup: missingInputs,
      warnings,
    },
    methodology: { ...DAILY_PROFIT_METHODOLOGY, shopSettings },
  };
}
