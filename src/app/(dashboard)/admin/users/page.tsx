import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { UsersListClient } from "@/modules/admin/components/UsersListClient";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (!["owner", "admin"].includes(session.user.role ?? "")) redirect("/home");

  const supabase = getSupabaseServerClient();
  const { data: locationsData } = await supabase
    .from("locations")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return <UsersListClient allLocations={locationsData ?? []} />;
}
