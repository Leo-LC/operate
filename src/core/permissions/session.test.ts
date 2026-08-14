import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasModuleAccess } from "./guards";
import { getUserPermissionsFromSession } from "./server";

const fromTable = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: fromTable }),
}));

function chainSingle(row: unknown) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: row ?? null, error: null })),
      })),
    })),
  };
}

function chainRows(rows: unknown[]) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({ data: rows, error: null })),
    })),
  };
}

describe("getUserPermissionsFromSession", () => {
  beforeEach(() => {
    fromTable.mockReset();
  });

  it("falls back to role-derived defaults when there is no userId", async () => {
    const perms = await getUserPermissionsFromSession({ user: { role: "member" } });
    expect(perms.global_role).toBe("member");
    expect(hasModuleAccess(perms, "accounting")).toBe(false);
    expect(fromTable).not.toHaveBeenCalled();
  });

  it("uses DB module grants when a userId is present", async () => {
    fromTable.mockImplementation((table: string) => {
      if (table === "users") {
        return chainSingle({ global_role: "member" });
      }
      if (table === "user_module_access") {
        return chainRows([{ module_key: "accounting", can_read: true, can_write: false }]);
      }
      if (table === "user_location_access") {
        return chainRows([{ location_id: "loc-1" }]);
      }
      return chainRows([]);
    });

    const perms = await getUserPermissionsFromSession({ user: { userId: "u-1", role: "member" } });
    expect(perms.global_role).toBe("member");
    expect(hasModuleAccess(perms, "accounting")).toBe(true);
    expect(hasModuleAccess(perms, "documents")).toBe(false);
    expect(fromTable.mock.calls.map((c) => c[0])).toEqual([
      "users",
      "user_module_access",
      "user_location_access",
    ]);
  });

  it("treats admin like a global admin regardless of grant rows", async () => {
    fromTable.mockImplementation((table: string) => {
      if (table === "users") return chainSingle({ global_role: "admin" });
      return chainRows([]);
    });

    const perms = await getUserPermissionsFromSession({ user: { userId: "u-1", role: "admin" } });
    expect(perms.global_role).toBe("admin");
    expect(hasModuleAccess(perms, "documents")).toBe(true);
  });
});
