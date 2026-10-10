import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { AnnualGridClient } from "@/modules/scheduling/components/AnnualGridClient";

export default async function AnnualSchedulePage({
  searchParams,
}: {
  searchParams: { location?: string; month?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  // Layout already gates schedules module access; writes are owners-only in the API.

  const supabase = getSupabaseServerClient();
  const { data: locs } = await supabase
    .from("locations")
    .select("id, name, slug")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .order("name");

  const locations = (locs ?? []).map((l) => ({ id: l.id as string, name: l.name as string }));
  if (locations.length === 0) {
    return <div className="text-sm text-muted-foreground">No active locations.</div>;
  }
  const locationId = locations.some((l) => l.id === searchParams.location) ? searchParams.location! : locations[0].id;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : defaultMonth;
  const canEdit = session.user.role === "owner" || session.user.role === "admin";

  return (
    <div>
      {!canEdit && (
        <p className="mb-4 text-sm text-muted-foreground">Read-only for your role — only owners can save.</p>
      )}
      <AnnualGridClient locations={locations} initialLocationId={locationId} initialMonth={month} canEdit={canEdit} />
    </div>
  );
}
