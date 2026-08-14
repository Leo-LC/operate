import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";

// Overriding these away from their computed value must come with a reason —
// they're meant to always start from the employee's base salary / revenue share.
const REASON_REQUIRED_FIELDS = new Set(["base_salary", "service_charge"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = getSupabaseServerClient();

  const allowed = ["base_salary", "service_charge", "payment_method", "notes"] as const;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key as keyof typeof body];
  }

  const changedReasonFields = allowed.filter((key) => key in body && REASON_REQUIRED_FIELDS.has(key));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (changedReasonFields.length > 0 && !reason) {
    return Response.json({ error: "A reason is required when overriding this value" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("employee_payment_records")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORG_ID)
    .select("*, adjustments:payment_adjustments(*)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (changedReasonFields.length > 0) {
    await writeAuditLog({
      userId: session.user.userId ?? null,
      action: "payments.record.override",
      moduleKey: "payments",
      entityType: "employee_payment_record",
      entityId: id,
      payload: { fields: changedReasonFields, reason, values: Object.fromEntries(changedReasonFields.map((f) => [f, patch[f]])) },
    });
  }

  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("employee_payment_records")
    .delete()
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORG_ID);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
