import { describe, expect, it } from "vitest";
import { ACCENT_STORAGE_KEY, normalizeAccent } from "./accent";

describe("normalizeAccent", () => {
  it("accepts the two supported accents", () => {
    expect(normalizeAccent("green")).toBe("green");
    expect(normalizeAccent("orange")).toBe("orange");
  });

  it("falls back to the company default for missing or invalid values", () => {
    expect(normalizeAccent(null)).toBe("default");
    expect(normalizeAccent(undefined)).toBe("default");
    expect(normalizeAccent("")).toBe("default");
    expect(normalizeAccent("blue")).toBe("default");
    expect(normalizeAccent("default")).toBe("default");
  });

  it("uses a stable browser-local storage key", () => {
    expect(ACCENT_STORAGE_KEY).toBe("operate.accent");
  });
});
