import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (body.status === "paid" && !body.paid_at) {
    body.paid_at = new Date().toISOString();
  }

  const supabase = getSupabaseServerClient();

  // When confirming a payment, reconcile credit_hours on the employee
  if (body.status === "confirmed" || body.status === "paid") {
    const { data: existing } = await supabase
      .from("employee_payment_records")
      .select("status, credit_hours_applied, employee_id")
      .eq("id", id)
      .eq("organization_id", DEFAULT_ORG_ID)
      .single();

    // Only apply credits once (when transitioning from non-confirmed → confirmed/paid)
    if (existing && existing.status === "draft") {
      const creditApplied = (body.credit_hours_applied as number | undefined) ?? (existing.credit_hours_applied as number) ?? 0;
      if (creditApplied !== 0) {
        const { data: emp } = await supabase
          .from("employees")
          .select("credit_hours")
          .eq("id", existing.employee_id as string)
          .single();
        if (emp) {
          await supabase
            .from("employees")
            .update({ credit_hours: ((emp.credit_hours as number) ?? 0) - creditApplied })
            .eq("id", existing.employee_id as string);
        }
      }
    }
  }

  const { data, error } = await supabase
    .from("employee_payment_records")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORG_ID)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
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
