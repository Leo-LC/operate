import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { EmployeesListClient } from "@/modules/admin/components/EmployeesListClient";
import type { Employee, AdminLocation } from "@/modules/admin/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export default async function AdminEmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const supabase = getSupabaseServerClient();

  const [{ data: empData }, { data: locData }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, organization_id, location_id, first_name, last_name, position, email, phone, active, notes, user_id, created_at, updated_at, locations ( name )")
      .eq("organization_id", ORG_ID)
      .is("deleted_at", null)
      .order("last_name", { ascending: true }),
    supabase
      .from("locations")
      .select("id, name, slug, external_id, is_active, created_at")
      .eq("organization_id", ORG_ID)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  type EmpRow = { id: string; organization_id: string; location_id: string | null; first_name: string; last_name: string; position: string | null; email: string | null; phone: string | null; active: boolean; notes: string | null; user_id: string | null; created_at: string; updated_at: string; locations: { name: string } | null };
  const employees: Employee[] = (empData as unknown as EmpRow[]).map((e) => ({
    id: e.id,
    organization_id: e.organization_id,
    location_id: e.location_id ?? null,
    location_name: (e.locations as { name: string } | null)?.name ?? null,
    first_name: e.first_name,
    last_name: e.last_name,
    position: e.position ?? null,
    email: e.email ?? null,
    phone: e.phone ?? null,
    active: e.active,
    notes: e.notes ?? null,
    user_id: e.user_id ?? null,
    created_at: e.created_at,
    updated_at: e.updated_at,
  }));

  const locations: AdminLocation[] = (locData ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    external_id: l.external_id ?? null,
    is_active: l.is_active,
    created_at: l.created_at,
  }));

  return <EmployeesListClient initialEmployees={employees} locations={locations} />;
}
