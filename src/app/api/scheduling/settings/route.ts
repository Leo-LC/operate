import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess, isOperationalAdmin } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

/** Central scheduling configuration. Read: schedules access. Write: owners only. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "schedules")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const [{ data: global }, { data: branches }] = await Promise.all([
    supabase.from("scheduling_global_settings").select("*").eq("id", 1).single(),
    supabase
      .from("location_scheduling_settings")
      .select("location_id, opening_time, closing_time, default_break_minutes, min_staff_json, updated_at, locations ( name )"),
  ]);
  return Response.json({ global: global ?? null, branches: branches ?? [] });
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Owners only" }, { status: 403 });

  let body: {
    global?: { default_break_minutes?: number; shift_thresholds?: Record<string, number>; palette?: Record<string, string> };
    branch?: { location_id: string; opening_time?: string; closing_time?: string; default_break_minutes?: number; min_staff_json?: Record<string, number> };
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const actorId = session.user.userId ?? null;

  if (body.global) {
    const patch: Record<string, unknown> = { updated_by: actorId, updated_at: new Date().toISOString() };
    if (body.global.default_break_minutes != null) {
      if (body.global.default_break_minutes < 0) return Response.json({ error: "default_break_minutes >= 0" }, { status: 400 });
      patch.default_break_minutes = body.global.default_break_minutes;
    }
    if (body.global.shift_thresholds) patch.shift_thresholds = body.global.shift_thresholds;
    if (body.global.palette) {
      const allowed = ["opening", "daytime", "closing", "open-close", "off", "unscheduled"];
      for (const [k, v] of Object.entries(body.global.palette)) {
        if (!allowed.includes(k) || typeof v !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v)) {
          return Response.json({ error: `palette.${k} must be a #rrggbb color` }, { status: 400 });
        }
      }
      patch.palette = body.global.palette;
    }
    const { error } = await supabase.from("scheduling_global_settings").update(patch).eq("id", 1);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  if (body.branch?.location_id) {
    const b = body.branch;
    if (b.opening_time && !TIME_RE.test(b.opening_time)) return Response.json({ error: "opening_time must be HH:MM" }, { status: 400 });
    if (b.closing_time && !TIME_RE.test(b.closing_time)) return Response.json({ error: "closing_time must be HH:MM" }, { status: 400 });
    if (b.opening_time && b.closing_time && b.opening_time >= b.closing_time) {
      return Response.json({ error: "opening_time must be before closing_time (no overnight)" }, { status: 400 });
    }
    const patch: Record<string, unknown> = { updated_by: actorId, updated_at: new Date().toISOString() };
    if (b.opening_time) patch.opening_time = b.opening_time;
    if (b.closing_time) patch.closing_time = b.closing_time;
    if (b.default_break_minutes != null) patch.default_break_minutes = b.default_break_minutes;
    if (b.min_staff_json) patch.min_staff_json = b.min_staff_json;
    const { error } = await supabase.from("location_scheduling_settings").upsert(
      { location_id: b.location_id, ...patch },
      { onConflict: "location_id" },
    );
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  void DEFAULT_ORG_ID;
  return Response.json({ ok: true });
}
