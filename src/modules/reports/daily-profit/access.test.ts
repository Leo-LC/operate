import { describe, expect, it } from "vitest";
import type { UserPermissions } from "@/core/permissions/types";
import { canManageDailyProfit, canReadDailyProfit, filterAllowedLocations } from "./access";

function permissions(overrides: Partial<UserPermissions>): UserPermissions {
  return {
    global_role: "member",
    module_access: [],
    location_access: [],
    all_locations: false,
    ...overrides,
  };
}

describe("daily profit access", () => {
  it("allows direction to read but never to manage", () => {
    const direction = permissions({
      global_role: "direction",
      module_access: [{ module_key: "direction", can_read: true, can_write: false }],
    });
    expect(canReadDailyProfit(direction)).toBe(true);
    expect(canManageDailyProfit(direction)).toBe(false);
  });

  it("keeps management restricted to owner/admin", () => {
    const memberWithWrite = permissions({
      module_access: [{ module_key: "reports", can_read: true, can_write: true }],
    });
    expect(canReadDailyProfit(memberWithWrite)).toBe(true);
    expect(canManageDailyProfit(memberWithWrite)).toBe(false);
    expect(canManageDailyProfit(permissions({ global_role: "owner", all_locations: true }))).toBe(true);
  });

  it("denies users without reports or direction access", () => {
    expect(canReadDailyProfit(permissions({}))).toBe(false);
  });

  it("keeps only explicitly allowed shops for restricted users", () => {
    const rows = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
    expect(filterAllowedLocations(rows, ["b"])).toEqual([{ id: "b", name: "B" }]);
    expect(filterAllowedLocations(rows, null)).toEqual(rows);
  });
});
