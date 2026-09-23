import { describe, expect, it } from "vitest";
import {
  buildEmployeeDocumentsCsv,
  collectMatrixDocTypes,
  generateStoragePath,
  getDocTypeLabel,
  isKnownDocType,
  isValidCustomDocTypeSlug,
  prettifyDocType,
  slugifyDocType,
  validateFileMeta,
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

  it("validates file metadata (type + 8MB cap)", () => {
    expect(validateFileMeta({ type: "application/pdf", size: 10 }).ok).toBe(true);
    expect(validateFileMeta({ type: "image/jpeg", size: 10 }).ok).toBe(true);
    expect(validateFileMeta({ type: "image/tiff", size: 10 }).ok).toBe(false);
    expect(validateFileMeta({ type: "application/pdf", size: 9 * 1024 * 1024 }).ok).toBe(false);
    expect(validateFileMeta({ type: "application/pdf", size: 0 }).ok).toBe(false);
  });

  it("generates unique bucket-relative storage paths", () => {
    const a = generateStoragePath("org", "emp", "id-front.jpg");
    const b = generateStoragePath("org", "emp", "id-front.jpg");
    expect(a.startsWith("employee-docs/")).toBe(false);
    expect(a.startsWith("org/emp/")).toBe(true);
    expect(a).not.toBe(b);
    expect(generateStoragePath("o", "e", "evil.PDF ")).toMatch(/\.pdf$/);
  });
});

describe("employee documents matrix csv", () => {
  it("orders builtins first, then customs sorted by label", () => {
    const employees = [
      {
        first_name: "A",
        employee_documents: [{ doc_type: "house_registration" }, { doc_type: "bank_book" }],
      },
    ];
    expect(collectMatrixDocTypes(employees)).toEqual([
      "id_card",
      "passport",
      "work_permit",
      "contract",
      "bank_book",
      "house_registration",
    ]);
  });

  it("appends legacy other only when present", () => {
    expect(collectMatrixDocTypes([{ first_name: "A" }])).toEqual([
      "id_card",
      "passport",
      "work_permit",
      "contract",
    ]);
    const withOther = collectMatrixDocTypes([
      { first_name: "A", employee_documents: [{ doc_type: "other" }] },
    ]);
    expect(withOther[withOther.length - 1]).toBe("other");
  });

  it("marks present types and quotes names with commas", () => {
    const csv = buildEmployeeDocumentsCsv([
      {
        first_name: "Som, Chai",
        last_name: "Dee",
        employee_locations: [{ location_name: "Karon", is_primary: true }],
        employee_documents: [{ doc_type: "id_card" }, { doc_type: "passport" }],
      },
      { first_name: "No", last_name: "Docs", employee_documents: [] },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\n");
    expect(lines[0]).toBe("Name,Shop,ID card,Passport,Work permit,Contract");
    expect(lines[1]).toBe('"Som, Chai Dee",Karon,✓,✓,,');
    expect(lines[2]).toBe("No Docs,,,,,");
  });
});
