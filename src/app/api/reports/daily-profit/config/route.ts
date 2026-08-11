import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getUserPermissionsFromDb } from "@/core/permissions/server";

type Resource = "entity" | "assignment" | "cost_rule" | "cost_actual" | "adjustment" | "payroll_override" | "sync_config";

function slugify(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role || undefined);
  if (permissions.global_role !== "owner") return { error: Response.json({ error: "Owner access required" }, { status: 403 }) };
  return { session };
}

async function audit(userId: string | null, action: string, entityType: string, entityId: string | null, reason: string, payload: Record<string, unknown>) {
  await getSupabaseServerClient().from("finance_audit_events").insert({
    organization_id: DEFAULT_ORG_ID,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    reason,
    payload,
  });
}

export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const supabase = getSupabaseServerClient();
  const [entities, assignments, locations, rules, actuals, adjustments, overrides, sync] = await Promise.all([
    supabase.from("finance_legal_entities").select("*").eq("organization_id", DEFAULT_ORG_ID).order("name"),
    supabase.from("finance_location_assignments").select("*").eq("organization_id", DEFAULT_ORG_ID),
    supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase.from("finance_cost_rules").select("*").eq("organization_id", DEFAULT_ORG_ID).order("created_at", { ascending: false }),
    supabase.from("finance_cost_actuals").select("*").eq("organization_id", DEFAULT_ORG_ID).order("service_from", { ascending: false }),
    supabase.from("finance_adjustments").select("*").eq("organization_id", DEFAULT_ORG_ID).order("adjustment_date", { ascending: false }),
    supabase.from("finance_payroll_overrides").select("*").eq("organization_id", DEFAULT_ORG_ID).order("period_year", { ascending: false }).order("period_month", { ascending: false }),
    supabase.from("finance_sync_config").select("*").eq("organization_id", DEFAULT_ORG_ID).maybeSingle(),
  ]);
  const failed = [entities, assignments, locations, rules, actuals, adjustments, overrides, sync].find((result) => result.error);
  if (failed?.error) return Response.json({ error: failed.error.message }, { status: 500 });
  return Response.json({
    entities: entities.data ?? [], assignments: assignments.data ?? [], locations: locations.data ?? [],
    rules: rules.data ?? [], actuals: actuals.data ?? [], adjustments: adjustments.data ?? [],
    payrollOverrides: overrides.data ?? [], sync: sync.data ?? null,
  });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  let body: Record<string, unknown> & { resource?: Resource; reason?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const resource = body.resource;
  const reason = String(body.reason ?? "").trim();
  if (!resource || !reason) return Response.json({ error: "resource and reason are required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  let result;
  if (resource === "entity") {
    const name = String(body.name ?? "").trim();
    if (!name) return Response.json({ error: "Company name required" }, { status: 400 });
    const row = { organization_id: DEFAULT_ORG_ID, name, slug: slugify(name), is_active: body.is_active !== false, updated_at: new Date().toISOString(), created_by: auth.session.user.userId ?? null };
    result = body.id
      ? await supabase.from("finance_legal_entities").update(row).eq("id", body.id).eq("organization_id", DEFAULT_ORG_ID).select().single()
      : await supabase.from("finance_legal_entities").insert(row).select().single();
  } else if (resource === "assignment") {
    if (!body.location_id) return Response.json({ error: "location_id required" }, { status: 400 });
    result = await supabase.from("finance_location_assignments").upsert({
      organization_id: DEFAULT_ORG_ID,
      location_id: body.location_id,
      legal_entity_id: body.legal_entity_id || null,
      operational_start_date: body.operational_start_date || null,
      created_by: auth.session.user.userId ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,location_id" }).select().single();
  } else if (resource === "cost_rule") {
    const required = ["label", "category", "scope_type", "cadence", "effective_from"];
    if (required.some((key) => !body[key])) return Response.json({ error: `Required: ${required.join(", ")}` }, { status: 400 });
    const scopeType = String(body.scope_type);
    if (scopeType === "location" && !body.location_id) return Response.json({ error: "A shop is required for a location cost" }, { status: 400 });
    if (scopeType === "entity" && !body.legal_entity_id) return Response.json({ error: "A company is required for a company cost" }, { status: 400 });
    if (body.allocation_method === "custom") {
      const allocations = Object.values((body.custom_allocations ?? {}) as Record<string, unknown>).map(Number);
      const total = allocations.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
      if (Math.abs(total - 100) > 0.01) return Response.json({ error: "Custom allocation percentages must total 100%" }, { status: 400 });
    }
    const row = {
      organization_id: DEFAULT_ORG_ID,
      label: String(body.label).trim(), category: String(body.category).trim().toLowerCase().replace(/\s+/g, "_"),
      scope_type: body.scope_type, legal_entity_id: body.legal_entity_id || null, location_id: body.location_id || null,
      cadence: body.cadence, estimated_amount: Number(body.estimated_amount ?? 0), effective_from: body.effective_from,
      effective_to: body.effective_to || null, allocation_method: body.allocation_method ?? "direct",
      custom_allocations: body.custom_allocations ?? {}, is_active: body.is_active !== false,
      notes: body.notes || null, reason, updated_by: auth.session.user.userId ?? null, updated_at: new Date().toISOString(),
      created_by: auth.session.user.userId ?? null,
    };
    result = body.id
      ? await supabase.from("finance_cost_rules").update(row).eq("id", body.id).eq("organization_id", DEFAULT_ORG_ID).select().single()
      : await supabase.from("finance_cost_rules").insert(row).select().single();
  } else if (resource === "cost_actual") {
    if (!body.cost_rule_id || !body.service_from || !body.service_to) return Response.json({ error: "Rule and service period required" }, { status: 400 });
    result = await supabase.from("finance_cost_actuals").upsert({
      organization_id: DEFAULT_ORG_ID, cost_rule_id: body.cost_rule_id, service_from: body.service_from, service_to: body.service_to,
      amount: Number(body.amount ?? 0), paid_on: body.paid_on || null, notes: body.notes || null, reason,
      created_by: auth.session.user.userId ?? null, updated_at: new Date().toISOString(),
    }, { onConflict: "cost_rule_id,service_from,service_to" }).select().single();
  } else if (resource === "adjustment") {
    if (!body.kind || !body.label || !body.adjustment_date) return Response.json({ error: "Kind, label and date required" }, { status: 400 });
    if (body.scope_type === "location" && !body.location_id) return Response.json({ error: "A shop is required" }, { status: 400 });
    if (body.scope_type === "entity" && !body.legal_entity_id) return Response.json({ error: "A company is required" }, { status: 400 });
    if (body.kind === "reclassification") {
      const sourceField = String(body.source_field ?? "");
      if (!body.location_id || !body.cost_rule_id || !["exp_other_bank", "exp_other_cash"].includes(sourceField)) {
        return Response.json({ error: "Reclassification requires a shop, source column, and linked cost rule" }, { status: 400 });
      }
      const [{ data: mirror }, { data: source }, { data: existingLinks }] = await Promise.all([
        supabase.from("finance_sheet_entries").select("payload").eq("organization_id", DEFAULT_ORG_ID).eq("location_id", body.location_id).eq("entry_date", body.adjustment_date).maybeSingle(),
        supabase.from("daily_entries").select(sourceField).eq("organization_id", DEFAULT_ORG_ID).eq("location_id", body.location_id).eq("entry_date", body.adjustment_date).maybeSingle(),
        supabase.from("finance_adjustments").select("amount").eq("organization_id", DEFAULT_ORG_ID).eq("kind", "reclassification").eq("location_id", body.location_id).eq("adjustment_date", body.adjustment_date).eq("source_field", sourceField),
      ]);
      const payload = (mirror?.payload ?? {}) as Record<string, unknown>;
      const available = Number(payload[sourceField] ?? (source as Record<string, unknown> | null)?.[sourceField] ?? 0);
      const alreadyLinked = (existingLinks ?? []).reduce((sum, link) => sum + Number(link.amount ?? 0), 0);
      if (alreadyLinked + Math.abs(Number(body.amount ?? 0)) > available + 0.005) {
        return Response.json({ error: `Reclassification exceeds the available ${sourceField} amount (${available})` }, { status: 400 });
      }
    }
    result = await supabase.from("finance_adjustments").insert({
      organization_id: DEFAULT_ORG_ID, kind: body.kind, category: body.category || "other", label: body.label,
      scope_type: body.scope_type || "group", legal_entity_id: body.legal_entity_id || null, location_id: body.location_id || null,
      adjustment_date: body.adjustment_date, amount: Math.abs(Number(body.amount ?? 0)), source_field: body.source_field || null,
      cost_rule_id: body.cost_rule_id || null, reason, created_by: auth.session.user.userId ?? null,
    }).select().single();
  } else if (resource === "payroll_override") {
    if (!body.location_id || !body.period_year || !body.period_month) return Response.json({ error: "Location and period required" }, { status: 400 });
    result = await supabase.from("finance_payroll_overrides").upsert({
      organization_id: DEFAULT_ORG_ID, location_id: body.location_id, period_year: Number(body.period_year), period_month: Number(body.period_month),
      amount: Number(body.amount ?? 0), value_status: body.value_status ?? "estimated", reason,
      created_by: auth.session.user.userId ?? null, updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,location_id,period_year,period_month" }).select().single();
  } else if (resource === "sync_config") {
    result = await supabase.from("finance_sync_config").upsert({ organization_id: DEFAULT_ORG_ID, enabled: Boolean(body.enabled), updated_at: new Date().toISOString() }, { onConflict: "organization_id" }).select().single();
  } else {
    return Response.json({ error: "Unsupported resource" }, { status: 400 });
  }

  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  const row = result.data as { id?: string };
  await audit(auth.session.user.userId ?? null, `finance.${resource}.upsert`, resource, row.id ?? null, reason, { ...body, reason: undefined });
  return Response.json(row, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  let body: { resource?: "cost_rule" | "adjustment" | "payroll_override"; id?: string; reason?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const reason = body.reason?.trim();
  if (!body.resource || !body.id || !reason) return Response.json({ error: "resource, id and reason required" }, { status: 400 });
  const table = body.resource === "cost_rule" ? "finance_cost_rules" : body.resource === "adjustment" ? "finance_adjustments" : "finance_payroll_overrides";
  const supabase = getSupabaseServerClient();
  const result = body.resource === "cost_rule"
    ? await supabase.from(table).update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", body.id).eq("organization_id", DEFAULT_ORG_ID)
    : await supabase.from(table).delete().eq("id", body.id).eq("organization_id", DEFAULT_ORG_ID);
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  await audit(auth.session.user.userId ?? null, `finance.${body.resource}.delete`, body.resource, body.id, reason, {});
  return Response.json({ ok: true });
}
