import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { EmployeesListClient } from "@/modules/admin/components/EmployeesListClient";
import type { AdminLocation } from "@/modules/admin/types";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/home");
  const { data } = await getSupabaseServerClient().from("locations").select("id,name,slug,external_id,is_active,created_at").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name");
  return <EmployeesListClient locations={(data ?? []) as AdminLocation[]} />;
}
