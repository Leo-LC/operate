import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function DELETE(_req: Request, { params }: { params: Promise<{ adjustmentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { adjustmentId } = await params;
  const supabase = getSupabaseServerClient();

  const { data: adjustment, error: findErr } = await supabase
    .from("payment_adjustments")
    .select("id, payment_record_id, employee_payment_records!inner(organization_id)")
    .eq("id", adjustmentId)
    .eq("employee_payment_records.organization_id", DEFAULT_ORG_ID)
    .single();
  if (findErr || !adjustment) return Response.json({ error: "Adjustment not found" }, { status: 404 });

  const { error } = await supabase.from("payment_adjustments").delete().eq("id", adjustmentId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
