import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { fromFormState, toFormState } from "@/modules/accounting/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "accounting")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");
  const month = searchParams.get("month"); // 'YYYY-MM'

  if (!locationId || !month) {
    return Response.json({ error: "location_id and month are required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const [y, m] = month.split("-").map(Number) as [number, number];
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const monthStart = `${month}-01`;
  const monthEnd   = `${nextMonth}-01`;

  const [{ data: entries }, { data: fixedCost }] = await Promise.all([
    supabase
      .from("daily_entries")
      .select("*")
      .eq("location_id", locationId)
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("entry_date", monthStart)
      .lt("entry_date", monthEnd)
      .order("entry_date"),
    supabase
      .from("monthly_fixed_costs")
      .select("*")
      .eq("location_id", locationId)
      .eq("month", month)
      .maybeSingle(),
  ]);

  return Response.json({ entries: entries ?? [], fixed_cost: fixedCost ?? null });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "accounting")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    location_id: string;
    entry_date: string;
    [key: string]: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.location_id || !body.entry_date) {
    return Response.json({ error: "location_id and entry_date are required" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.entry_date)) {
    return Response.json({ error: "entry_date must be YYYY-MM-DD" }, { status: 400 });
  }

  // Convert any string-number values and strip unknown keys
  const fields = fromFormState(toFormState(body as Parameters<typeof toFormState>[0]));

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_entries")
    .upsert({
      organization_id: DEFAULT_ORG_ID,
      location_id: body.location_id,
      entry_date: body.entry_date,
      ...fields,
      updated_by: session.user.userId ?? null,
      created_by: session.user.userId ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "location_id,entry_date" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "accounting.entry.upsert",
    moduleKey: "accounting",
    entityType: "daily_entry",
    entityId: data.id,
    payload: { location_id: body.location_id, entry_date: body.entry_date },
  });

  return Response.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");
  const month      = searchParams.get("month"); // 'YYYY-MM'

  if (!locationId || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "location_id and month (YYYY-MM) are required" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number) as [number, number];
  const nextMonth  = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const monthStart = `${month}-01`;
  const monthEnd   = `${nextMonth}-01`;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_entries")
    .delete()
    .eq("location_id", locationId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .gte("entry_date", monthStart)
    .lt("entry_date", monthEnd)
    .select("id");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const deleted = data?.length ?? 0;

  await writeAuditLog({
    userId:     session.user.userId ?? null,
    action:     "accounting.entries.delete_month",
    moduleKey:  "accounting",
    entityType: "daily_entry",
    entityId:   locationId,
    payload:    { location_id: locationId, month, deleted },
  });

  return Response.json({ deleted });
}
