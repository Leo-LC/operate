import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { WeeklyViewClient } from "@/modules/scheduling/components/WeeklyViewClient";
import { mondayOf } from "@/modules/scheduling/lib/math";

function todayBangkok(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(new Date());
}

export default async function WeeklySchedulePage({ searchParams }: { searchParams: { location?: string; week?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const supabase = getSupabaseServerClient();
  const { data: locs } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .order("name");

  const locations = (locs ?? []).map((l) => ({ id: l.id as string, name: l.name as string }));
  if (locations.length === 0) return <div className="text-sm text-muted-foreground">No active locations.</div>;
  const locationId = locations.some((l) => l.id === searchParams.location) ? searchParams.location! : locations[0].id;
  const rawWeek = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week ?? "") ? searchParams.week! : todayBangkok();
  const week = mondayOf(rawWeek);
  const canEdit = session.user.role === "owner" || session.user.role === "admin";

  return (
    <div>
      {!canEdit && (
        <p className="mb-4 text-sm text-muted-foreground">Read-only for your role — only owners can edit.</p>
      )}
      <WeeklyViewClient locations={locations} initialLocationId={locationId} initialWeek={week} canEdit={canEdit} />
    </div>
  );
}
