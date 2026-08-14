import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: { amount?: number; reason?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const amount = Number(body.amount);
  const reason = body.reason?.trim() ?? "";
  if (!Number.isFinite(amount) || amount === 0) {
    return Response.json({ error: "amount is required and must be non-zero" }, { status: 400 });
  }
  if (!reason) {
    return Response.json({ error: "reason is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // Confirm the record belongs to this org before attaching an adjustment.
  const { data: record, error: recordErr } = await supabase
    .from("employee_payment_records")
    .select("id")
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();
  if (recordErr || !record) return Response.json({ error: "Payment record not found" }, { status: 404 });

  const { error: insertErr } = await supabase.from("payment_adjustments").insert({
    payment_record_id: id,
    amount,
    reason,
    created_by: session.user.userId ?? null,
  });
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  const { data: updated, error } = await supabase
    .from("employee_payment_records")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, adjustments:payment_adjustments(*)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(updated, { status: 201 });
}
