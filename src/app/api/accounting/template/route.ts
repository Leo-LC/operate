import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";

// Full template columns in the same order as the accounting sheet.
// Computed/display-only columns (sales_net_inc_vat, payment_delta, exp_cash_total,
// exp_bank_total, exp_total, hr_total) are included for copy-paste convenience but
// ignored by the import route.
const TEMPLATE_COLUMNS = [
  "date",
  "sales_drinks_net",
  "sales_ticket_net",
  "sales_snack_net",
  "sales_goodies_net",
  "sales_card_surcharge",
  "sales_net_inc_vat",
  "vat_7",
  "payment_cash",
  "payment_scan",
  "payment_credit_card",
  "payment_delta",
  "exp_staff_food_cash",
  "exp_drinks_cash",
  "exp_goodies_cash",
  "exp_animals_cash",
  "exp_supply_cash",
  "exp_boss_fees_cash",
  "exp_other_cash",
  "exp_cash_total",
  "exp_makro_bank",
  "exp_other_bank",
  "exp_bank_total",
  "exp_total",
  "hr_salary_cash",
  "hr_salary_bank",
  "hr_challenge_cash",
  "hr_service_charge_cash",
  "hr_accompte_cash",
  "hr_total",
  "cash_end_day",
  "cash_to_boss",
  "cash_safe",
];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationName = searchParams.get("location_name") ?? "Your Location Name";
  const monthParam = searchParams.get("month");

  // Determine year/month — default to current month if not supplied
  let year: number;
  let month: number;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split("-").map(Number) as [number, number];
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  const headerRow = TEMPLATE_COLUMNS.join(",");

  // One row per calendar day, date pre-filled, all other cells empty
  const dataRows = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const date = `${year}-${String(month).padStart(2, "0")}-${day}`;
    return [date, ...Array(TEMPLATE_COLUMNS.length - 1).fill("")].join(",");
  });

  const csv = [
    `# Accounting template: ${locationName} — ${monthStr}`,
    `# Fill in values and import via the accounting module.`,
    `# Computed columns (sales_net_inc_vat, payment_delta, *_total) are ignored on import.`,
    headerRow,
    ...dataRows,
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="accounting-${monthStr}.csv"`,
    },
  });
}
