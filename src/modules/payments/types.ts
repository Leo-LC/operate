export type PaymentMethod = "bank_transfer" | "cash";
export type PaymentStatus = "draft" | "confirmed" | "paid";

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
  status: PaymentStatus;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function totalPayment(r: PaymentRecord): number {
  return r.base_salary - r.deductions + r.overtime_pay + r.service_charge + r.bonus_amount;
}

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  paid: "Paid",
};

export const STATUS_COLORS: Record<PaymentStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};
