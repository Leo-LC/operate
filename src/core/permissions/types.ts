export type ModuleKey =
  | "reviews"
  | "documents"
  | "animals"
  | "schedules"
  | "accounting"
  | "reports"
  | "contacts"
  | "attendance"
  | "payments"
  | "admin";

export type GlobalRole = "owner" | "admin" | "member";

export interface ModulePermission {
  module_key: ModuleKey;
  can_read: boolean;
  can_write: boolean;
}

export interface LocationAccess {
  location_id: string;
}

export interface UserPermissions {
  global_role: GlobalRole;
  module_access: ModulePermission[];
  location_access: LocationAccess[];
  /** When true, the user has access to all locations regardless of location_access list */
  all_locations: boolean;
}
