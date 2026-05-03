import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ScheduleGrid } from "@/modules/schedules/components/ScheduleGrid";
import type { Schedule, ScheduleShift } from "@/modules/schedules/types";
import type { Employee } from "@/modules/admin/types";
import { ChevronLeftIcon } from "lucide-react";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export default async function ScheduleDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const supabase = getSupabaseServerClient();

  const { data: sched, error: sErr } = await supabase
    .from("schedules")
    .select("*, locations ( name )")
    .eq("id", params.id)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .single();

  if (sErr || !sched) notFound();

  const [{ data: shiftsData }, { data: empData }] = await Promise.all([
    supabase
      .from("schedule_shifts")
      .select("id, schedule_id, employee_id, shift_date, start_time, end_time, break_minutes, notes, employees ( first_name, last_name )")
      .eq("schedule_id", params.id),
    supabase
      .from("employees")
      .select("id, organization_id, location_id, first_name, last_name, position, email, phone, active, notes, user_id, created_at, updated_at, locations ( name )")
      .eq("organization_id", ORG_ID)
      .eq("location_id", sched.location_id)
      .eq("active", true)
      .is("deleted_at", null)
      .order("last_name", { ascending: true }),
  ]);

  type ShiftRow = { id: string; schedule_id: string; employee_id: string; shift_date: string; start_time: string | null; end_time: string | null; break_minutes: number; notes: string | null; employees: { first_name: string; last_name: string } | null };
  const shifts: ScheduleShift[] = (shiftsData as unknown as ShiftRow[]).map((s) => ({
    id: s.id,
    schedule_id: s.schedule_id,
    employee_id: s.employee_id,
    employee_name: s.employees ? `${s.employees.first_name} ${s.employees.last_name}` : null,
    shift_date: s.shift_date,
    start_time: s.start_time ?? null,
    end_time: s.end_time ?? null,
    break_minutes: s.break_minutes,
    notes: s.notes ?? null,
  }));

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

  const schedule: Schedule = {
    id: sched.id,
    organization_id: sched.organization_id,
    location_id: sched.location_id,
    location_name: (sched.locations as { name: string } | null)?.name ?? null,
    name: sched.name,
    week_start_date: sched.week_start_date,
    status: sched.status as Schedule["status"],
    created_by: sched.created_by ?? null,
    created_at: sched.created_at,
    updated_at: sched.updated_at,
  };

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/scheduling"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ChevronLeftIcon className="size-4" />
        All schedules
      </Link>
      <ScheduleGrid schedule={schedule} initialShifts={shifts} employees={employees} />
    </div>
  );
}
