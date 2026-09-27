import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasAllLocationsAccess, hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { salesNetTotal, type DailyEntry } from "@/modules/accounting/types";
import { liveSalaryShare, type LiveSalaryEmployee } from "@/modules/finance/lib/hr";
import {
  computeEndOfMonthTotals,
  END_OF_MONTH_CATEGORIES,
  isValidMonthParam,
  latestSafePerShop,
  mapRecurringCategory,
  monthBounds,
  shortShopName,
  type EndOfMonthCategory,
  type EndOfMonthCategoryKey,
} from "@/modules/direction/lib/endOfMonth";

type CostRule = {
  id: string;
  location_id: string | null;
  category: string;
  label: string | null;
  estimated_amount: number | null;
  scope_type: string | null;
};

type EmployeeRow = LiveSalaryEmployee & {
  id: string;
  active?: boolean | null;
  deleted_at?: string | null;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (
    !hasModuleAccess(perms, "direction") &&
    !hasModuleAccess(perms, "accounting") &&
    !hasModuleAccess(perms, "reports")
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthParam = searchParams.get("month") ?? defaultMonth;
  if (!isValidMonthParam(monthParam)) {
    return Response.json({ error: "Invalid month, expected YYYY-MM" }, { status: 400 });
  }
  const year = Number(monthParam.slice(0, 4));
  const month = Number(monthParam.slice(5, 7));
  const bounds = monthBounds(year, month);
  const ym = `${year}-${String(month).padStart(2, "0")}`;

  const supabase = getSupabaseServerClient();

  const [{ data: locsData }, { data: entriesData }, { data: employeesData }, { data: costRulesData }, { data: costOverridesData }] =
    await Promise.all([
      supabase.from("locations").select("id, name, default_service_charge_pct").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
      supabase
        .from("daily_entries")
        .select("location_id, entry_date, cash_safe, sales_drinks_net, sales_ticket_net, sales_snack_net, sales_goodies_net, sales_card_surcharge")
        .eq("organization_id", DEFAULT_ORG_ID)
        .gte("entry_date", bounds.start)
        .lte("entry_date", bounds.end),
      supabase
        .from("employees")
        .select("id, location_id, base_salary_monthly, service_charge_pct, service_charge_eligible, employee_locations(location_id, base_salary_monthly, service_charge_eligible)")
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("active", true),
      supabase
        .from("recurring_costs")
        .select("id, location_id, category, label, estimated_amount, scope_type")
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("is_active", true)
        .neq("category", "legacy_fixed_expenses"),
      supabase
        .from("recurring_cost_overrides")
        .select("cost_rule_id, service_from, amount")
        .eq("organization_id", DEFAULT_ORG_ID)
        .gte("service_from", bounds.start)
        .lt("service_from", bounds.nextMonthStart),
    ]);

  // Manual payment adjustments for the month (kept valid even before Generate).
  const adjByLoc = new Map<string, number>();
  try {
    const { data: recordsData } = await supabase
      .from("employee_payment_records")
      .select("id, location_id")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("period_year", year)
      .eq("period_month", month);
    const records = (recordsData ?? []) as { id: string; location_id: string }[];
    const locByRecord = new Map(records.map((r) => [String(r.id), String(r.location_id)]));
    if (records.length > 0) {
      const { data: adjData } = await supabase
        .from("payment_adjustments")
        .select("payment_record_id, amount")
        .in("payment_record_id", records.map((r) => r.id));
      for (const a of ((adjData ?? []) as { payment_record_id: string; amount: number }[])) {
        const loc = locByRecord.get(String(a.payment_record_id));
        if (loc) adjByLoc.set(loc, (adjByLoc.get(loc) ?? 0) + Number(a.amount ?? 0));
      }
    }
  } catch {
    // adjustments are a bonus — live base + service charge stand on their own
  }

  const rawLocations = ((locsData ?? []) as { id: string; name: string; default_service_charge_pct?: number | null }[]);
  const locations = hasAllLocationsAccess(perms)
    ? rawLocations
    : rawLocations.filter((l) => perms.location_access.some((a) => a.location_id === l.id));
  const selectedIds = new Set(locations.map((l) => l.id));

  const monthEntries = (((entriesData ?? []) as unknown[]) as (DailyEntry & { location_id: string; entry_date: string })[]).filter((e) =>
    selectedIds.has(e.location_id),
  );

  // ── 1. Espèces en coffre: latest entered cash_safe per shop within the month ──
  const safes = latestSafePerShop(
    monthEntries.map((e) => ({ location_id: e.location_id, entry_date: e.entry_date, cash_safe: e.cash_safe ?? null })),
    locations,
  );

  // ── 2a. Salaires (live): base actuelle + service charge au jour J + ajustements ──
  const revenueByLoc = new Map<string, number>();
  for (const e of monthEntries) {
    revenueByLoc.set(e.location_id, (revenueByLoc.get(e.location_id) ?? 0) + salesNetTotal(e));
  }
  const staff = ((employeesData ?? []) as EmployeeRow[]).filter((row) => !row.deleted_at);
  const salaryLines = locations.map((loc) => {
    const defaultPct = Number(loc.default_service_charge_pct ?? 1);
    const revenue = revenueByLoc.get(loc.id) ?? 0;
    let base = 0;
    let serviceCharge = 0;
    let headcount = 0;
    for (const emp of staff) {
      const share = liveSalaryShare(emp, loc.id, revenue, defaultPct);
      if (!share) continue;
      headcount += 1;
      base += share.base;
      serviceCharge += share.serviceCharge;
    }
    const adjustments = Math.round(adjByLoc.get(loc.id) ?? 0);
    return {
      label: shortShopName(loc.name),
      amount: Math.round(base + serviceCharge) + adjustments,
      headcount,
    };
  });
  const salaires: EndOfMonthCategory = {
    key: "salaires",
    label: "Salaires",
    total: salaryLines.reduce((sum, l) => sum + l.amount, 0),
    finalized: true,
    paymentCount: salaryLines.reduce((sum, l) => sum + l.headcount, 0),
    lines: salaryLines.filter((l) => l.amount !== 0).map(({ label, amount }) => ({ label, amount })),
  };

  // ── 2b. Loyers / Marketing / Fournisseurs / Autres: recurring rules + overrides ──
  const overrideByRule = new Map<string, number>();
  for (const o of ((costOverridesData ?? []) as { cost_rule_id: string; service_from: string; amount: number }[])) {
    overrideByRule.set(`${o.cost_rule_id}|${String(o.service_from).slice(0, 7)}`, Number(o.amount ?? 0));
  }
  const bucketTotals = new Map<EndOfMonthCategoryKey, number>();
  const bucketLines = new Map<EndOfMonthCategoryKey, Map<string, number>>();
  const bucketRules = new Map<EndOfMonthCategoryKey, number>();
  const pushLine = (bucket: EndOfMonthCategoryKey, locationId: string, amount: number) => {
    if (!bucketLines.has(bucket)) bucketLines.set(bucket, new Map());
    const m = bucketLines.get(bucket)!;
    m.set(locationId, (m.get(locationId) ?? 0) + amount);
  };
  const rules = ((costRulesData ?? []) as CostRule[]);
  const locationRules = rules.filter((r) => r.scope_type === "location" && r.location_id && selectedIds.has(r.location_id));
  const multiShopRules = rules.filter((r) => r.scope_type !== "location");
  const ruleAmount = (r: CostRule) => overrideByRule.get(`${r.id}|${ym}`) ?? Number(r.estimated_amount ?? 0);
  for (const r of locationRules) {
    const bucket = mapRecurringCategory(r.category);
    const amount = ruleAmount(r);
    bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + amount);
    bucketRules.set(bucket, (bucketRules.get(bucket) ?? 0) + 1);
    pushLine(bucket, r.location_id as string, amount);
  }
  if (multiShopRules.length > 0 && locations.length > 0) {
    for (const r of multiShopRules) {
      const bucket = mapRecurringCategory(r.category);
      const share = ruleAmount(r) / locations.length;
      bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + share * locations.length);
      bucketRules.set(bucket, (bucketRules.get(bucket) ?? 0) + 1);
      for (const loc of locations) pushLine(bucket, loc.id, share);
    }
  }
  const costsEntered = locationRules.length > 0 || multiShopRules.length > 0;
  const nameById = new Map(locations.map((l) => [l.id, shortShopName(l.name)]));
  const recurring: EndOfMonthCategory[] = (["loyers", "marketing", "fournisseurs", "autres"] as const).map((key) => {
    const label = END_OF_MONTH_CATEGORIES.find((c) => c.key === key)!.label;
    const linesMap = bucketLines.get(key) ?? new Map<string, number>();
    const lines = locations
      .filter((loc) => Math.round(linesMap.get(loc.id) ?? 0) > 0)
      .map((loc) => ({ label: nameById.get(loc.id) ?? loc.name, amount: Math.round(linesMap.get(loc.id) ?? 0) }));
    const total = Math.round(bucketTotals.get(key) ?? 0);
    return {
      key,
      label,
      total: costsEntered ? total : null,
      finalized: costsEntered,
      paymentCount: bucketRules.get(key) ?? 0,
      lines,
    };
  });

  const categories: EndOfMonthCategory[] = [salaires, ...recurring];
  const totals = computeEndOfMonthTotals(safes, categories);

  return Response.json({
    month: monthParam,
    year,
    monthNumber: month,
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
    safes,
    categories,
    totals,
    costsEntered,
  });
}
