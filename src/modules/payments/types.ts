export type PaymentMethod = "bank_transfer" | "cash";

export interface PaymentAdjustment {
  id: string;
  payment_record_id: string;
  amount: number;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  organization_id: string;
  location_id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  // Payment amounts
  base_salary: number;
  service_charge: number;
  // Admin
  payment_method: PaymentMethod;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  adjustments: PaymentAdjustment[];
}

export function adjustmentsTotal(r: PaymentRecord): number {
  return (r.adjustments ?? []).reduce((sum, a) => sum + a.amount, 0);
}

export function totalPayment(r: PaymentRecord): number {
  return r.base_salary + r.service_charge + adjustmentsTotal(r);
}
