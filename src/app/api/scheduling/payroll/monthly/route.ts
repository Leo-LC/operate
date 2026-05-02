import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompanySetting, listAdjustments, listEmployees } from "@/lib/scheduling/data";
import { computeMonthlyRecap } from "@/lib/scheduling/payroll";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const month = url.searchParams.get("month");
  if (!branchId || !month) {
    return Response.json({ error: "branchId and month are required" }, { status: 400 });
  }

  const [employees, adjustments, settings] = await Promise.all([
    listEmployees(),
    listAdjustments({ branchId, month }),
    getCompanySetting(),
  ]);

  const recap = employees.map((employee) =>
    computeMonthlyRecap({
      employee,
      branchId,
      adjustments: adjustments.filter((a) => a.employeeId === employee.id),
      standardHoursPerMonth: settings.standardHoursPerMonth,
      overtimeMultiplier: settings.overtimeMultiplier,
    }),
  );
  return Response.json({ recap, settings });
}
