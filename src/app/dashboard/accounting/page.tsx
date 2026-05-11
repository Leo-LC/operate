import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AccountingClient } from "@/modules/accounting/components/AccountingClient";
import type { AdminLocation } from "@/modules/admin/types";

export default async function AccountingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at")
    .eq("is_active", true)
    .order("name");

  const locations: AdminLocation[] = data ?? [];

  const canManage = session.user.role === "owner";
  return <AccountingClient locations={locations} canManage={canManage} />;
}
