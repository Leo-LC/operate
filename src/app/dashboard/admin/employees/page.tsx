import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { EmployeesListClient } from "@/modules/admin/components/EmployeesListClient";
import type { Employee, AdminLocation, EmployeeLocationRow } from "@/modules/admin/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export default async function AdminEmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const supabase = getSupabaseServerClient();

  const [{ data: empData }, { data: locData }] = await Promise.all([
    supabase
      .from("employees")
      .select(`
        id, organization_id, location_id, first_name, last_name, position,
        nationality, national_id, work_permit_number, work_permit_expires_at,
        email, phone, active, notes, base_salary_monthly, has_thai_bank_account,
        user_id, archived_at, created_at, updated_at,
        locations ( name ),
        employee_locations ( id, location_id, is_primary, locations ( name ) )
      `)
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

  type ELRow = { id: string; location_id: string; is_primary: boolean; locations: { name: string } | null };
  type EmpRow = {
    id: string; organization_id: string; location_id: string | null;
    first_name: string; last_name: string; position: string | null;
    nationality: string | null; national_id: string | null;
    work_permit_number: string | null; work_permit_expires_at: string | null;
    email: string | null; phone: string | null; active: boolean;
    notes: string | null; base_salary_monthly: number | null;
    has_thai_bank_account: boolean; archived_at: string | null;
    user_id: string | null; created_at: string; updated_at: string;
    locations: { name: string } | null;
    employee_locations: ELRow[] | null;
  };

  const employees: Employee[] = (empData as unknown as EmpRow[] ?? []).map((e) => ({
    id: e.id,
    organization_id: e.organization_id,
    location_id: e.location_id ?? null,
    location_name: e.locations?.name ?? null,
    first_name: e.first_name,
    last_name: e.last_name,
    position: e.position ?? null,
    nationality: e.nationality ?? null,
    national_id: e.national_id ?? null,
    work_permit_number: e.work_permit_number ?? null,
    work_permit_expires_at: e.work_permit_expires_at ?? null,
    email: e.email ?? null,
    phone: e.phone ?? null,
    active: e.active,
    notes: e.notes ?? null,
    base_salary_monthly: e.base_salary_monthly ?? null,
    has_thai_bank_account: e.has_thai_bank_account ?? false,
    archived_at: e.archived_at ?? null,
    user_id: e.user_id ?? null,
    created_at: e.created_at,
    updated_at: e.updated_at,
    employee_locations: (e.employee_locations ?? []).map((el): EmployeeLocationRow => ({
      id: el.id,
      location_id: el.location_id,
      location_name: el.locations?.name ?? el.location_id,
      is_primary: el.is_primary,
    })),
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
