import { decryptPassword } from "@/lib/password-crypto";
import type { AdminUser, ModuleAccessRow } from "@/modules/admin/types";
export { isMissingAssignedPasswordColumn } from "./users-compat";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbUserRow = Record<string, any>;

export function mapAdminUser(user: DbUserRow, options?: { includeAssignedPassword?: boolean }): AdminUser {
  const includeAssignedPassword = options?.includeAssignedPassword ?? false;
  type LaRow = { id: string; location_id: string; granted_at: string; locations: { name: string } | null };
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    global_role: user.global_role,
    organization_id: user.organization_id,
    created_at: user.created_at,
    updated_at: user.updated_at,
    has_password: !!user.password_hash,
    assigned_password: includeAssignedPassword && user.assigned_password_encrypted
      ? decryptPassword(user.assigned_password_encrypted)
      : null,
    module_access: (user.user_module_access ?? []) as ModuleAccessRow[],
    location_access: ((user.user_location_access ?? []) as LaRow[]).map((la) => ({
      id: la.id,
      location_id: la.location_id,
      location_name: la.locations?.name ?? la.location_id,
      granted_at: la.granted_at,
    })),
  };
}

export const ADMIN_USER_LIST_SELECT = `
  id, email, name, global_role, organization_id, created_at, updated_at,
  password_hash,
  user_module_access!user_module_access_user_id_fkey ( id, module_key, can_read, can_write, granted_at ),
  user_location_access!user_location_access_user_id_fkey ( id, location_id, granted_at, locations ( name ) )
`;

export const ADMIN_USER_SELECT = `
  ${ADMIN_USER_LIST_SELECT},
  assigned_password_encrypted
`;

export function sanitizeAuditUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...updates };
  delete sanitized.password_hash;
  delete sanitized.assigned_password_encrypted;
  if ("password" in sanitized) sanitized.password = "[redacted]";
  return sanitized;
}
