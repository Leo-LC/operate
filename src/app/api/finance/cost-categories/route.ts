import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireFinanceOwner, requireFinanceRead } from "@/modules/finance/server";

function normalizeSlug(value: string): string | null {
  const slug = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 32);
  if (!slug || slug.length < 2 || !/^[a-z]/.test(slug)) return null;
  return slug;
}

export async function GET() {
  const auth = await requireFinanceRead();
  if (auth.error) return auth.error;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("finance_cost_categories").select("slug,label").eq("organization_id", DEFAULT_ORG_ID).order("label");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ categories: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireFinanceOwner();
  if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const rawLabel = String(body.label ?? body.slug ?? "").trim();
  const slug = normalizeSlug(String(body.slug ?? rawLabel));
  if (!slug || !rawLabel) return Response.json({ error: "Valid category name is required" }, { status: 400 });
  const label = rawLabel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const supabase = getSupabaseServerClient();
  const result = await supabase.from("finance_cost_categories").upsert({ organization_id: DEFAULT_ORG_ID, slug, label, created_by: auth.session.user.userId ?? null }, { onConflict: "organization_id,slug" }).select().single();
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  await supabase.from("finance_audit_events").insert({ organization_id: DEFAULT_ORG_ID, user_id: auth.session.user.userId ?? null, action: "finance.cost_category.create", entity_type: "finance_cost_category", entity_id: result.data.id, reason: "Category created from recurring costs register", payload: { slug, label } });
  return Response.json(result.data, { status: 201 });
}
