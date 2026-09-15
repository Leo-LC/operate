import { describe, expect, it } from "vitest";
import {
  formatThaiBankAccount,
  isCompleteThaiBankAccount,
  normalizeThaiBankAccountDigits,
} from "./thai-bank-account";

describe("thai-bank-account", () => {
  it("formats progressive input while typing", () => {
    expect(formatThaiBankAccount("")).toBe("");
    expect(formatThaiBankAccount("1")).toBe("1");
    expect(formatThaiBankAccount("123")).toBe("123");
    expect(formatThaiBankAccount("1234")).toBe("123-4");
    expect(formatThaiBankAccount("12345")).toBe("123-4-5");
    expect(formatThaiBankAccount("123456789")).toBe("123-4-56789");
    expect(formatThaiBankAccount("1234567890")).toBe("123-4-56789-0");
  });

  it("strips dashes/spaces and caps at 10 digits (paste-friendly)", () => {
    expect(formatThaiBankAccount("123-4-56789-0")).toBe("123-4-56789-0");
    expect(formatThaiBankAccount("1234567890123")).toBe("123-4-56789-0");
    expect(formatThaiBankAccount(" 123 4 56789 0 ")).toBe("123-4-56789-0");
    expect(normalizeThaiBankAccountDigits("123-4-56789-0")).toBe("1234567890");
  });

  it("normalizes legacy plain-digit rows from the db", () => {
    expect(formatThaiBankAccount("1234567890")).toBe("123-4-56789-0");
    expect(formatThaiBankAccount(null)).toBe("");
    expect(formatThaiBankAccount(undefined)).toBe("");
  });

  it("detects completeness", () => {
    expect(isCompleteThaiBankAccount("123-4-56789-0")).toBe(true);
    expect(isCompleteThaiBankAccount("123-4-5678")).toBe(false);
    expect(isCompleteThaiBankAccount("")).toBe(false);
  });
});
