import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { calculateDailyProfit } from "./engine";
import type {
  DailyProfitResponse,
  DailyProfitRow,
  FinanceAdjustment,
  FinanceCostActual,
  FinanceCostRule,
  FinanceLegalEntity,
  FinanceLocation,
  FinancePayrollOverride,
  FinanceScopeType,
  PayrollPeriod,
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
    revenue: n(value.sales_drinks_net) + n(value.sales_ticket_net) + n(value.sales_snack_net) + n(value.sales_goodies_net) + n(value.sales_card_surcharge),
    vat: n(value.vat_7),
    directExpenses:
      n(value.exp_staff_food_cash) + n(value.exp_drinks_cash) + n(value.exp_goodies_cash) + n(value.exp_animals_cash)
      + n(value.exp_supply_cash) + n(value.exp_boss_fees_cash) + n(value.exp_other_cash)
      + n(value.exp_makro_bank) + n(value.exp_other_bank),
    hrCash: n(value.hr_salary_cash) + n(value.hr_salary_bank) + n(value.hr_challenge_cash) + n(value.hr_service_charge_cash) + n(value.hr_accompte_cash),
    cashIn: n(value.payment_cash) + n(value.payment_scan) + n(value.payment_credit_card),
  };
}

function sumDays(days: Iterable<DailyProfitRow>) {
  return Array.from(days).reduce((acc, day) => ({
    revenue: acc.revenue + day.revenue,
    directExpenses: acc.directExpenses + day.directExpenses,
    payroll: acc.payroll + day.payroll,
    recurringCosts: acc.recurringCosts + day.recurringCosts,
    adjustments: acc.adjustments + day.adjustments,
    economicProfit: acc.economicProfit + day.economicProfit,
    cashIn: acc.cashIn + day.cashIn,
    cashOut: acc.cashOut + day.cashOut,
    estimatedAmount: acc.estimatedAmount + day.estimatedAmount,
  }), { revenue: 0, directExpenses: 0, payroll: 0, recurringCosts: 0, adjustments: 0, economicProfit: 0, cashIn: 0, cashOut: 0, estimatedAmount: 0 });
}

export async function getDailyProfitData(
  supabase: SupabaseClient,
  params: { from: string; to: string; scopeType: FinanceScopeType; scopeId: string | null; canManage: boolean; allowedLocationIds?: string[] | null },
): Promise<DailyProfitResponse> {
  const extendedFrom = monthStart(params.from);
  const extendedTo = monthEnd(params.to);
  const periodMonths = monthsBetween(params.from, params.to);

  const [locationsResult, entitiesResult, assignmentsResult, mirrorResult, sourceResult, rulesResult, actualsResult, adjustmentsResult, overridesResult, paymentsResult, employeesResult, syncResult] = await Promise.all([
    supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase.from("finance_legal_entities").select("*").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase.from("finance_location_assignments").select("location_id,legal_entity_id,operational_start_date").eq("organization_id", DEFAULT_ORG_ID),
    supabase.from("finance_sheet_entries").select("location_id,entry_date,payload").eq("organization_id", DEFAULT_ORG_ID).gte("entry_date", extendedFrom).lte("entry_date", extendedTo),
    supabase.from("daily_entries").select("*").eq("organization_id", DEFAULT_ORG_ID).gte("entry_date", extendedFrom).lte("entry_date", extendedTo),
    supabase.from("finance_cost_rules").select("*").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true),
    supabase.from("finance_cost_actuals").select("*").eq("organization_id", DEFAULT_ORG_ID).lte("service_from", params.to).gte("service_to", params.from),
    supabase.from("finance_adjustments").select("*").eq("organization_id", DEFAULT_ORG_ID).gte("adjustment_date", params.from).lte("adjustment_date", params.to),
    supabase.from("finance_payroll_overrides").select("*").eq("organization_id", DEFAULT_ORG_ID).gte("period_year", periodMonths[0]?.year ?? 2000).lte("period_year", periodMonths.at(-1)?.year ?? 2100),
    supabase.from("employee_payment_records").select("*,adjustments:payment_adjustments(amount)").eq("organization_id", DEFAULT_ORG_ID).gte("period_year", periodMonths[0]?.year ?? 2000).lte("period_year", periodMonths.at(-1)?.year ?? 2100),
    supabase.from("employees").select("id,location_id,base_salary_monthly,service_charge_pct,active,archived_at").eq("organization_id", DEFAULT_ORG_ID).eq("active", true).is("archived_at", null),
    supabase.from("finance_sync_config").select("enabled,last_run_at,last_run_result").eq("organization_id", DEFAULT_ORG_ID).maybeSingle(),
  ]);

  const requiredResults = [locationsResult, entitiesResult, assignmentsResult, rulesResult, actualsResult, adjustmentsResult, overridesResult];
  const firstError = requiredResults.find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const assignmentMap = new Map((assignmentsResult.data ?? []).map((row) => [String(row.location_id), row]));
  const locations: FinanceLocation[] = (locationsResult.data ?? []).filter((row) => !params.allowedLocationIds || params.allowedLocationIds.includes(String(row.id))).map((row) => {
    const assignment = assignmentMap.get(String(row.id));
    return {
      id: String(row.id),
      name: String(row.name),
      legalEntityId: assignment?.legal_entity_id ? String(assignment.legal_entity_id) : null,
      operationalStartDate: assignment?.operational_start_date ? String(assignment.operational_start_date) : null,
    };
  });
  const legalEntities = (entitiesResult.data ?? []) as FinanceLegalEntity[];

  const selectedLocationIds = locations.filter((location) => {
    if (params.scopeType === "location") return location.id === params.scopeId;
    if (params.scopeType === "entity") return location.legalEntityId === params.scopeId;
    return true;
  }).map((location) => location.id);

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

  const overrideMap = new Map<string, FinancePayrollOverride>();
  for (const row of (overridesResult.data ?? []) as FinancePayrollOverride[]) {
    overrideMap.set(`${row.location_id}:${row.period_year}-${row.period_month}`, row);
  }
  const paymentMap = new Map<string, number>();
  for (const row of paymentsResult.data ?? []) {
    const key = `${row.location_id}:${row.period_year}-${row.period_month}`;
    const adjustmentTotal = ((row.adjustments ?? []) as Array<{ amount: number }>).reduce((sum, adjustment) => sum + n(adjustment.amount), 0);
    paymentMap.set(key, (paymentMap.get(key) ?? 0) + n(row.base_salary) + n(row.service_charge) + adjustmentTotal);
  }

  const payroll: PayrollPeriod[] = [];
  for (const location of locations) {
    for (const period of periodMonths) {
      const key = `${location.id}:${period.year}-${period.month}`;
      const override = overrideMap.get(key);
      if (override) {
        payroll.push({ locationId: location.id, year: period.year, month: period.month, amount: n(override.amount), status: override.value_status });
        continue;
      }
      if (paymentMap.has(key)) {
        payroll.push({ locationId: location.id, year: period.year, month: period.month, amount: paymentMap.get(key) ?? 0, status: "actual" });
        continue;
      }
      const employees = (employeesResult.data ?? []).filter((employee) => String(employee.location_id ?? "") === location.id);
      const baseSalary = employees.reduce((sum, employee) => sum + n(employee.base_salary_monthly), 0);
      const monthPrefix = `${period.year}-${String(period.month).padStart(2, "0")}`;
      const monthRevenue = allEntries.filter((entry) => entry.locationId === location.id && entry.date.startsWith(monthPrefix)).reduce((sum, entry) => sum + entry.revenue, 0);
      const serviceCharge = employees.reduce((sum, employee) => sum + monthRevenue * (n(employee.service_charge_pct) / 100), 0);
      payroll.push({ locationId: location.id, year: period.year, month: period.month, amount: baseSalary + serviceCharge, status: "estimated" });
    }
  }

  const engine = calculateDailyProfit({
    from: params.from,
    to: params.to,
    selectedLocationIds,
    locations,
    entries: allEntries,
    payroll,
    costRules: (rulesResult.data ?? []) as FinanceCostRule[],
    costActuals: (actualsResult.data ?? []) as FinanceCostActual[],
    adjustments: (adjustmentsResult.data ?? []) as FinanceAdjustment[],
  });

  const allDays = new Map<string, DailyProfitRow>();
  for (const days of Array.from(engine.dailyByLocation.values())) {
    for (const [date, day] of Array.from(days.entries())) {
      const target = allDays.get(date) ?? { ...day, revenue: 0, directExpenses: 0, payroll: 0, recurringCosts: 0, adjustments: 0, economicProfit: 0, margin: 0, cashIn: 0, cashOut: 0, estimatedAmount: 0, status: "actual" as const };
      target.revenue += day.revenue;
      target.directExpenses += day.directExpenses;
      target.payroll += day.payroll;
      target.recurringCosts += day.recurringCosts;
      target.adjustments += day.adjustments;
      target.economicProfit += day.economicProfit;
      target.cashIn += day.cashIn;
      target.cashOut += day.cashOut;
      target.estimatedAmount += day.estimatedAmount;
      target.margin = target.revenue > 0 ? target.economicProfit / target.revenue * 100 : 0;
      target.status = target.estimatedAmount > 0 ? "estimated" : "actual";
      allDays.set(date, target);
    }
  }
  const daily = Array.from(allDays.values()).sort((a, b) => a.date.localeCompare(b.date));
  const totals = sumDays(daily);
  const totalCosts = totals.directExpenses + totals.payroll + totals.recurringCosts - totals.adjustments;

  const byScope = selectedLocationIds.map((locationId) => {
    const location = locations.find((row) => row.id === locationId)!;
    const sum = sumDays(engine.dailyByLocation.get(locationId)?.values() ?? []);
    const costs = sum.directExpenses + sum.payroll + sum.recurringCosts - sum.adjustments;
    return { id: locationId, name: location.name, revenue: sum.revenue, costs, economicProfit: sum.economicProfit, margin: sum.revenue > 0 ? sum.economicProfit / sum.revenue * 100 : 0, estimatedAmount: sum.estimatedAmount };
  }).sort((a, b) => b.economicProfit - a.economicProfit);

  const selectedEntries = allEntries.filter((entry) => selectedLocationIds.includes(entry.locationId) && entry.date >= params.from && entry.date <= params.to);
  const latestSheetDate = selectedEntries.map((entry) => entry.date).sort().at(-1) ?? null;
  const missingAssignments = locations.filter((location) => !location.legalEntityId).map((location) => `${location.name}: company not assigned`);
  const selectedRules = (rulesResult.data ?? []).filter((rule) => {
    if (rule.scope_type === "group") return true;
    if (rule.scope_type === "location") return selectedLocationIds.includes(String(rule.location_id));
    return locations.some((location) => selectedLocationIds.includes(location.id) && location.legalEntityId === rule.legal_entity_id);
  });
  const payrollEstimatedMonths = payroll.filter((row) => selectedLocationIds.includes(row.locationId) && row.status === "estimated").length;
  const warnings: string[] = [];
  if ((mirrorResult.data ?? []).length === 0) warnings.push("Finance mirror is empty; Daily P&L is using read-only Accounting fallback data.");
  if (!syncResult.data?.enabled) warnings.push("Automatic Daily P&L Sheets sync is disabled.");
  if (latestSheetDate && latestSheetDate < params.to) warnings.push(`Latest available daily entry is ${latestSheetDate}.`);
  if (payrollEstimatedMonths > 0) warnings.push(`${payrollEstimatedMonths} shop-month payroll total${payrollEstimatedMonths === 1 ? " is" : "s are"} estimated.`);
  if (selectedRules.length === 0) warnings.push("No recurring cost rules cover this scope yet.");
  const penalty = warnings.length * 12 + missingAssignments.length * 8;

  const entityName = legalEntities.find((entity) => entity.id === params.scopeId)?.name;
  const locationName = locations.find((location) => location.id === params.scopeId)?.name;

  return {
    period: { from: params.from, to: params.to },
    asOf: new Date().toISOString(),
    scope: { type: params.scopeType, id: params.scopeId, label: params.scopeType === "group" ? "All companies" : entityName ?? locationName ?? "Unknown scope" },
    canManage: params.canManage,
    legalEntities,
    locations,
    summary: {
      ...totals,
      totalCosts,
      margin: totals.revenue > 0 ? totals.economicProfit / totals.revenue * 100 : 0,
      netCash: totals.cashIn - totals.cashOut,
    },
    daily,
    byScope,
    categories: engine.categories,
    coverage: {
      score: Math.max(0, 100 - penalty),
      mirrorActive: (mirrorResult.data ?? []).length > 0,
      latestSheetDate,
      lastSyncAt: syncResult.data?.last_run_at ?? null,
      payrollEstimatedMonths,
      missingCostSetup: missingAssignments,
      warnings,
    },
  };
}
