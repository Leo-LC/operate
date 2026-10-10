import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess, isOperationalAdmin } from "@/core/permissions/guards";
import { getUserPermissionsFromSession, getAllowedLocationIds } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { mondayOf } from "@/modules/scheduling/lib/math";
import { validateCell } from "@/modules/scheduling/lib/validation";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_OR_EMPTY_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Range API for the Annual Editor + Weekly View.
 * GET  ?location_id=&from=YYYY-MM-DD&to=YYYY-MM-DD → { schedules, shifts, employees }
 * POST { location_id, shifts[] } → auto-creates Monday-week containers, upserts cells.
 * Read: schedules module access + location scope. Write: owners/admin only.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "schedules")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!locationId || !from || !to || !DAY_RE.test(from) || !DAY_RE.test(to) || from > to) {
    return Response.json({ error: "location_id, from, to (YYYY-MM-DD, from<=to) are required" }, { status: 400 });
  }
  // Guard range size: max 62 days per request (2 months) to keep payloads sane
  const spanDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
  if (spanDays > 62) return Response.json({ error: "Range too large (max 62 days)" }, { status: 400 });

  const allowed = await getAllowedLocationIds(session.user.userId, session.user.role === "owner" || session.user.role === "admin");
  if (allowed !== null && !allowed.includes(locationId)) {
    return Response.json({ error: "Forbidden for this location" }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();
  const mondayFrom = mondayOf(from);
  const mondayTo = mondayOf(to);

  const [{ data: scheds, error: sErr }, { data: emps }] = await Promise.all([
    supabase
      .from("schedules")
      .select("id, location_id, name, week_start_date, status")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("location_id", locationId)
      .is("deleted_at", null)
      .gte("week_start_date", mondayFrom)
      .lte("week_start_date", mondayTo)
      .order("week_start_date", { ascending: true }),
    supabase
      .from("employees")
      .select("id, first_name, last_name, active, employment_start_date, employment_end_date, employee_locations!left(location_id)")
      .eq("organization_id", DEFAULT_ORG_ID)
      .is("deleted_at", null)
      .order("first_name", { ascending: true }),
  ]);
  if (sErr) return Response.json({ error: sErr.message }, { status: 500 });

  const scheduleIds = (scheds ?? []).map((s) => s.id as string);
  let shifts: unknown[] = [];
  if (scheduleIds.length > 0) {
    const { data, error } = await supabase
      .from("schedule_shifts")
      .select("id, schedule_id, employee_id, shift_date, start_time, end_time, break_minutes, notes, is_off")
      .in("schedule_id", scheduleIds)
      .gte("shift_date", from)
      .lte("shift_date", to);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    shifts = data ?? [];
  }

  // Employees relevant to this branch: primary location OR via employee_locations
  const empRows = (emps ?? []) as Array<{
    id: string; first_name: string; last_name: string; active: boolean;
    employment_start_date: string | null; employment_end_date: string | null;
    employee_locations: Array<{ location_id: string }> | null;
  }>;
  const { data: direct } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("location_id", locationId)
    .is("deleted_at", null);
  const directIds = new Set((direct ?? []).map((r) => r.id as string));
  const employees = empRows
    .filter((e) => directIds.has(e.id) || (e.employee_locations ?? []).some((l) => l.location_id === locationId))
    .map((e) => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      active: e.active,
      employment_start_date: e.employment_start_date,
      employment_end_date: e.employment_end_date,
    }));

  return Response.json({ schedules: scheds ?? [], shifts, employees });
}

interface InShift {
  employee_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes?: number;
  notes?: string | null;
  is_off?: boolean;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Owners only" }, { status: 403 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "schedules", true)) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { location_id: string; shifts: InShift[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.location_id || !Array.isArray(body.shifts) || body.shifts.length === 0) {
    return Response.json({ error: "location_id and non-empty shifts[] are required" }, { status: 400 });
  }
  if (body.shifts.length > 2000) return Response.json({ error: "Too many shifts (max 2000)" }, { status: 400 });

  // Validate payload shape + blocking errors before touching the DB
  const blocking: string[] = [];
  for (const s of body.shifts) {
    if (!s.employee_id || !s.shift_date || !DAY_RE.test(s.shift_date)) {
      blocking.push(`Bad row ${s.employee_id ?? "?"} ${s.shift_date ?? "?"}`);
      continue;
    }
    const start = s.start_time ?? "";
    const end = s.end_time ?? "";
    if ((start && !TIME_OR_EMPTY_RE.test(start)) || (end && !TIME_OR_EMPTY_RE.test(end))) {
      blocking.push(`${s.shift_date}: time must be HH:MM`);
      continue;
    }
    const issues = validateCell({
      employeeId: s.employee_id, date: s.shift_date, start, end, isOff: s.is_off ?? (!start && !end ? false : undefined),
    });
    const err = issues.find((i) => i.level === "error");
    if (err) blocking.push(`${s.shift_date}: ${err.message}`);
  }
  if (blocking.length > 0) {
    return Response.json({ error: "Validation failed", details: blocking.slice(0, 20) }, { status: 422 });
  }

  const supabase = getSupabaseServerClient();
  const actorId = session.user.userId ?? null;

  // Group cells by Monday week container
  const byWeek = new Map<string, InShift[]>();
  for (const s of body.shifts) {
    const mon = mondayOf(s.shift_date);
    const list = byWeek.get(mon) ?? [];
    list.push(s);
    byWeek.set(mon, list);
  }

  // Ensure a schedules row exists per week
  const mondays = Array.from(byWeek.keys()).sort();
  const { data: existing } = await supabase
    .from("schedules")
    .select("id, week_start_date")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("location_id", body.location_id)
    .is("deleted_at", null)
    .in("week_start_date", mondays);
  const byMonday = new Map((existing ?? []).map((r) => [(r.week_start_date as string), (r.id as string)]));
  for (const mon of mondays) {
    if (!byMonday.has(mon)) {
      const { data, error } = await supabase
        .from("schedules")
        .insert({
          organization_id: DEFAULT_ORG_ID,
          location_id: body.location_id,
          name: `Week of ${mon}`,
          week_start_date: mon,
          status: "draft",
          created_by: actorId,
        })
        .select("id")
        .single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      byMonday.set(mon, (data as { id: string }).id);
    }
  }

  // Per week: capture before-state for audit, delete touched cells, insert working shifts
  let saved = 0;
  for (const mon of mondays) {
    const cells = byWeek.get(mon)!;
    const scheduleId = byMonday.get(mon)!;
    const empIds = Array.from(new Set(cells.map((c: InShift) => c.employee_id)));
    const dates = Array.from(new Set(cells.map((c: InShift) => c.shift_date)));

    const { data: before } = await supabase
      .from("schedule_shifts")
      .select("id, employee_id, shift_date, start_time, end_time, break_minutes, notes, is_off")
      .eq("schedule_id", scheduleId)
      .in("employee_id", empIds)
      .in("shift_date", dates);

    const { error: delErr } = await supabase
      .from("schedule_shifts")
      .delete()
      .eq("schedule_id", scheduleId)
      .in("employee_id", empIds)
      .in("shift_date", dates);
    if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

    // Persist working shifts + confirmed OFF rows; empty/unscheduled = absence of row
    const rows = cells
      .filter((c: InShift) => (c.start_time && c.end_time) || c.is_off)
      .map((c: InShift) => ({
        schedule_id: scheduleId,
        employee_id: c.employee_id,
        shift_date: c.shift_date,
        start_time: c.start_time && c.end_time ? c.start_time : null,
        end_time: c.start_time && c.end_time ? c.end_time : null,
        break_minutes: c.break_minutes ?? 30,
        notes: c.notes ?? null,
        is_off: !(c.start_time && c.end_time) && !!c.is_off,
      }));
    if (rows.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from("schedule_shifts")
        .insert(rows)
        .select("id, employee_id, shift_date, start_time, end_time");
      if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
      saved += inserted?.length ?? rows.length;

      // Audit: link before/after per cell (best-effort, non-blocking)
      const beforeByKey = new Map(
        ((before ?? []) as Array<{ employee_id: string; shift_date: string; start_time: string | null; end_time: string | null }>).map(
          (b) => [`${b.employee_id}__${b.shift_date}`, b],
        ),
      );
      const audits = (inserted ?? []).map((a) => {
        const r = a as { id: string; employee_id: string; shift_date: string; start_time: string; end_time: string };
        return {
          schedule_id: scheduleId,
          shift_id: r.id,
          employee_id: r.employee_id,
          shift_date: r.shift_date,
          before_json: (beforeByKey.get(`${r.employee_id}__${r.shift_date}`) ?? null) as unknown as Record<string, never> | null,
          after_json: { start_time: r.start_time, end_time: r.end_time } as unknown as Record<string, never>,
          actor_id: actorId,
        };
      });
      if (audits.length > 0) await supabase.from("schedule_shift_audits").insert(audits);
    } else {
      // All-OFF batch: still audit deletions
      const audits = ((before ?? []) as Array<{ id: string; employee_id: string; shift_date: string }>).map((b) => ({
        schedule_id: scheduleId,
        shift_id: b.id,
        employee_id: b.employee_id,
        shift_date: b.shift_date,
        before_json: b as unknown as Record<string, never>,
        after_json: null,
        actor_id: actorId,
      }));
      if (audits.length > 0) await supabase.from("schedule_shift_audits").insert(audits);
    }

    await supabase.from("schedules").update({ updated_at: new Date().toISOString() }).eq("id", scheduleId);
  }

  return Response.json({ ok: true, saved, weeks: mondays.length });
}
