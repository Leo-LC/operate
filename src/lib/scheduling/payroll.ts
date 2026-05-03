import type { Employee, MonthlyEmployeeRecap, TimeAdjustment } from "@/lib/scheduling/types";

export function computeBaseHourly(baseSalaryMonthly: number, standardHoursPerMonth: number): number {
  if (standardHoursPerMonth <= 0) return 0;
  return Number((baseSalaryMonthly / standardHoursPerMonth).toFixed(4));
}

export function computeMonthlyRecap(args: {
  employee: Employee;
  branchId: string;
  adjustments: TimeAdjustment[];
  standardHoursPerMonth: number;
  overtimeMultiplier: number;
}): MonthlyEmployeeRecap {
  const { employee, branchId, adjustments, standardHoursPerMonth, overtimeMultiplier } = args;
  const overtimeHours = adjustments.filter((a) => a.type === "overtime").reduce((acc, a) => acc + a.hours, 0);
  const missedHours = adjustments
    .filter((a) => a.type === "missed_undertime")
    .reduce((acc, a) => acc + a.hours, 0);
  const baseHourly = computeBaseHourly(employee.baseSalaryMonthly, standardHoursPerMonth);
  const overtimeAmount = overtimeHours * baseHourly * overtimeMultiplier;
  const deductionAmount = missedHours * baseHourly;

  return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    branchId,
    overtimeHours: Number(overtimeHours.toFixed(2)),
    missedHours: Number(missedHours.toFixed(2)),
    netHoursDelta: Number((overtimeHours - missedHours).toFixed(2)),
    baseHourly: Number(baseHourly.toFixed(2)),
    overtimeAmount: Number(overtimeAmount.toFixed(2)),
    deductionAmount: Number(deductionAmount.toFixed(2)),
    netAdjustmentAmount: Number((overtimeAmount - deductionAmount).toFixed(2)),
  };
}
