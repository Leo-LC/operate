import { describe, expect, it } from "vitest";
import {
  getDocTypeLabel,
  isKnownDocType,
  isValidCustomDocTypeSlug,
  prettifyDocType,
  slugifyDocType,
} from "./employee-documents";

describe("employee-documents custom categories", () => {
  it("slugifies free-form labels", () => {
    expect(slugifyDocType("House registration")).toBe("house_registration");
    expect(slugifyDocType("  Tabien-Baan  ")).toBe("tabien_baan");
    expect(slugifyDocType("Bank book!")).toBe("bank_book");
    expect(slugifyDocType("")).toBe("");
  });

  it("validates custom slugs", () => {
    expect(isValidCustomDocTypeSlug("house_registration")).toBe(true);
    expect(isValidCustomDocTypeSlug("a")).toBe(false);
    expect(isValidCustomDocTypeSlug("id_card")).toBe(false);
    expect(isValidCustomDocTypeSlug("other")).toBe(false);
    expect(isValidCustomDocTypeSlug("has space")).toBe(false);
  });

  it("accepts builtins, legacy other, and customs", () => {
    expect(isKnownDocType("id_card")).toBe(true);
    expect(isKnownDocType("other")).toBe(true);
    expect(isKnownDocType("house_registration")).toBe(true);
    expect(isKnownDocType("x")).toBe(false);
    expect(isKnownDocType("")).toBe(false);
  });

  it("labels builtins, legacy, and customs", () => {
    expect(getDocTypeLabel("id_card")).toBe("ID card");
    expect(getDocTypeLabel("other")).toBe("Other");
    expect(getDocTypeLabel("house_registration")).toBe("House Registration");
    expect(prettifyDocType("tabien_baan")).toBe("Tabien Baan");
  });
});
