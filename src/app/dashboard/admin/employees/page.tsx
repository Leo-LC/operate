import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { EmployeesListClient } from "@/modules/admin/components/EmployeesListClient";
import type { AdminLocation } from "@/modules/admin/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export default async function AdminEmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const supabase = getSupabaseServerClient();
  const { data: locData } = await supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .order("name", { ascending: true });

  const locations: AdminLocation[] = (locData ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    external_id: l.external_id ?? null,
    is_active: l.is_active,
    created_at: l.created_at,
  }));

  return <EmployeesListClient locations={locations} />;
}
