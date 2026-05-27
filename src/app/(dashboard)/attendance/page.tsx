import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AttendanceClient } from "@/modules/attendance/components/AttendanceClient";
import type { AdminLocation } from "@/modules/admin/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const supabase = getSupabaseServerClient();
  const isOwner = session.user.role === "owner";

  let locationIds: string[] | null = null;
  if (!isOwner && session.user.userId) {
    const { data: access } = await supabase
      .from("user_location_access")
      .select("location_id")
      .eq("user_id", session.user.userId);
    locationIds = (access ?? []).map((r: { location_id: string }) => r.location_id);
  }

  let locQuery = supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (locationIds !== null) {
    if (locationIds.length === 0) {
      return (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 24, fontSize: 13, color: "var(--fg-4)" }}>
          You don&apos;t have access to any location yet. Ask your admin.
        </div>
      );
    }
    locQuery = locQuery.in("id", locationIds);
  }

  const { data: locData } = await locQuery;

  const locations: AdminLocation[] = (locData ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    external_id: l.external_id ?? null,
    is_active: l.is_active,
    created_at: l.created_at,
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <AttendanceClient initialLocations={locations} isOwner={isOwner} />
    </div>
  );
}
