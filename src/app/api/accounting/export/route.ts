import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { salesNetTotal, salesIncVat, expTotal, hrTotal } from "@/modules/accounting/types";
import type { DailyEntry } from "@/modules/accounting/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

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
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "accounting")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM, optional

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("daily_entries")
    .select("*, locations ( name )")
    .eq("organization_id", ORG_ID)
    .order("entry_date");

  if (month) {
    query = query.gte("entry_date", `${month}-01`).lt("entry_date", `${month}-32`);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = DailyEntry & { locations: { name: string } | null };
  const rows = data as unknown as Row[];

  const header = [
    "Date", "Location",
    "Sales Net (THB)", "Sales Inc VAT (THB)",
    "Expenses Total (THB)", "HR Total (THB)",
    "Payment Cash", "Payment Scan", "Payment Card",
    "Cash End Day", "Cash to Boss", "Cash Safe",
    "Notes",
  ].join(",");

  const lines = rows.map((r) => [
    esc(r.entry_date), esc(r.locations?.name),
    esc(salesNetTotal(r)), esc(salesIncVat(r)),
    esc(expTotal(r)), esc(hrTotal(r)),
    esc(r.payment_cash), esc(r.payment_scan), esc(r.payment_credit_card),
    esc(r.cash_end_day), esc(r.cash_to_boss), esc(r.cash_safe),
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
