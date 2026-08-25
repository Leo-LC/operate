import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { UserDetailClient } from "@/modules/admin/components/UserDetailClient";
import {
  ADMIN_USER_LIST_SELECT,
  ADMIN_USER_SELECT,
  isMissingAssignedPasswordColumn,
  mapAdminUser,
} from "@/modules/admin/lib/users";
import type { DbUserRow } from "@/modules/admin/lib/users";
import type { AdminLocation } from "@/modules/admin/types";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (!["owner", "admin"].includes(session.user.role ?? "")) redirect("/home");

  const supabase = getSupabaseServerClient();

  const [userResult, { data: locationData }] = await Promise.all([
    supabase
      .from("users")
      .select(ADMIN_USER_SELECT)
      .eq("id", params.id)
      .single(),
    supabase
      .from("locations")
      .select("id, name, slug, external_id, is_active, created_at")
      .order("name"),
  ]);

  let userData: DbUserRow | null = userResult.data;
  if (isMissingAssignedPasswordColumn(userResult.error)) {
    const fallback = await supabase
      .from("users")
      .select(ADMIN_USER_LIST_SELECT)
      .eq("id", params.id)
      .single();
    userData = fallback.data;
  }

  if (!userData) notFound();

  const user = mapAdminUser(userData, { includeAssignedPassword: true });
  const locations: AdminLocation[] = locationData ?? [];

  return <UserDetailClient user={user} allLocations={locations} />;
}
