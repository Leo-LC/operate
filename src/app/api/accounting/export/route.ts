import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import {
  salesNetTotal,
  expCashTotal,
  expBankTotal,
  expTotal,
  hrTotal,
  paymentDelta,
  fixedExpenseTotal,
} from "@/modules/accounting/types";
import type { DailyEntry, FixedExpenseCategory, MonthlyFixedExpense } from "@/modules/accounting/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

function esc(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type        = searchParams.get("type");         // "fixed" | null (daily)
  const month       = searchParams.get("month");        // YYYY-MM for daily
  const year        = searchParams.get("year");         // YYYY for fixed
  const location_id = searchParams.get("location_id"); // optional filter

  const supabase = getSupabaseServerClient();

  // ── Fixed expenses export ─────────────────────────────────────────────────
  if (type === "fixed") {
    const yearNum = parseInt(year ?? "", 10);
    if (!yearNum || isNaN(yearNum)) return Response.json({ error: "year required" }, { status: 400 });

    // Fetch active categories for headers
    const { data: cats } = await supabase
      .from("fixed_expense_categories")
      .select("*")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .order("sort_order");
    const categories: FixedExpenseCategory[] = cats ?? [];

    let q = supabase
      .from("monthly_fixed_expenses")
      .select("*, locations ( name )")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("year", yearNum)
      .order("month");

    if (location_id) q = q.eq("location_id", location_id);

    const { data, error } = await q;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const MONTH_NAMES = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ];

    type FixedRow = MonthlyFixedExpense & { locations: { name: string } | null };
    const rows = data as unknown as FixedRow[];

    const catHeaders = categories.map((c) => c.label);
    const header = ["Year", "Month", "Location", ...catHeaders, "Total"].join(",");

    const lines = rows.map((r) => {
      const catVals = categories.map((c) =>
        esc((r.category_values?.[c.key] ?? 0))
      );
      return [
        esc(r.year),
        esc(MONTH_NAMES[r.month - 1]),
        esc((r as unknown as Record<string, unknown>).locations ? ((r as unknown as Record<string, unknown>).locations as { name: string }).name : ""),
        ...catVals,
        esc(fixedExpenseTotal(r)),
      ].join(",");
    });

    const csv = [header, ...lines].join("\n");
    const label = `fixed-expenses-${yearNum}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="accounting-${label}.csv"`,
      },
    });
  }

  // ── Daily entries export (full fields) ────────────────────────────────────
  let q = supabase
    .from("daily_entries")
    .select("*, locations ( name )")
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("entry_date");

  if (month) {
    const [ey, em] = month.split("-").map(Number) as [number, number];
    const nextMonth = em === 12 ? `${ey + 1}-01` : `${ey}-${String(em + 1).padStart(2, "0")}`;
    q = q.gte("entry_date", `${month}-01`).lt("entry_date", `${nextMonth}-01`);
  }
  if (location_id) q = q.eq("location_id", location_id);

  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = DailyEntry & { locations: { name: string } | null };
  const rows = data as unknown as Row[];

  const header = [
    "Date", "Location",
    // Sales
    "Drinks", "Ticket", "Snack", "Goodies", "Card surcharge",
    "Sales total",
    // Payments
    "VAT 7% (manual)", "Payment cash", "Payment scan", "Payment credit card", "Payment delta",
    // Cash expenses
    "Staff food cash", "Drinks cash", "Goodies cash", "Animals cash",
    "Supply cash", "Boss fees cash", "Other cash", "Exp cash total",
    // Bank expenses
    "Makro bank", "Other bank", "Exp bank total",
    // Totals
    "Exp total",
    // HR
    "Salary cash", "Salary bank", "Challenge cash", "Service charge cash", "Acompte cash", "HR total",
    // Treasury
    "Cash end day", "Cash to boss", "Cash safe",
    "Notes",
  ].join(",");

  const lines = rows.map((r) => [
    esc(r.entry_date),
    esc(r.locations?.name),
    // Sales
    esc(r.sales_drinks_net),
    esc(r.sales_ticket_net),
    esc(r.sales_snack_net),
    esc(r.sales_goodies_net),
    esc(r.sales_card_surcharge),
    esc(salesNetTotal(r)),
    // Payments
    esc(r.vat_7),
    esc(r.payment_cash),
    esc(r.payment_scan),
    esc(r.payment_credit_card),
    esc(paymentDelta(r)),
    // Cash expenses
    esc(r.exp_staff_food_cash),
    esc(r.exp_drinks_cash),
    esc(r.exp_goodies_cash),
    esc(r.exp_animals_cash),
    esc(r.exp_supply_cash),
    esc(r.exp_boss_fees_cash),
    esc(r.exp_other_cash),
    esc(expCashTotal(r)),
    // Bank expenses
    esc(r.exp_makro_bank),
    esc(r.exp_other_bank),
    esc(expBankTotal(r)),
    // Totals
    esc(expTotal(r)),
    // HR
    esc(r.hr_salary_cash),
    esc(r.hr_salary_bank),
    esc(r.hr_challenge_cash),
    esc(r.hr_service_charge_cash),
    esc(r.hr_accompte_cash),
    esc(hrTotal(r)),
    // Treasury
    esc(r.cash_end_day),
    esc(r.cash_to_boss),
    esc(r.cash_safe),
    esc(r.notes),
  ].join(","));

  const csv = [header, ...lines].join("\n");
  const label = month ?? new Date().toISOString().slice(0, 7);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="accounting-${label}.csv"`,
    },
  });
}
