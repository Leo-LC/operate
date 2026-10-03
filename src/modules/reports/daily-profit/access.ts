import { hasModuleAccess } from "@/core/permissions/guards";
import type { UserPermissions } from "@/core/permissions/types";

export function canReadDailyProfit(permissions: UserPermissions) {
  return hasModuleAccess(permissions, "reports") || hasModuleAccess(permissions, "direction");
}

export function canManageDailyProfit(permissions: UserPermissions) {
  const isManager = permissions.global_role === "owner" || permissions.global_role === "admin";
  return isManager && hasModuleAccess(permissions, "reports", true);
}

export function filterAllowedLocations<T extends { id: unknown }>(rows: T[], allowedLocationIds?: string[] | null) {
  if (allowedLocationIds == null) return rows;
  const allowed = new Set(allowedLocationIds);
  return rows.filter((row) => allowed.has(String(row.id)));
}
