import type { ModuleKey, SessionRole, UserPermissions } from "./types";

export function isOperationalAdmin(role: SessionRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Returns true if the user has read (or write) access to the given module. */
export function hasModuleAccess(
  permissions: UserPermissions,
  moduleKey: ModuleKey,
  requireWrite = false,
): boolean {
  if (permissions.global_role === "owner" || permissions.global_role === "admin") return true;
  const access = permissions.module_access.find((a) => a.module_key === moduleKey);
  if (!access) return false;
  return requireWrite ? access.can_write : access.can_read;
}

/** Returns true if the user has access to the given location. */
export function hasLocationAccess(permissions: UserPermissions, locationId: string): boolean {
  if (permissions.global_role === "owner" || permissions.global_role === "admin" || permissions.all_locations) return true;
  return permissions.location_access.some((a) => a.location_id === locationId);
}

/** Returns true if the user can access all locations. */
export function hasAllLocationsAccess(permissions: UserPermissions): boolean {
  return permissions.global_role === "owner" || permissions.global_role === "admin" || permissions.all_locations;
}

/**
 * Derives a UserPermissions object from the current NextAuth session role.
 *
 * This is a bridge used until the platform DB tables (users, user_module_access,
 * user_location_access) are populated and wired into the auth flow. Once the DB
 * is ready, replace calls to this with a DB-backed getUserPermissions(email).
 */
export function derivePermissionsFromRole(
  role: SessionRole | undefined,
): UserPermissions {
  if (role === "owner" || role === "admin") {
    return {
      global_role: role,
      module_access: [],
      location_access: [],
      all_locations: true,
    };
  }

  if (role === "reviewer") {
    return {
      global_role: "reviewer",
      module_access: [{ module_key: "reviews", can_read: true, can_write: true }],
      location_access: [],
      all_locations: false,
    };
  }

  // staff: reviews read+write, wiki read-only, all locations visible
  return {
    global_role: "member",
    module_access: [
      { module_key: "reviews", can_read: true, can_write: true },
      { module_key: "wiki", can_read: true, can_write: false },
    ],
    location_access: [],
    all_locations: true,
  };
}
