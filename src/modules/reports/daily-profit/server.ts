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
    bonus: (acc.bonus ?? 0) + (day.bonus ?? 0),
    adjustments: 0,
    economicProfit: acc.economicProfit + day.economicProfit,
    cashIn: acc.cashIn + day.cashIn,
    cashOut: acc.cashOut + day.cashOut,
    estimatedAmount: 0,
  }), { revenue: 0, directExpenses: 0, payroll: 0, recurringCosts: 0, serviceCharge: 0, bonus: 0, adjustments: 0, economicProfit: 0, cashIn: 0, cashOut: 0, estimatedAmount: 0 } as { revenue: number; directExpenses: number; payroll: number; recurringCosts: number; serviceCharge: number; bonus: number; adjustments: number; economicProfit: number; cashIn: number; cashOut: number; estimatedAmount: number });
}

export async function getDailyProfitData(
  supabase: SupabaseClient,
  params: { from: string; to: string; scopeType: FinanceScopeType; scopeIds: string[]; canManage: boolean; allowedLocationIds?: string[] | null },
): Promise<DailyProfitResponse> {
  const extendedFrom = monthStart(params.from);
  const extendedTo = monthEnd(params.to);
  const periodMonths = monthsBetween(params.from, params.to);

  const snapshotsPromise = (async () => {
    try {
      const res = await supabase.from("finance_monthly_snapshots").select("*").eq("organization_id", DEFAULT_ORG_ID).gte("period_year", periodMonths[0]?.year ?? 2000).lte("period_year", periodMonths.at(-1)?.year ?? 2200);
      return res as unknown as { data: Array<Record<string, unknown>> | null; error: unknown };
    } catch {
      return { data: null, error: null } as unknown as { data: Array<Record<string, unknown>> | null; error: unknown };
    }
  })();

  const [locationsResult, entitiesResult, assignmentsResult, mirrorResult, sourceResult, inputsResult, syncResult, snapshotsResult] = await Promise.all([
    supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase.from("finance_legal_entities").select("*").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase.from("finance_location_assignments").select("location_id,legal_entity_id,operational_start_date").eq("organization_id", DEFAULT_ORG_ID),
    supabase.from("finance_sheet_entries").select("location_id,entry_date,payload").eq("organization_id", DEFAULT_ORG_ID).gte("entry_date", extendedFrom).lte("entry_date", extendedTo),
    supabase.from("daily_entries").select("*").eq("organization_id", DEFAULT_ORG_ID).gte("entry_date", extendedFrom).lte("entry_date", extendedTo),
    supabase.from("finance_shop_monthly_inputs").select("*").eq("organization_id", DEFAULT_ORG_ID).gte("period_year", periodMonths[0]?.year ?? 2000).lte("period_year", periodMonths.at(-1)?.year ?? 2200),
    supabase.from("finance_sync_config").select("enabled,last_run_at,last_run_result").eq("organization_id", DEFAULT_ORG_ID).maybeSingle(),
    snapshotsPromise,
  ]);
  const firstError = [locationsResult, entitiesResult, assignmentsResult, inputsResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const assignmentMap = new Map(((assignmentsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.location_id), row as unknown as { legal_entity_id: string | null; operational_start_date: string | null }]));
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
  const selectedLocationIds = locations.filter((location) => params.scopeType === "group" || params.scopeIds.includes(location.id)).map((location) => location.id);

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
  const rawMonthlyInputs = ((inputsResult.data ?? []) as FinanceShopMonthlyInput[]).filter((row) =>
    periodMonths.some((period) => period.year === Number(row.period_year) && period.month === Number(row.period_month)),
  );
  // Overlay monthly snapshots (recurring costs module) on top of manual inputs for reports.
  // Snapshots are the source of truth for payroll / recurring / service charge / bonus when present.
  const snapshots = (snapshotsResult as { data: Array<Record<string, unknown>> | null })?.data ?? [];
  const snapshotMap = new Map(snapshots.map((s) => [`${String(s.location_id)}:${Number(s.period_year)}-${Number(s.period_month)}`, s]));
  const monthlyInputs: FinanceShopMonthlyInput[] = [];
  const seenKeys = new Set<string>();
  for (const row of rawMonthlyInputs) {
    const key = `${row.location_id}:${row.period_year}-${row.period_month}`;
    seenKeys.add(key);
    const snap = snapshotMap.get(key) as Record<string, unknown> | undefined;
    if (snap) {
      monthlyInputs.push({
        ...row,
        salaries_amount: Number(snap.payroll_amount ?? row.salaries_amount),
        other_fixed_amount: Number(snap.recurring_costs_amount ?? (Number(row.rent_amount ?? 0) + Number(row.electricity_amount ?? 0) + Number(row.water_amount ?? 0) + Number(row.other_fixed_amount ?? 0))),
        rent_amount: 0,
        electricity_amount: 0,
        water_amount: 0,
        service_charge_rate_pct: Number(snap.service_charge_rate_pct ?? row.service_charge_rate_pct),
        employee_count: Number(snap.employee_count ?? row.employee_count),
        bonus_amount: Number(snap.challenge_bonus_amount ?? (row as { bonus_amount?: number }).bonus_amount ?? 0),
      });
    } else {
      // Ensure bonus_amount exists even when no snapshot
      monthlyInputs.push({ ...row, bonus_amount: Number((row as { bonus_amount?: number }).bonus_amount ?? 0) });
    }
  }
  // Snapshots that have no manual input yet should still create a row for the engine.
  for (const snap of snapshots) {
    const key = `${String(snap.location_id)}:${Number(snap.period_year)}-${Number(snap.period_month)}`;
    if (seenKeys.has(key)) continue;
    if (!periodMonths.some((p) => p.year === Number(snap.period_year) && p.month === Number(snap.period_month))) continue;
    monthlyInputs.push({
      id: String(snap.id),
      location_id: String(snap.location_id),
      period_year: Number(snap.period_year),
      period_month: Number(snap.period_month),
      salaries_amount: Number(snap.payroll_amount ?? 0),
      rent_amount: 0,
      electricity_amount: 0,
      water_amount: 0,
      other_fixed_amount: Number(snap.recurring_costs_amount ?? 0),
      service_charge_rate_pct: Number(snap.service_charge_rate_pct ?? 0),
      employee_count: Number(snap.employee_count ?? 0),
      bonus_amount: Number(snap.challenge_bonus_amount ?? 0),
    });
    seenKeys.add(key);
  }

  // Fallback for months still missing (no manual input nor snapshot): synthesize from live rules/payroll/service settings + challenge bonus
  // This ensures past months like 2026-08 show correct HR values even before a snapshot is manually saved.
  const stillMissing: Array<{ locationId: string; period: { year: number; month: number } }> = [];
  for (const locationId of selectedLocationIds) {
    for (const period of periodMonths) {
      const key = `${locationId}:${period.year}-${period.month}`;
      if (!seenKeys.has(key)) stillMissing.push({ locationId, period });
    }
  }
  if (stillMissing.length > 0) {
    try {
      const [costRulesRes, employeesRes, shopSettingsRes] = await Promise.all([
        supabase.from("finance_cost_rules").select("location_id,estimated_amount").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).neq("category", "legacy_fixed_expenses"),
        supabase.from("employees").select("id, location_id, base_salary_monthly, employee_locations(location_id, base_salary_monthly)").eq("organization_id", DEFAULT_ORG_ID).eq("active", true),
        supabase.from("finance_shop_settings").select("location_id,service_charge_rate_pct").eq("organization_id", DEFAULT_ORG_ID),
      ]);
      const costByLoc = new Map<string, number>();
      for (const r of (costRulesRes.data as Array<{ location_id: string; estimated_amount: number }> | null) ?? []) {
        costByLoc.set(String(r.location_id), (costByLoc.get(String(r.location_id)) ?? 0) + Number(r.estimated_amount ?? 0));
      }
      const payrollByLoc: Record<string, number> = {};
      const countByLoc: Record<string, number> = {};
      for (const emp of (employeesRes.data as Array<{ id: string; location_id: string | null; base_salary_monthly: number | null; employee_locations: Array<{ location_id: string; base_salary_monthly: number | null }> | null }> | null) ?? []) {
        const assignments = (emp.employee_locations as unknown as Array<{ location_id: string; base_salary_monthly: number | null }> | null) ?? [];
        if (assignments.length > 0) {
          for (const a of assignments) {
            const loc = String(a.location_id);
            payrollByLoc[loc] = (payrollByLoc[loc] ?? 0) + Number(a.base_salary_monthly ?? emp.base_salary_monthly ?? 0);
            countByLoc[loc] = (countByLoc[loc] ?? 0) + 1;
          }
        } else if (emp.location_id) {
          const loc = String(emp.location_id);
          payrollByLoc[loc] = (payrollByLoc[loc] ?? 0) + Number(emp.base_salary_monthly ?? 0);
          countByLoc[loc] = (countByLoc[loc] ?? 0) + 1;
        }
      }
      const rateByLoc = new Map(((shopSettingsRes.data as Array<{ location_id: string; service_charge_rate_pct: number }> | null) ?? []).map((s) => [String(s.location_id), Number(s.service_charge_rate_pct ?? 0)]));
      // Bonus per month (group by month)
      const bonusByKey = new Map<string, Map<string, number>>();
      const distinctMonths = Array.from(new Set(stillMissing.map((m) => `${m.period.year}-${String(m.period.month).padStart(2, "0")}`)));
      for (const monthKey of distinctMonths) {
        try {
          const { getChallengesOverview } = await import("@/modules/challenges/overview-data");
          const overviews = await getChallengesOverview(monthKey);
          const perLoc = new Map<string, number>();
          for (const o of overviews) {
            const titleKey = String(o.locationTitle).replace(/^Capybara Coffee\s*/i, "").trim().toLowerCase();
            // map title to internal location id via selected locations names
            const match = locations.find((l) => titleKey.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(titleKey));
            if (match) perLoc.set(match.id, Number(o.totalBonus ?? 0));
          }
          bonusByKey.set(monthKey, perLoc);
        } catch { bonusByKey.set(monthKey, new Map()); }
      }
      for (const { locationId, period } of stillMissing) {
        const key = `${locationId}:${period.year}-${period.month}`;
        const monthKey = `${period.year}-${String(period.month).padStart(2, "0")}`;
        const rawBonus = bonusByKey.get(monthKey)?.get(locationId) ?? 0;
        const empCountForBonus = countByLoc[locationId] ?? 0;
        const bonus = rawBonus > 0 && empCountForBonus > 0 ? rawBonus * empCountForBonus : rawBonus;
        monthlyInputs.push({
          id: `fallback:${key}`,
          location_id: locationId,
          period_year: period.year,
          period_month: period.month,
          salaries_amount: payrollByLoc[locationId] ?? 0,
          rent_amount: 0,
          electricity_amount: 0,
          water_amount: 0,
          other_fixed_amount: costByLoc.get(locationId) ?? 0,
          service_charge_rate_pct: rateByLoc.get(locationId) ?? 0,
          employee_count: countByLoc[locationId] ?? 0,
          bonus_amount: bonus,
        });
        seenKeys.add(key);
      }
    } catch { /* fallback is best-effort */ }
  }

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
      const target = allDays.get(date) ?? { ...day, revenue: 0, directExpenses: 0, payroll: 0, recurringCosts: 0, serviceCharge: 0, bonus: 0, adjustments: 0, economicProfit: 0, margin: 0, cashIn: 0, cashOut: 0, estimatedAmount: 0, status: "actual" as const };
      target.revenue += day.revenue;
      target.directExpenses += day.directExpenses;
      target.payroll += day.payroll;
      target.recurringCosts += day.recurringCosts;
      target.serviceCharge += day.serviceCharge;
      target.bonus += day.bonus ?? 0;
      target.economicProfit += day.economicProfit;
      target.cashIn += day.cashIn;
      target.cashOut += day.cashOut;
      target.margin = target.revenue > 0 ? target.economicProfit / target.revenue * 100 : 0;
      allDays.set(date, target);
    }
  }
  const daily = Array.from(allDays.values()).sort((a, b) => a.date.localeCompare(b.date));
  const totals = sumDays(daily);
  const totalCosts = totals.directExpenses + totals.payroll + totals.recurringCosts + totals.serviceCharge + totals.bonus;
  const byScope = selectedLocationIds.map((locationId) => {
    const location = locations.find((row) => row.id === locationId)!;
    const sum = sumDays(engine.dailyByLocation.get(locationId)?.values() ?? []);
    const costs = sum.directExpenses + sum.payroll + sum.recurringCosts + sum.serviceCharge + sum.bonus;
    return { id: locationId, name: location.name, revenue: sum.revenue, costs, economicProfit: sum.economicProfit, margin: sum.revenue > 0 ? sum.economicProfit / sum.revenue * 100 : 0, estimatedAmount: 0 };
  }).sort((a, b) => b.economicProfit - a.economicProfit);

  const selectedEntries = allEntries.filter((entry) => selectedLocationIds.includes(entry.locationId) && entry.date >= params.from && entry.date <= params.to);
  const latestSheetDate = selectedEntries.map((entry) => entry.date).sort().at(-1) ?? null;
  const missingInputs: string[] = [];
  for (const locationId of selectedLocationIds) {
    const locationName = locations.find((row) => row.id === locationId)?.name ?? "Shop";
    for (const period of periodMonths) {
      if (!monthlyInputs.some((row) => row.location_id === locationId && Number(row.period_year) === period.year && Number(row.period_month) === period.month)) {
        missingInputs.push(`${locationName}: ${period.year}-${String(period.month).padStart(2, "0")} not entered`);
      }
    }
  }
  const warnings: string[] = [];
  if ((mirrorResult.data ?? []).length === 0) warnings.push("The finance mirror is empty: reading directly from Accounting data.");
  if (!syncResult.data?.enabled) warnings.push("Automatic Daily P&L synchronisation is disabled.");
  if (latestSheetDate && latestSheetDate < params.to) warnings.push(`Latest daily data available: ${latestSheetDate}.`);
  if (missingInputs.length > 0) warnings.push(`${missingInputs.length} missing shop/month entry(ies), counted as zero.`);

  const shopSettings = monthlyInputs
    .filter((row) => selectedLocationIds.includes(row.location_id))
    .map((row) => ({
      locationId: row.location_id,
      locationName: locations.find((location) => location.id === row.location_id)?.name ?? "Shop",
      period: `${row.period_year}-${String(row.period_month).padStart(2, "0")}`,
      salaries: n(row.salaries_amount), rent: n(row.rent_amount), electricity: n(row.electricity_amount), water: n(row.water_amount), otherFixed: n(row.other_fixed_amount),
      serviceChargeRatePct: n(row.service_charge_rate_pct), employeeCount: n(row.employee_count), bonus: n((row as { bonus_amount?: number }).bonus_amount),
    }))
    .sort((a, b) => a.period.localeCompare(b.period) || a.locationName.localeCompare(b.locationName));
  const scopeLabel = params.scopeType === "group"
    ? "Global"
    : locations.filter((location) => params.scopeIds.includes(location.id)).map((location) => location.name).join(" + ") || "Shop";

  return {
    period: { from: params.from, to: params.to },
    asOf: new Date().toISOString(),
    scope: { type: params.scopeType, id: params.scopeIds[0] ?? null, label: scopeLabel },
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
