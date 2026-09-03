/**
 * Shared HR payroll helpers — single source of truth for Salaries / Service Charge / Bonus → Payroll
 * Used by recurring-costs snapshots, monthly-snapshots API and reports daily P&L.
 */

export function calcServiceCharge(revenue: number, ratePct: number, employeeCount: number): number {
  if (!Number.isFinite(revenue) || !Number.isFinite(ratePct) || !Number.isFinite(employeeCount)) return 0;
  if (revenue <= 0 || ratePct <= 0 || employeeCount <= 0) return 0;
  return revenue * (ratePct / 100) * employeeCount;
}

export function calcPayroll(salaries: number, serviceCharge: number, bonus: number): number {
  return Number(salaries || 0) + Number(serviceCharge || 0) + Number(bonus || 0);
}

export interface HrBreakdown {
  salaries: number;
  serviceCharge: number;
  bonus: number;
  payroll: number;
}

export function hrBreakdown(input: { salaries: number; serviceCharge: number; bonus: number }): HrBreakdown {
  const salaries = Number(input.salaries || 0);
  const serviceCharge = Number(input.serviceCharge || 0);
  const bonus = Number(input.bonus || 0);
  return { salaries, serviceCharge, bonus, payroll: calcPayroll(salaries, serviceCharge, bonus) };
}
