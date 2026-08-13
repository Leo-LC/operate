import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ScheduleListClient } from "@/modules/schedules/components/ScheduleListClient";
import { getAllowedLocationIds } from "@/core/permissions/server";
import type { Schedule } from "@/modules/schedules/types";
import type { AdminLocation } from "@/modules/admin/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export default async function SchedulingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const allowedIds = await getAllowedLocationIds(session.user.userId, session.user.role === "owner" || session.user.role === "admin");

  if (allowedIds !== null && allowedIds.length === 0) {
    return (
      <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 24, fontSize: 13, color: "var(--fg-4)" }}>
        You don&apos;t have access to any location yet. Ask your admin.
      </div>
    );
  }

  const supabase = getSupabaseServerClient();

  let schedQuery = supabase
    .from("schedules")
    .select("id, organization_id, location_id, name, week_start_date, status, created_by, created_at, updated_at, locations ( name )")
    .eq("organization_id", DEFAULT_ORG_ID)
    .is("deleted_at", null)
    .order("week_start_date", { ascending: false });

  let locQuery = supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (allowedIds !== null) {
    schedQuery = schedQuery.in("location_id", allowedIds);
    locQuery = locQuery.in("id", allowedIds);
  }

  const [{ data: schedData }, { data: locData }] = await Promise.all([schedQuery, locQuery]);

  type SchedRow = { id: string; organization_id: string; location_id: string; name: string; week_start_date: string; status: string; created_by: string | null; created_at: string; updated_at: string; locations: { name: string } | null };
  const schedules: Schedule[] = (schedData as unknown as SchedRow[]).map((s) => ({
    id: s.id,
    organization_id: s.organization_id,
    location_id: s.location_id,
    location_name: (s.locations as { name: string } | null)?.name ?? null,
    name: s.name,
    week_start_date: s.week_start_date,
    status: s.status as Schedule["status"],
    created_by: s.created_by ?? null,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));

  const locations: AdminLocation[] = (locData ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    external_id: l.external_id ?? null,
    is_active: l.is_active,
    created_at: l.created_at,
  }));

  return (
    <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 24 }}>
      <ScheduleListClient initialSchedules={schedules} locations={locations} />
    </div>
  );
}
