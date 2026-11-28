import { describe, expect, it } from "vitest";
import type { PageNote, NoteKind } from "./types";
import { NOTE_KIND_LABELS, groupNotesByPath, isNoteKind, moduleDisplayName, timeAgo } from "./types";

const SHORT_MS = 60_000;

function iso(daysAgo: number, minutesAgo = 0): string {
  return new Date(Date.now() - daysAgo * 86_400_000 - minutesAgo * SHORT_MS).toISOString();
}

function note(overrides: Partial<PageNote> & Pick<PageNote, "id" | "path">): PageNote {
  return {
    module_key: null,
    kind: "suggestion",
    body: "note",
    author_id: null,
    author_email: "a@x.io",
    author_name: "Alice",
    resolved: false,
    created_at: iso(0),
    updated_at: iso(0),
    ...overrides,
  };
}

describe("isNoteKind", () => {
  it("accepts valid kinds only", () => {
    expect(isNoteKind("suggestion")).toBe(true);
    expect(isNoteKind("alerte")).toBe(true);
    expect(isNoteKind("idea")).toBe(false);
    expect(isNoteKind("todo")).toBe(false);
    expect(isNoteKind("nope")).toBe(false);
    expect(isNoteKind(null)).toBe(false);
  });
});

describe("groupNotesByPath", () => {
  it("groups notes by page path and preserves order", () => {
    const grouped = groupNotesByPath([
      note({ id: "1", path: "/accounting" }),
      note({ id: "2", path: "/reviews" }),
      note({ id: "3", path: "/accounting" }),
    ]);
    expect(grouped.get("/accounting")).toHaveLength(2);
    expect(grouped.get("/reviews")).toHaveLength(1);
    expect(grouped.get("/nowhere")).toBeUndefined();
  });
});

describe("timeAgo", () => {
  it("formats relative times", () => {
    expect(timeAgo(iso(0, 0), Date.now())).toBe("just now");
    expect(timeAgo(iso(0, 5), Date.now())).toBe("5 min ago");
    expect(timeAgo(iso(0, 120), Date.now())).toBe("2 h ago");
    expect(timeAgo(iso(3), Date.now())).toBe("3 d ago");
  });
});

describe("NOTE_KIND_LABELS", () => {
  it("covers every kind", () => {
    for (const kind of ["suggestion", "alerte"] as NoteKind[]) {
      expect(NOTE_KIND_LABELS[kind]).toBeTruthy();
    }
  });
});

describe("moduleDisplayName", () => {
  it("maps route prefixes to module names (longest prefix wins)", () => {
    expect(moduleDisplayName("/loyverse")).toBe("Loyverse");
    expect(moduleDisplayName("/loyverse-export")).toBe("Loyverse Export");
    expect(moduleDisplayName("/shift-sales")).toBe("Shifts & Sales");
    expect(moduleDisplayName("/finance/recurring-costs")).toBe("Recurring costs");
    expect(moduleDisplayName("/finance/shop-settings")).toBe("Shop settings");
    expect(moduleDisplayName("/accounting")).toBe("Accounting");
    expect(moduleDisplayName("/wiki/my-page")).toBe("Wiki");
  });

  it("falls back to a prettified first segment for unknown routes", () => {
    expect(moduleDisplayName("/projects")).toBe("Projects");
  });
});
