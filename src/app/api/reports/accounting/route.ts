import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { salesNetTotal, expTotal, hrTotal, DAILY_ENTRY_SUMMARY_COLUMNS } from "@/modules/accounting/types";
import type { DailyEntry, FixedExpenseCategory, MonthlyFixedExpense } from "@/modules/accounting/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

function agg(entries: DailyEntry[]) {
  const revenue = entries.reduce((s, e) => s + salesNetTotal(e), 0);
  const expenses = entries.reduce((s, e) => s + expTotal(e), 0);
  const hrCosts = entries.reduce((s, e) => s + hrTotal(e), 0);
  const netProfit = revenue - expenses - hrCosts;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const drinks = entries.reduce((s, e) => s + e.sales_drinks_net, 0);
  const tickets = entries.reduce((s, e) => s + e.sales_ticket_net, 0);
  const snacks = entries.reduce((s, e) => s + e.sales_snack_net, 0);
  const goodies = entries.reduce((s, e) => s + e.sales_goodies_net, 0);
  const surcharge = entries.reduce((s, e) => s + e.sales_card_surcharge, 0);
  const cash = entries.reduce((s, e) => s + e.payment_cash, 0);
  const scan = entries.reduce((s, e) => s + e.payment_scan, 0);
  const creditCard = entries.reduce((s, e) => s + e.payment_credit_card, 0);

  // Cost driver line items
  const expStaffFoodCash = entries.reduce((s, e) => s + e.exp_staff_food_cash, 0);
  const expDrinksCash = entries.reduce((s, e) => s + e.exp_drinks_cash, 0);
  const expGoodiesCash = entries.reduce((s, e) => s + e.exp_goodies_cash, 0);
  const expAnimalsCash = entries.reduce((s, e) => s + e.exp_animals_cash, 0);
  const expSupplyCash = entries.reduce((s, e) => s + e.exp_supply_cash, 0);
  const expOtherCash = entries.reduce((s, e) => s + e.exp_other_cash + e.exp_boss_fees_cash, 0);
  const expMakroBank = entries.reduce((s, e) => s + e.exp_makro_bank, 0);
  const expOtherBank = entries.reduce((s, e) => s + e.exp_other_bank, 0);

  // HR line items
  const hrSalaryCash = entries.reduce((s, e) => s + e.hr_salary_cash + e.hr_salary_bank + e.hr_accompte_cash, 0);
  const hrServiceChargeCash = entries.reduce((s, e) => s + e.hr_service_charge_cash, 0);
  const hrChallengeCash = entries.reduce((s, e) => s + e.hr_challenge_cash, 0);

  const vat = entries.reduce((s, e) => s + e.vat_7, 0);
  const cashToBoss = entries.reduce((s, e) => s + e.cash_to_boss, 0);

  // Closing cash safe: use the value from the latest dated entry in the period
  const sortedByDate = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const closingCashSafe = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].cash_safe : 0;

  return {
    revenue, expenses, hrCosts, netProfit, margin,
    drinks, tickets, snacks, goodies, surcharge,
    cash, scan, creditCard,
    expStaffFoodCash, expDrinksCash, expGoodiesCash, expAnimalsCash, expSupplyCash, expOtherCash, expMakroBank, expOtherBank,
    hrSalaryCash, hrServiceChargeCash, hrChallengeCash,
    vat, cashToBoss, closingCashSafe,
  };
}

function countDaysInRange(fromStr: string, toStr: string): number {
  const d1 = new Date(fromStr);
  const d2 = new Date(toStr);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

function previousPeriod(fromStr: string, toStr: string): { from: string; to: string } {
  const days = countDaysInRange(fromStr, toStr);
  const d1 = new Date(fromStr);
  const prevTo = new Date(d1.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000);
  return { from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) };
}

/** Every (year, month) pair whose calendar month overlaps [fromStr, toStr]. */
function monthsInRange(fromStr: string, toStr: string): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  const d1 = new Date(fromStr);
  const d2 = new Date(toStr);
  const cursor = new Date(d1.getFullYear(), d1.getMonth(), 1);
  const end = new Date(d2.getFullYear(), d2.getMonth(), 1);
  while (cursor <= end) {
    out.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "accounting") && !hasModuleAccess(perms, "reports")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().split("T")[0];

  const from = searchParams.get("from") ?? defaultFrom;
  const to = searchParams.get("to") ?? defaultTo;
  const locationsParam = searchParams.get("locations") ?? "all";

  const supabase = getSupabaseServerClient();

  const prev = previousPeriod(from, to);
  const monthKeys = monthsInRange(from, to);

  const [
    { data: locsData },
    { data: entriesData },
    { data: prevEntriesData },
    { data: fixedExpenseRows },
    { data: fixedExpenseCatsData },
  ] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("daily_entries")
      .select([
        ...DAILY_ENTRY_SUMMARY_COLUMNS,
        "location_id", "entry_date",
        "payment_cash", "payment_scan", "payment_credit_card",
        "cash_safe", "cash_to_boss", "vat_7",
      ].join(", "))
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("entry_date", from)
      .lte("entry_date", to),
    supabase
      .from("daily_entries")
      .select([
        ...DAILY_ENTRY_SUMMARY_COLUMNS,
        "location_id", "entry_date",
        "payment_cash", "payment_scan", "payment_credit_card",
        "cash_safe", "cash_to_boss", "vat_7",
      ].join(", "))
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("entry_date", prev.from)
      .lte("entry_date", prev.to),
    supabase
      .from("monthly_fixed_expenses")
      .select("location_id, year, month, category_values")
      .eq("organization_id", DEFAULT_ORG_ID)
      .in("year", Array.from(new Set(monthKeys.map((m) => m.year)))),
    supabase
      .from("fixed_expense_categories")
      .select("key, label")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const allLocations = (locsData ?? []) as { id: string; name: string }[];
  const selectedIds = locationsParam === "all"
    ? allLocations.map((l) => l.id)
    : locationsParam.split(",").filter(Boolean);

  const allEntries = (entriesData ?? []) as unknown as DailyEntry[];
  const filtered = allEntries.filter((e) => selectedIds.includes(e.location_id));

  const allPrevEntries = (prevEntriesData ?? []) as unknown as DailyEntry[];
  const filteredPrev = allPrevEntries.filter((e) => selectedIds.includes(e.location_id));

  const overview = agg(filtered);
  const prevOverview = agg(filteredPrev);

  const byShop = allLocations
    .filter((l) => selectedIds.includes(l.id))
    .map((loc) => {
      const shopEntries = filtered.filter((e) => e.location_id === loc.id);
      return { locationId: loc.id, locationName: loc.name, ...agg(shopEntries) };
    });

  // Daily series for "Daily Rhythm" — revenue per day, summed across selected locations
  const dailyMap = new Map<string, number>();
  for (const e of filtered) {
    dailyMap.set(e.entry_date, (dailyMap.get(e.entry_date) ?? 0) + salesNetTotal(e));
  }
  const dailyTotals = Array.from(dailyMap.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Monthly fixed expenses — sum by category across selected locations for months overlapping the range
  const allFixedExpenseRows = (fixedExpenseRows ?? []) as MonthlyFixedExpense[];
  const relevantFixedRows = allFixedExpenseRows.filter(
    (r) => selectedIds.includes(r.location_id) && monthKeys.some((m) => m.year === r.year && m.month === r.month)
  );
  const fixedExpenseCategories = (fixedExpenseCatsData ?? []) as FixedExpenseCategory[];
  const fixedExpenseTotals: Record<string, number> = {};
  for (const cat of fixedExpenseCategories) {
    fixedExpenseTotals[cat.key] = relevantFixedRows.reduce((s, r) => s + (r.category_values?.[cat.key] ?? 0), 0);
  }
  const monthlyExpensesEntered = relevantFixedRows.length > 0;

  // Data completeness: how many calendar days in range vs. how many have entries
  const totalDaysInRange = countDaysInRange(from, to);
  const selectedShopCount = selectedIds.length;
  const expectedEntries = totalDaysInRange * selectedShopCount;
  const actualEntries = filtered.length;
  const completenessPercent = expectedEntries > 0 ? Math.round((actualEntries / expectedEntries) * 100) : 100;

  const shopsWithMissingData = byShop
    .filter((s) => {
      const shopEntries = filtered.filter((e) => e.location_id === s.locationId);
      return shopEntries.length < totalDaysInRange;
    })
    .map((s) => s.locationName.replace(/^Capybara Coffee\s*/i, "").trim());

  return Response.json({
    period: { from, to },
    locations: allLocations,
    overview,
    byShop,
    previousPeriod: { period: prev, overview: prevOverview },
    dailyTotals,
    monthlyExpenses: {
      categories: fixedExpenseCategories.map((c) => ({ key: c.key, label: c.label })),
      totals: fixedExpenseTotals,
      entered: monthlyExpensesEntered,
    },
    completeness: {
      totalExpected: expectedEntries,
      totalFilled: actualEntries,
      percent: completenessPercent,
      shopsIncomplete: shopsWithMissingData,
    },
  });
}
