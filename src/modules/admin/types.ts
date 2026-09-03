import type { ModuleKey } from "@/core/permissions/types";

export type GlobalRole = "owner" | "admin" | "member" | "reviewer" | "direction";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  global_role: GlobalRole;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  has_password?: boolean;
  assigned_password?: string | null;
  module_access: ModuleAccessRow[];
  location_access: LocationAccessRow[];
}

export interface ModuleAccessRow {
  id: string;
  module_key: ModuleKey;
  can_read: boolean;
  can_write: boolean;
  granted_at: string;
}

export interface LocationAccessRow {
  id: string;
  location_id: string;
  location_name: string;
  granted_at: string;
}

export interface AdminLocation {
  id: string;
  name: string;
  slug: string;
  external_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  address_en?: string | null;
  address_th?: string | null;
  phone?: string | null;
  vat_number?: string | null;
  google_maps_url?: string | null;
  google_sheet_id?: string | null;
  notes?: string | null;
  default_service_charge_pct?: number;
  loyverse_store_id?: string | null;
}

export interface EmployeeLocationRow {
  id: string;
  location_id: string;
  location_name: string;
  is_primary: boolean;
  base_salary_monthly: number | null;
  service_charge_eligible: boolean;
}

export interface Employee {
  id: string;
  organization_id: string;
  location_id: string | null;
  location_name: string | null;
  first_name: string;
  last_name: string;
  position: string | null;
  nationality: string | null;
  national_id: string | null;
  work_permit_number: string | null;
  work_permit_expires_at: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  notes: string | null;
  base_salary_monthly: number | null;
  has_thai_bank_account: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  credit_note: string | null;
  service_charge_pct: number | null;
  employment_start_date?: string | null;
  employment_end_date?: string | null;
  service_charge_eligible?: boolean;
  archived_at: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  employee_locations?: EmployeeLocationRow[];
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  module_key: string | null;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}
