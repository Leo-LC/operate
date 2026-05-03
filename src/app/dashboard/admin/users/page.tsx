import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { UsersListClient } from "@/modules/admin/components/UsersListClient";
import type { AdminUser } from "@/modules/admin/types";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("users")
    .select(`
      id, email, name, global_role, organization_id, created_at, updated_at,
      user_module_access ( id, module_key, can_read, can_write, granted_at ),
      user_location_access ( id, location_id, granted_at, locations ( name ) )
    `)
    .order("created_at", { ascending: true });

  type LaRow = { id: string; location_id: string; granted_at: string; locations: { name: string } | null };
  const users: AdminUser[] = (data ?? []).map((u) => ({
    ...u,
    module_access: u.user_module_access ?? [],
    location_access: (u.user_location_access as unknown as LaRow[] ?? []).map((la) => ({
      id: la.id,
      location_id: la.location_id,
      location_name: la.locations?.name ?? la.location_id,
      granted_at: la.granted_at,
    })),
  }));

  return <UsersListClient initialUsers={users} />;
}
