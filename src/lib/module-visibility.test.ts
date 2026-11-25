import { describe, expect, it } from "vitest";
import { isValidVisibilityKey } from "./module-visibility";

describe("isValidVisibilityKey", () => {
  it("accepts module and tab keys", () => {
    expect(isValidVisibilityKey("module:attendance")).toBe(true);
    expect(isValidVisibilityKey("module:customer-insights")).toBe(true);
    expect(isValidVisibilityKey("tab:reviews.stats")).toBe(true);
    expect(isValidVisibilityKey("tab:direction.end_of_month")).toBe(true);
    expect(isValidVisibilityKey("tab:admin.audit-logs")).toBe(true);
  });

  it("rejects legacy keys without prefix and malformed keys", () => {
    expect(isValidVisibilityKey("attendance")).toBe(false);
    expect(isValidVisibilityKey("schedules")).toBe(false);
    expect(isValidVisibilityKey("")).toBe(false);
    expect(isValidVisibilityKey("module:")).toBe(false);
    expect(isValidVisibilityKey("tab:")).toBe(false);
    expect(isValidVisibilityKey("tab:foo bar")).toBe(false);
    expect(isValidVisibilityKey("tab:foo;drop table users")).toBe(false);
    expect(isValidVisibilityKey("module:foo/bar")).toBe(false);
  });
});
