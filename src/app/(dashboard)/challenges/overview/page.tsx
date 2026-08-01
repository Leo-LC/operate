import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getAllowedLocationIds } from "@/core/permissions/server";
import { ACCOUNTING_EXCLUDED_LOCATION_IDS } from "@/lib/constants";
import type { AdminLocation } from "@/modules/admin/types";
import { ChallengesOverview } from "@/modules/challenges/components/ChallengesOverview";

export const metadata = { title: "Overview — Challenges" };

export default async function ChallengesOverviewPage() {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.role === "owner";
  const canManage = isOwner;

  let locations: AdminLocation[] = [];
  if (session?.user) {
    const allowedIds = await getAllowedLocationIds(session.user.userId, isOwner);
    if (allowedIds === null || allowedIds.length > 0) {
      const supabase = getSupabaseServerClient();
      let query = supabase
        .from("locations")
        .select("id, name, slug, external_id, is_active, created_at, google_sheet_id")
        .eq("is_active", true)
        .order("name");

      if (allowedIds !== null) query = query.in("id", allowedIds);

      const { data } = await query;
      locations = (data ?? []).filter((l) => !ACCOUNTING_EXCLUDED_LOCATION_IDS.has(l.id));
    }
  }

  return <ChallengesOverview isOwner={isOwner} canManage={canManage} locations={locations} />;
}
