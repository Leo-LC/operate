import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { OverviewClient } from "@/modules/overview/components/OverviewClient";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const supabase = getSupabaseServerClient();
  const { data: locData } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", ORG_ID)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Company Overview</h1>
        <p className="text-sm text-muted-foreground">Aggregated view across all shops.</p>
      </div>
      <OverviewClient initialLocations={locData ?? []} />
    </div>
  );
}
