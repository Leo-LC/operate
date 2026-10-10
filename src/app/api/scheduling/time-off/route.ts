import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess, isOperationalAdmin } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Approved/pending days off. Read: schedules access. Write: owners only (V1). */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "schedules")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const employeeId = searchParams.get("employee_id");

  const supabase = getSupabaseServerClient();
  let q = supabase
    .from("employee_time_off")
    .select("id, employee_id, location_id, date_from, date_to, kind, reason")
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("date_from", { ascending: true });
  if (from) q = q.gte("date_to", from);
  if (to) q = q.lte("date_from", to);
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Owners only" }, { status: 403 });

  let body: { employee_id: string; location_id?: string | null; date_from: string; date_to: string; kind?: string; reason?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.employee_id || !DAY_RE.test(body.date_from ?? "") || !DAY_RE.test(body.date_to ?? "")) {
    return Response.json({ error: "employee_id, date_from, date_to (YYYY-MM-DD) required" }, { status: 400 });
  }
  if (body.date_to < body.date_from) return Response.json({ error: "date_to >= date_from required" }, { status: 400 });
  if (body.kind && !["approved", "pending"].includes(body.kind)) {
    return Response.json({ error: "kind must be approved|pending" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employee_time_off")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      employee_id: body.employee_id,
      location_id: body.location_id ?? null,
      date_from: body.date_from,
      date_to: body.date_to,
      kind: body.kind ?? "approved",
      reason: body.reason ?? null,
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Owners only" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("employee_time_off").delete().eq("id", id).eq("organization_id", DEFAULT_ORG_ID);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
