/**
 * Net revenue for a location over a period — same total the "Generate period"
 * service charge calculation is based on. Exposed so the payments UI can show
 * it for control alongside each employee's service charge.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { salesNetTotal, type DailyEntry } from "@/modules/accounting/types";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10);
  const locationId = searchParams.get("location_id");
  if (!year || !month || !locationId) {
    return Response.json({ error: "year, month, location_id required" }, { status: 400 });
  }

  const monthPad = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const fromDate = `${year}-${monthPad}-01`;
  const toDate = `${year}-${monthPad}-${String(lastDay).padStart(2, "0")}`;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("location_id", locationId)
    .gte("entry_date", fromDate)
    .lte("entry_date", toDate);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  const revenue = (data ?? []).reduce((sum, row) => sum + salesNetTotal(row as DailyEntry), 0);
  return Response.json({ revenue });
}
