import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import {
  salesNetTotal,
  expCashTotal,
  expBankTotal,
  expTotal,
  hrTotal,
  paymentDelta,
} from "@/modules/accounting/types";
import type { DailyEntry } from "@/modules/accounting/types";
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
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type        = searchParams.get("type");         // "fixed" | null (daily)
  const month       = searchParams.get("month");        // YYYY-MM for daily
  const year        = searchParams.get("year");         // YYYY for fixed
  const location_id = searchParams.get("location_id"); // optional filter

  const supabase = getSupabaseServerClient();

  // ── Fixed expenses export (source unique : recurring_costs + overrides) ──────
  if (type === "fixed") {
    const yearNum = parseInt(year ?? "", 10);
    if (!yearNum || isNaN(yearNum)) return Response.json({ error: "year required" }, { status: 400 });

    const [rulesRes, catsRes, overridesRes, locsRes] = await Promise.all([
      supabase
        .from("recurring_costs")
        .select("id, location_id, category, label, estimated_amount, scope_type")
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("is_active", true)
        .neq("category", "legacy_fixed_expenses")
        .order("category")
        .order("label"),
      supabase
        .from("recurring_cost_categories")
        .select("slug, label")
        .eq("organization_id", DEFAULT_ORG_ID),
      supabase
        .from("recurring_cost_overrides")
        .select("cost_rule_id, service_from, amount")
        .eq("organization_id", DEFAULT_ORG_ID)
        .gte("service_from", `${yearNum}-01-01`)
        .lt("service_from", `${yearNum + 1}-01-01`),
      supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("is_active", true)
        .order("name"),
    ]);
    if (rulesRes.error) return Response.json({ error: rulesRes.error.message }, { status: 500 });

    type Rule = { id: string; location_id: string | null; category: string; label: string; estimated_amount: number; scope_type: string };
    const rules = ((rulesRes.data ?? []) as Rule[]).filter((r) => !location_id || r.location_id === location_id || r.scope_type !== "location");
    const locName = new Map<string, string>(((locsRes.data ?? []) as Array<{ id: string; name: string }>).map((l) => [l.id, l.name]));
    const catLabel = new Map<string, string>(((catsRes.data ?? []) as Array<{ slug: string; label: string }>).map((c) => [c.slug, c.label]));
    const overrideByKey = new Map<string, number>();
    for (const o of (overridesRes.data ?? []) as Array<{ cost_rule_id: string; service_from: string; amount: number }>) {
      overrideByKey.set(`${o.cost_rule_id}|${String(o.service_from).slice(0, 7)}`, Number(o.amount ?? 0));
    }

    const MONTH_NAMES = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ];
    const categories = Array.from(new Set(rules.map((r) => r.category)));
    const catHeaderLabel = (c: string) => catLabel.get(c) ?? c;
    const header = ["Year", "Month", "Location", ...categories.map(catHeaderLabel), "Total"].join(",");

    const locIds = location_id
      ? [location_id]
      : Array.from(new Set(rules.map((r) => r.location_id).filter(Boolean) as string[]));
    const lines: string[] = [];
    for (const lid of locIds.length > 0 ? locIds : [""]) {
      for (let m = 1; m <= 12; m++) {
        const ym = `${yearNum}-${String(m).padStart(2, "0")}`;
        const vals = categories.map((c) => {
          let sum = 0;
          for (const r of rules.filter((x) => x.category === c && (x.scope_type !== "location" || x.location_id === lid))) {
            sum += overrideByKey.get(`${r.id}|${ym}`) ?? Number(r.estimated_amount ?? 0);
          }
          return sum;
        });
        lines.push([
          esc(yearNum),
          esc(MONTH_NAMES[m - 1]),
          esc(lid ? (locName.get(lid) ?? lid) : "All shops (shared)"),
          ...vals.map(esc),
          esc(vals.reduce((s, v) => s + v, 0)),
        ].join(","));
      }
    }

    const csv = [header, ...lines].join("\n");
    const label = `recurring-costs-${yearNum}`;
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
    "VAT 7% (auto Loyverse)", "Payment cash", "Payment scan", "Payment credit card", "Payment delta",
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
