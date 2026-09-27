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

export interface LiveSalaryEmployee {
  base_salary_monthly: number | null;
  service_charge_pct: number | null;
  service_charge_eligible?: boolean | null;
  location_id: string | null;
  employee_locations?: {
    location_id: string;
    base_salary_monthly?: number | null;
    service_charge_eligible?: boolean | null;
  }[] | null;
}

export interface LiveSalaryShare {
  base: number;
  serviceCharge: number;
  eligible: boolean;
}

/**
 * Live salary share of one employee at one shop, computed from current values
 * (no snapshot): base from the shop assignment (or profile), service charge =
 * shop revenue-to-date × pct (employee pct or shop default).
 * Same formula as POST /api/payments/calculate so generated records and live
 * previews always agree. Returns null when the employee is not assigned here.
 */
export function liveSalaryShare(
  emp: LiveSalaryEmployee,
  locationId: string,
  revenueToDate: number,
  defaultPct: number,
): LiveSalaryShare | null {
  const assignments = emp.employee_locations ?? [];
  const assigned =
    assignments.some((a) => String(a.location_id) === locationId) ||
    String(emp.location_id ?? "") === locationId;
  if (!assigned) return null;
  const assignment = assignments.find((a) => String(a.location_id) === locationId);
  const base = Number(assignment?.base_salary_monthly ?? emp.base_salary_monthly ?? 0);
  const locEligible = assignment?.service_charge_eligible;
  const eligible =
    locEligible !== undefined && locEligible !== null ? locEligible : (emp.service_charge_eligible ?? true);
  const pct = eligible ? (emp.service_charge_pct ?? defaultPct) : 0;
  const revenue = Number(revenueToDate ?? 0);
  const serviceCharge = eligible ? Math.round(revenue * (pct / 100) * 100) / 100 : 0;
  return { base, serviceCharge, eligible };
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
