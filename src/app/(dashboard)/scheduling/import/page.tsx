import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { isOperationalAdmin } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { ImportClient } from "@/modules/scheduling/components/ImportClient";

export default async function SchedulingImportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (!isOperationalAdmin(session.user.role)) redirect("/scheduling");

  const supabase = getSupabaseServerClient();
  const [{ data: locs }, { data: emps }] = await Promise.all([
    supabase.from("locations").select("id, name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase
      .from("employees")
      .select("id, first_name, last_name, location_id")
      .eq("organization_id", DEFAULT_ORG_ID)
      .is("deleted_at", null)
      .eq("active", true)
      .order("first_name"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Import from Google Sheets</h1>
        <p className="text-sm text-muted-foreground">
          Paste one week tab at a time. Preview, map names, then import. Verify in the Annual editor afterwards.
        </p>
      </div>
      <ImportClient
        locations={(locs ?? []).map((l) => ({ id: l.id as string, name: l.name as string }))}
        employees={(emps ?? []).map((e) => ({
          id: e.id as string,
          name: `${e.first_name} ${e.last_name}`,
          location_id: (e.location_id ?? null) as string | null,
        }))}
      />
    </div>
  );
}
