import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "attendance")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM
  const locationId = searchParams.get("location_id");
  const employeeId = searchParams.get("employee_id");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("attendance_records")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .is("deleted_at", null)
    .order("record_date", { ascending: true });

  if (month) {
    const [y, m] = month.split("-").map(Number);
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    query = query.gte("record_date", from).lte("record_date", to);
  }
  if (locationId) query = query.eq("location_id", locationId);
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "attendance")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    location_id: string;
    employee_id: string;
    record_date: string;
    record_type: string;
    hours?: number;
    note?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.location_id || !body.employee_id || !body.record_date || !body.record_type) {
    return Response.json({ error: "location_id, employee_id, record_date, record_type are required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("attendance_records").insert({
    organization_id: DEFAULT_ORG_ID,
    location_id: body.location_id,
    employee_id: body.employee_id,
    record_date: body.record_date,
    record_type: body.record_type,
    hours: body.hours ?? null,
    note: body.note?.trim() ?? null,
    created_by: session.user.userId ?? null,
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
