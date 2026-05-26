export type PaymentMethod = "bank_transfer" | "cash";

export interface PaymentRecord {
  id: string;
  organization_id: string;
  location_id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  // Payment amounts
  base_salary: number;
  deductions: number;
  deduction_note: string | null;
  overtime_pay: number;
  service_charge: number;
  bonus_amount: number;
  bonus_note: string | null;
  // Admin
  payment_method: PaymentMethod;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function totalPayment(r: PaymentRecord): number {
  return r.base_salary - r.deductions + r.overtime_pay + r.service_charge + r.bonus_amount;
}

