import { describe, expect, it } from "vitest";
import {
  formatThaiBankAccount,
  isCompleteThaiBankAccount,
  isGsbBank,
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

  it("detects GSB including the legacy long label", () => {
    expect(isGsbBank("GSB")).toBe(true);
    expect(isGsbBank("gsb")).toBe(true);
    expect(isGsbBank("Government Savings Bank")).toBe(true);
    expect(isGsbBank("SCB")).toBe(false);
    expect(isGsbBank("")).toBe(false);
    expect(isGsbBank(null)).toBe(false);
  });

  it("formats GSB as 12 plain digits with no dashes", () => {
    expect(formatThaiBankAccount("123456789012", "GSB")).toBe("123456789012");
    expect(formatThaiBankAccount("123-456-789-012", "GSB")).toBe("123456789012");
    expect(formatThaiBankAccount("123456789012345", "GSB")).toBe("123456789012");
    expect(formatThaiBankAccount("1234567890", "GSB")).toBe("1234567890");
    expect(normalizeThaiBankAccountDigits("123-456-789-012", "GSB")).toBe("123456789012");
    // Legacy long label behaves the same
    expect(formatThaiBankAccount("123456789012", "Government Savings Bank")).toBe("123456789012");
  });

  it("detects GSB completeness at 12 digits", () => {
    expect(isCompleteThaiBankAccount("123456789012", "GSB")).toBe(true);
    expect(isCompleteThaiBankAccount("1234567890", "GSB")).toBe(false);
    // Non-GSB caps at 10, so a 12-digit paste still counts as complete (truncated)
    expect(isCompleteThaiBankAccount("123456789012", "SCB")).toBe(true);
  });

  it("reformats when switching bank", () => {
    // 10-digit standard number viewed as GSB: digits only, truncated to 12 cap
    expect(formatThaiBankAccount("123-4-56789-0", "GSB")).toBe("1234567890");
    // 12-digit GSB number viewed as standard bank: capped at 10 with dashes
    expect(formatThaiBankAccount("123456789012", "SCB")).toBe("123-4-56789-0");
  });
});
