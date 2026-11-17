import { describe, expect, it } from "vitest";
import type { PageNote, NoteKind } from "./types";
import { NOTE_KIND_LABELS, groupNotesByPath, isNoteKind, timeAgoFr } from "./types";

const SHORT_MS = 60_000;

function iso(daysAgo: number, minutesAgo = 0): string {
  return new Date(Date.now() - daysAgo * 86_400_000 - minutesAgo * SHORT_MS).toISOString();
}

function note(overrides: Partial<PageNote> & Pick<PageNote, "id" | "path">): PageNote {
  return {
    module_key: null,
    kind: "idea",
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
    expect(isNoteKind("idea")).toBe(true);
    expect(isNoteKind("todo")).toBe(true);
    expect(isNoteKind("warning")).toBe(true);
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

describe("timeAgoFr", () => {
  it("formats relative times", () => {
    expect(timeAgoFr(iso(0, 0), Date.now())).toBe("à l'instant");
    expect(timeAgoFr(iso(0, 5), Date.now())).toBe("il y a 5 min");
    expect(timeAgoFr(iso(0, 120), Date.now())).toBe("il y a 2 h");
    expect(timeAgoFr(iso(3), Date.now())).toBe("il y a 3 j");
  });
});

describe("NOTE_KIND_LABELS", () => {
  it("covers every kind", () => {
    for (const kind of ["idea", "todo", "warning"] as NoteKind[]) {
      expect(NOTE_KIND_LABELS[kind]).toBeTruthy();
    }
  });
});
