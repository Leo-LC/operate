import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { UserDetailClient } from "@/modules/admin/components/UserDetailClient";
import type { AdminUser, AdminLocation } from "@/modules/admin/types";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const supabase = getSupabaseServerClient();

  const [{ data: userData }, { data: locationData }] = await Promise.all([
    supabase
      .from("users")
      .select(`
        id, email, name, global_role, organization_id, created_at, updated_at,
        user_module_access!user_module_access_user_id_fkey ( id, module_key, can_read, can_write, granted_at ),
        user_location_access!user_location_access_user_id_fkey ( id, location_id, granted_at, locations ( name ) )
      `)
      .eq("id", params.id)
      .single(),
    supabase
      .from("locations")
      .select("id, name, slug, external_id, is_active, created_at")
      .order("name"),
  ]);

  if (!userData) notFound();

  type LaRow = { id: string; location_id: string; granted_at: string; locations: { name: string } | null };
  const user: AdminUser = {
    ...userData,
    module_access: userData.user_module_access ?? [],
    location_access: (userData.user_location_access as unknown as LaRow[] ?? []).map((la) => ({
      id: la.id,
      location_id: la.location_id,
      location_name: la.locations?.name ?? la.location_id,
      granted_at: la.granted_at,
    })),
  };

  const locations: AdminLocation[] = locationData ?? [];

  return <UserDetailClient user={user} allLocations={locations} />;
}
