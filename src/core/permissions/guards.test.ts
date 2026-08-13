import { describe, expect, it } from "vitest";
import {
  derivePermissionsFromRole,
  hasAllLocationsAccess,
  hasLocationAccess,
  hasModuleAccess,
  isOperationalAdmin,
} from "./guards";
import type { ModuleKey } from "./types";

describe("global admin permissions", () => {
  it("grants every operational module without individual access rows", () => {
    const permissions = derivePermissionsFromRole("admin");
    const modules: ModuleKey[] = [
      "reviews", "challenges", "documents", "animals", "schedules",
      "accounting", "reports", "contacts", "attendance", "payments",
      "wiki", "brand",
    ];

    expect(permissions.global_role).toBe("admin");
    expect(permissions.module_access).toEqual([]);
    for (const moduleKey of modules) {
      expect(hasModuleAccess(permissions, moduleKey)).toBe(true);
      expect(hasModuleAccess(permissions, moduleKey, true)).toBe(true);
    }
  });

  it("grants every shop without individual location rows", () => {
    const permissions = derivePermissionsFromRole("admin");
    expect(hasAllLocationsAccess(permissions)).toBe(true);
    expect(hasLocationAccess(permissions, "any-shop-id")).toBe(true);
  });

  it("keeps member access limited to assigned modules", () => {
    const permissions = derivePermissionsFromRole("member");
    expect(hasModuleAccess(permissions, "reviews")).toBe(true);
    expect(hasModuleAccess(permissions, "accounting")).toBe(false);
  });

  it("allows owner and admin to manage operational modules", () => {
    expect(isOperationalAdmin("owner")).toBe(true);
    expect(isOperationalAdmin("admin")).toBe(true);
    expect(isOperationalAdmin("member")).toBe(false);
    expect(isOperationalAdmin("reviewer")).toBe(false);
  });
});
