import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createEmployee, listEmployeeAssignmentsByBranch, listEmployees } from "@/lib/scheduling/data";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const employees = await listEmployees();
  if (!branchId) return Response.json({ employees });
  const employeeIds = await listEmployeeAssignmentsByBranch(branchId);
  return Response.json({ employees: employees.filter((employee) => employeeIds.includes(employee.id)) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json();
  await createEmployee({
    fullName: String(payload.fullName ?? ""),
    email: payload.email ? String(payload.email) : null,
    baseSalaryMonthly: Number(payload.baseSalaryMonthly ?? 0),
    branchIds: Array.isArray(payload.branchIds) ? payload.branchIds.map(String) : [],
  });
  return Response.json({ ok: true });
}
