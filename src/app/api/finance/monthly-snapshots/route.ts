import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { requireFinanceOwner, requireFinanceRead } from "@/modules/finance/server";
import { calcServiceCharge } from "@/modules/finance/lib/hr";



export async function GET(request: Request) {
  const auth = await requireFinanceRead();
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const year = url.searchParams.get("year") ? Number(url.searchParams.get("year")) : null;
  const month = url.searchParams.get("month") ? Number(url.searchParams.get("month")) : null;
  const locationId = url.searchParams.get("location_id");
  const includePreview = url.searchParams.get("preview") === "1";

  const supabase = getSupabaseServerClient();
  let snapshots: Record<string, unknown>[] = [];
  try {
    let query = supabase.from("finance_monthly_snapshots").select("*").eq("organization_id", DEFAULT_ORG_ID).order("period_year", { ascending: false }).order("period_month", { ascending: false });
    if (year && month) query = query.eq("period_year", year).eq("period_month", month);
    if (locationId && locationId !== "all") query = query.eq("location_id", locationId);
    const { data, error } = await query;
    if (!error) snapshots = (data as unknown as Record<string, unknown>[]) ?? [];
  } catch {
    snapshots = [];
  }

  let preview: Record<string, unknown>[] | null = null;
  if (includePreview && year && month) {
    try {
      preview = await computePreview(supabase, year, month, locationId);
    } catch {
      preview = null;
    }
  }

  return Response.json({ snapshots, preview });
}

async function computePreview(supabase: ReturnType<typeof getSupabaseServerClient>, year: number, month: number, locationFilter: string | null) {
  // Locations
  let locations: Array<{ id: string; name: string }> | null = null;
  try {
    const res = await supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name");
    locations = (res.data as unknown as typeof locations) ?? [];
  } catch { locations = []; }
  const targetLocations = locationFilter && locationFilter !== "all" ? (locations ?? []).filter((l) => String(l.id) === locationFilter) : (locations ?? []);
  if (targetLocations.length === 0) return [];

  // Recurring costs totals per location
  let costRules: Array<{ location_id: string; estimated_amount: number | string } > | null = null;
  try {
    const res = await supabase.from("finance_cost_rules").select("location_id,estimated_amount,is_active,category").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).neq("category", "legacy_fixed_expenses");
    costRules = (res.data as unknown as typeof costRules) ?? [];
  } catch { costRules = []; }
  const costByLoc = new Map<string, number>();
  for (const r of costRules ?? []) {
    const loc = String(r.location_id);
    costByLoc.set(loc, (costByLoc.get(loc) ?? 0) + Number(r.estimated_amount ?? 0));
  }

  // Payroll totals (deleted_at may not exist on all envs → filter client-side)
  let employees: Array<{ id: string; location_id: string | null; base_salary_monthly: number | null; employee_locations: Array<{ location_id: string; base_salary_monthly: number | null }> | null; deleted_at?: string | null; active?: boolean }> | null = null;
  try {
    const res = await supabase.from("employees").select("id, location_id, base_salary_monthly, employee_locations(location_id, base_salary_monthly)").eq("organization_id", DEFAULT_ORG_ID).eq("active", true);
    employees = (res.data as unknown as typeof employees) ?? [];
    // filter deleted_at client-side if column exists
    employees = (employees ?? []).filter((e) => !(e as unknown as { deleted_at?: string | null }).deleted_at);
  } catch {
    employees = [];
  }
  const payrollByLoc: Record<string, number> = {};
  for (const emp of employees ?? []) {
    const assignments = (emp.employee_locations as unknown as { location_id: string; base_salary_monthly: number | null }[] | null) ?? [];
    if (assignments.length > 0) {
      for (const a of assignments) {
        const loc = String(a.location_id);
        payrollByLoc[loc] = (payrollByLoc[loc] ?? 0) + Number(a.base_salary_monthly ?? emp.base_salary_monthly ?? 0);
      }
    } else if (emp.location_id) {
      const loc = String(emp.location_id);
      payrollByLoc[loc] = (payrollByLoc[loc] ?? 0) + Number(emp.base_salary_monthly ?? 0);
    }
  }

  // Employee counts
  const countByLoc: Record<string, number> = {};
  for (const emp of employees ?? []) {
    const assignments = (emp.employee_locations as unknown as { location_id: string }[] | null) ?? [];
    if (assignments.length > 0) {
      for (const a of assignments) countByLoc[String(a.location_id)] = (countByLoc[String(a.location_id)] ?? 0) + 1;
    } else if (emp.location_id) {
      countByLoc[String(emp.location_id)] = (countByLoc[String(emp.location_id)] ?? 0) + 1;
    }
  }

  // Service charge rate per location
  let shopSettings: Array<{ location_id: string; service_charge_rate_pct: number }> | null = null;
  try {
    const res = await supabase.from("finance_shop_settings").select("location_id,service_charge_rate_pct").eq("organization_id", DEFAULT_ORG_ID);
    shopSettings = (res.data as unknown as typeof shopSettings) ?? [];
  } catch { shopSettings = []; }
  const rateByLoc = new Map((shopSettings ?? []).map((s) => [String(s.location_id), Number(s.service_charge_rate_pct ?? 0)]));

  // Monthly revenue per location for service charge calculation
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const monthStart = `${monthStr}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  let daily: Array<Record<string, unknown>> | null = null;
  try {
    const res = await supabase
      .from("daily_entries")
      .select("location_id, entry_date, sales_drinks_net, sales_ticket_net, sales_snack_net, sales_goodies_net, sales_card_surcharge")
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("entry_date", monthStart)
      .lt("entry_date", nextMonth);
    daily = (res.data as unknown as Array<Record<string, unknown>>) ?? [];
  } catch { daily = []; }
  const revenueByLoc: Record<string, number> = {};
  for (const row of daily ?? []) {
    const loc = String((row as Record<string, unknown>).location_id);
    const rev =
      Number((row as Record<string, unknown>).sales_drinks_net ?? 0) +
      Number((row as Record<string, unknown>).sales_ticket_net ?? 0) +
      Number((row as Record<string, unknown>).sales_snack_net ?? 0) +
      Number((row as Record<string, unknown>).sales_goodies_net ?? 0) +
      Number((row as Record<string, unknown>).sales_card_surcharge ?? 0);
    revenueByLoc[loc] = (revenueByLoc[loc] ?? 0) + rev;
  }

  // Challenge bonus per location for that month
  let bonusByLoc: Record<string, number> = {};
  try {
    const { getChallengesOverview } = await import("@/modules/challenges/overview-data");
    const overviews = await getChallengesOverview(`${year}-${String(month).padStart(2, "0")}`);
    // getChallengesOverview uses external_id mapping; need to map back to internal location ids.
    // For simplicity, match by title to internal name.
    const locNameToId = new Map(targetLocations.map((l) => [String((l as { name: string }).name).toLowerCase(), String((l as { id: string }).id)]));
    for (const o of overviews) {
      const key = String(o.locationTitle).replace(/^Capybara Coffee\s*/i, "").trim().toLowerCase();
      const locId = locNameToId.get(key) ?? Array.from(locNameToId.entries()).find(([name]) => key.includes(name) || name.includes(key))?.[1];
      if (locId) bonusByLoc[locId] = Number(o.totalBonus ?? 0);
    }
    // If title mapping fails, fallback: try to match via external_id would need extra query; we keep 0 for now.
  } catch { bonusByLoc = {}; }

  return targetLocations.map((loc) => {
    const id = String((loc as { id: string }).id);
    const revenue = revenueByLoc[id] ?? 0;
    const rate = rateByLoc.get(id) ?? 0;
    const empCount = countByLoc[id] ?? 0;
    const serviceCharge = calcServiceCharge(revenue, rate, empCount);
    return {
      location_id: id,
      location_name: (loc as { name: string }).name,
      period_year: year,
      period_month: month,
      recurring_costs_amount: costByLoc.get(id) ?? 0,
      payroll_amount: payrollByLoc[id] ?? 0,
      service_charge_rate_pct: rate,
      employee_count: empCount,
      service_charge_amount: Math.round(serviceCharge),
      challenge_bonus_amount: bonusByLoc[id] ?? 0,
      status: "estimated" as const,
    };
  });
}

export async function POST(request: Request) {
  const auth = await requireFinanceOwner();
  if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const locationId = String(body.location_id ?? "").trim();
  const periodYear = Number(body.period_year);
  const periodMonth = Number(body.period_month);
  const reason = String(body.reason ?? "Snapshot saved from recurring costs").trim() || "Snapshot saved";
  if (!locationId || !Number.isInteger(periodYear) || !Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    return Response.json({ error: "location_id, period_year and period_month are required" }, { status: 400 });
  }
  const numericFields = ["recurring_costs_amount", "payroll_amount", "service_charge_rate_pct", "employee_count", "service_charge_amount", "challenge_bonus_amount"] as const;
  const values: Record<string, number> = {};
  for (const f of numericFields) {
    const v = body[f];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return Response.json({ error: `Invalid ${f}` }, { status: 400 });
      values[f] = n;
    }
  }
  // If values not supplied, compute preview for that location/month to fill defaults
  if (Object.keys(values).length < 3) {
    try {
      const supabase = getSupabaseServerClient();
      const preview = await computePreview(supabase, periodYear, periodMonth, locationId);
      const row = (preview as Array<Record<string, unknown>>).find((p) => String(p.location_id) === locationId);
      if (row) {
        for (const f of numericFields) if (values[f] === undefined && row[f] !== undefined) values[f] = Number(row[f] as number);
      }
    } catch { /* ignore */ }
  }

  const status = body.status === "estimated" || body.status === "actual" || body.status === "draft" ? String(body.status) : "actual";
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const upsertPayload: Record<string, unknown> = {
    organization_id: DEFAULT_ORG_ID,
    location_id: locationId,
    period_year: periodYear,
    period_month: periodMonth,
    recurring_costs_amount: values.recurring_costs_amount ?? 0,
    payroll_amount: values.payroll_amount ?? 0,
    service_charge_rate_pct: values.service_charge_rate_pct ?? 0,
    employee_count: values.employee_count ?? 0,
    service_charge_amount: values.service_charge_amount ?? 0,
    challenge_bonus_amount: values.challenge_bonus_amount ?? 0,
    status,
    reason,
    updated_by: auth.session.user.userId ?? null,
    updated_at: now,
  };
  // Insert with created fields on first create — graceful fallback if table not yet migrated
  let result: { data: Record<string, unknown> | null; error: { message: string } | null } = { data: null, error: null };
  try {
    const r = await supabase.from("finance_monthly_snapshots").upsert({
      ...upsertPayload,
      created_by: auth.session.user.userId ?? null,
      created_at: now,
    } as never, { onConflict: "organization_id,location_id,period_year,period_month" }).select().single();
    result = r as unknown as typeof result;
  } catch (e) {
    result = { data: null, error: { message: e instanceof Error ? e.message : "Snapshot table missing" } };
  }
  if (result.error) {
    const msg = String(result.error.message ?? "");
    const isMissingTable = msg.includes("Could not find the table") || msg.includes("does not exist") || msg.includes("schema cache");
    if (isMissingTable) {
      // Fallback: treat finance_shop_monthly_inputs as snapshot store so "Figer" still works before migration is applied.
      // We already sync to that table below, so just return a synthetic snapshot.
      result = { data: { id: `fallback:${locationId}:${periodYear}-${periodMonth}`, ...upsertPayload } as unknown as Record<string, unknown>, error: null };
    } else {
      return Response.json({ error: result.error.message }, { status: 500 });
    }
  }

  // Also keep finance_shop_monthly_inputs in sync for daily P&L.
  // Map recurring total into other_fixed_amount for compatibility, preserve bonus.
  try {
    const basePayload: Record<string, unknown> = {
      organization_id: DEFAULT_ORG_ID,
      location_id: locationId,
      period_year: periodYear,
      period_month: periodMonth,
      salaries_amount: values.payroll_amount ?? 0,
      rent_amount: 0,
      electricity_amount: 0,
      water_amount: 0,
      other_fixed_amount: values.recurring_costs_amount ?? 0,
      service_charge_rate_pct: values.service_charge_rate_pct ?? 0,
      employee_count: values.employee_count ?? 0,
      bonus_amount: values.challenge_bonus_amount ?? 0,
      reason,
      created_by: auth.session.user.userId ?? null,
      updated_by: auth.session.user.userId ?? null,
      updated_at: now,
    };
    const res = await supabase.from("finance_shop_monthly_inputs").upsert(basePayload as never, { onConflict: "organization_id,location_id,period_year,period_month" });
    if (res.error && String(res.error.message).includes("bonus_amount")) {
      const withoutBonus = { ...basePayload };
      delete withoutBonus.bonus_amount;
      await supabase.from("finance_shop_monthly_inputs").upsert(withoutBonus as never, { onConflict: "organization_id,location_id,period_year,period_month" });
    }
  } catch { /* non-fatal */ }

  try {
    await supabase.from("finance_audit_events").insert({
      organization_id: DEFAULT_ORG_ID,
      user_id: auth.session.user.userId ?? null,
      action: "finance.monthly_snapshot.upsert",
      entity_type: "finance_monthly_snapshot",
      entity_id: result.data?.id ? String(result.data.id).slice(0, 36) : null as unknown as string,
      reason,
      payload: { location_id: locationId, period_year: periodYear, period_month: periodMonth, ...values },
    });
  } catch { /* non-fatal */ }

  return Response.json(result.data, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireFinanceOwner();
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const locationId = url.searchParams.get("location_id");
  const year = url.searchParams.get("year") ? Number(url.searchParams.get("year")) : null;
  const month = url.searchParams.get("month") ? Number(url.searchParams.get("month")) : null;
  const supabase = getSupabaseServerClient();
  if (id) {
    const { error } = await supabase.from("finance_monthly_snapshots").delete().eq("id", id).eq("organization_id", DEFAULT_ORG_ID);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  if (locationId && year && month) {
    const { error } = await supabase.from("finance_monthly_snapshots").delete().eq("organization_id", DEFAULT_ORG_ID).eq("location_id", locationId).eq("period_year", year).eq("period_month", month);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "id or location_id+year+month required" }, { status: 400 });
}
