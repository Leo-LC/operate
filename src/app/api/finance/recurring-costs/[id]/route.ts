import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireFinanceOwner } from "@/modules/finance/server";

function normalizeSlug(value: string): string | null {
  const slug = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 32);
  if (!slug || slug.length < 2 || !/^[a-z]/.test(slug)) return null;
  return slug;
}

function labelForCategory(value: string, supportType?: string | null): string {
  if (value === "support_workers") {
    if (supportType === "bookings") return "Support workers · Bookings";
    if (supportType === "social_media_and_bookings") return "Support workers · Social media + bookings";
    return "Support workers · Social media";
  }
  const map: Record<string, string> = { rent: "Rent", utilities: "Utilities", marketing: "Marketing", support_workers: "Support workers", other: "Accounting" };
  if (map[value]) return map[value];
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireFinanceOwner(); if (auth.error) return auth.error;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const reason = String(body.reason ?? "").trim(); if (!reason) return Response.json({ error: "A reason is required" }, { status: 400 });
  const allowed = ["cadence", "estimated_amount", "effective_from", "effective_to", "is_active", "notes", "custom_allocations"];
  const updates: Record<string, unknown> = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, body[key] === "" ? null : body[key]]));

  // Allow editing label/category (with normalization). Handle custom category creation if provided.
  if ("custom_category" in body && body.custom_category) {
    const normalized = normalizeSlug(String(body.custom_category));
    if (!normalized) return Response.json({ error: "Invalid category name" }, { status: 400 });
    const customLabel = String(body.custom_label ?? body.custom_category).trim() || labelForCategory(normalized);
    const supabaseCat = getSupabaseServerClient();
    await supabaseCat.from("finance_cost_categories").upsert({ organization_id: DEFAULT_ORG_ID, slug: normalized, label: customLabel }, { onConflict: "organization_id,slug" });
    updates.category = normalized;
    updates.label = String(body.label ?? customLabel).trim() || customLabel;
  } else {
    if ("category" in body && body.category !== undefined && body.category !== null && String(body.category).trim() !== "") {
      const normalized = normalizeSlug(String(body.category));
      if (!normalized) return Response.json({ error: "Invalid category" }, { status: 400 });
      updates.category = normalized;
      // If label not explicitly provided, derive it from category/support_type
      if (!("label" in body)) {
        const supportType = (updates.custom_allocations as { support_type?: string } | undefined)?.support_type ?? (body.support_type as string | undefined) ?? null;
        updates.label = labelForCategory(normalized, supportType);
      }
    }
    if ("label" in body && body.label !== undefined && body.label !== null && String(body.label).trim() !== "") {
      updates.label = String(body.label).trim();
    } else if ("category" in updates && !("label" in updates) && !("label" in body)) {
      // category changed but no label -> derive
      const supportType = (updates.custom_allocations as { support_type?: string } | undefined)?.support_type ?? null;
      updates.label = labelForCategory(String(updates.category), supportType);
    }
  }

  Object.assign(updates, { reason, updated_by: auth.session.user.userId ?? null, updated_at: new Date().toISOString() });
  const supabase = getSupabaseServerClient(); const result = await supabase.from("finance_cost_rules").update(updates).eq("id", params.id).eq("organization_id", DEFAULT_ORG_ID).select().single();
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  await supabase.from("finance_audit_events").insert({ organization_id: DEFAULT_ORG_ID, user_id: auth.session.user.userId ?? null, action: "finance.recurring_cost.update", entity_type: "finance_cost_rule", entity_id: params.id, reason, payload: updates });
  return Response.json(result.data);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireFinanceOwner(); if (auth.error) return auth.error;
  let reason = "Deleted from recurring costs register";
  try {
    const url = new URL(request.url);
    reason = url.searchParams.get("reason") ?? reason;
    const body = await request.clone().json().catch(() => null) as Record<string, unknown> | null;
    if (body?.reason) reason = String(body.reason);
  } catch { /* ignore */ }
  if (!String(reason).trim()) reason = "Deleted from recurring costs register";
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("finance_cost_rules").delete().eq("id", params.id).eq("organization_id", DEFAULT_ORG_ID);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await supabase.from("finance_audit_events").insert({ organization_id: DEFAULT_ORG_ID, user_id: auth.session.user.userId ?? null, action: "finance.recurring_cost.delete", entity_type: "finance_cost_rule", entity_id: params.id, reason: String(reason), payload: { id: params.id } });
  return Response.json({ ok: true });
}
