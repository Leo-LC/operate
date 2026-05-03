import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { HomeClient } from "@/modules/home/components/HomeClient";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const name = session?.user?.name ?? session?.user?.email ?? "there";

  const permissions = derivePermissionsFromRole(role);

  let docsAlert = 0;
  let animalsAlert = 0;

  if (hasModuleAccess(permissions, "documents")) {
    try {
      const supabase = getSupabaseServerClient();
      const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ORG_ID)
        .is("deleted_at", null)
        .not("expires_at", "is", null)
        .lte("expires_at", soon);
      docsAlert = count ?? 0;
    } catch {
      // best-effort
    }
  }

  if (hasModuleAccess(permissions, "animals")) {
    try {
      const supabase = getSupabaseServerClient();
      const { count } = await supabase
        .from("animals")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ORG_ID)
        .is("deleted_at", null)
        .neq("health_status", "healthy");
      animalsAlert = count ?? 0;
    } catch {
      // best-effort
    }
  }

  return (
    <HomeClient
      name={name}
      role={role}
      docsAlert={docsAlert}
      animalsAlert={animalsAlert}
    />
  );
}
