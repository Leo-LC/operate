import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { isOperationalAdmin } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { TimeOffClient } from "@/modules/scheduling/components/TimeOffClient";

export default async function SchedulingTimeOffPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (!isOperationalAdmin(session.user.role)) redirect("/scheduling");

  const supabase = getSupabaseServerClient();
  const { data: emps } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .eq("organization_id", DEFAULT_ORG_ID)
    .is("deleted_at", null)
    .eq("active", true)
    .order("first_name");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Time off</h1>
        <p className="text-sm text-muted-foreground">Approved leave. The Annual editor warns when someone is scheduled on these dates.</p>
      </div>
      <TimeOffClient employees={(emps ?? []).map((e) => ({ id: e.id as string, name: `${e.first_name} ${e.last_name}` }))} />
    </div>
  );
}
