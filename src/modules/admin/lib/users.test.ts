import { describe, expect, it } from "vitest";
import { isMissingAssignedPasswordColumn } from "./users-compat";

describe("admin user compatibility", () => {
  it("recognizes the missing encrypted-password migration error", () => {
    expect(isMissingAssignedPasswordColumn({
      code: "42703",
      message: "column users.assigned_password_encrypted does not exist",
    })).toBe(true);
    expect(isMissingAssignedPasswordColumn({ code: "42703", message: "another column is missing" })).toBe(false);
  });
});
