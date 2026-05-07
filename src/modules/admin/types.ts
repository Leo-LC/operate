import type { ModuleKey } from "@/core/permissions/types";

export type GlobalRole = "owner" | "admin" | "member";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  global_role: GlobalRole;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
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
}

export interface Employee {
  id: string;
  organization_id: string;
  location_id: string | null;
  location_name: string | null;
  first_name: string;
  last_name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  notes: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
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
