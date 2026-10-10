import { describe, it, expect } from "vitest";
import { parseSheetGrid, matchNames } from "./sheet-parse";

/** Sample pasted from the Pattaya tab (header + 2 employees + Total rows). */
const SAMPLE = [
  ["", "", "10-12", "Tue 13 October", "Wed 14 October", "Thu 15 October", "Fri 16 October", "Sat 17 October", "Sun 18 October", "TOTAL"].join("\t"),
  ["SAMURAI", "START", "", "OFF", "", "", "", "", "11:00", ""].join("\t"),
  ["SAMURAI", "FINISH", "", "", "", "", "", "", "20:00", ""].join("\t"),
  ["Total", "", "0:00:00", "0:00:00", "0:00:00", "0:00:00", "0:00:00", "0:00:00", "8:30:00", "8:30:00"].join("\t"),
  ["FON", "START", "12:30", "12:30", "12:30", "12:30", "09:00", "09:00", "09:00", ""].join("\t"),
  ["FON", "FINISH", "21:30", "21:30", "21:30", "21:30", "18:00", "18:00", "18:00", ""].join("\t"),
  ["Total", "", "8:30:00", "8:30:00", "8:30:00", "8:30:00", "8:30:00", "8:30:00", "8:30:00", "59:30:00"].join("\t"),
  ["STAFF", "START", "", "", "", "", "", "", "", ""].join("\t"),
].join("\n");

describe("sheet-parse", () => {
  it("parses the sample layout: dates, OFF, working shifts, skips Total rows", () => {
    const r = parseSheetGrid(SAMPLE, 2026, "2026-10-12");
    expect(r.dates).toEqual([
      "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15",
      "2026-10-13".replace("13", "16"), "2026-10-17", "2026-10-18",
    ].map((d, i) => ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"][i]));
    // SAMURAI: 1 OFF (Tue) + 1 working (Sun)
    const sam = r.cells.filter((c) => c.employeeName === "SAMURAI");
    expect(sam.some((c) => c.isOff && c.date === "2026-10-13")).toBe(true);
    expect(sam.some((c) => c.start === "11:00" && c.end === "20:00")).toBe(true);
    // FON: 7 working shifts
    expect(r.cells.filter((c) => c.employeeName === "FON")).toHaveLength(7);
    // STAFF placeholder produces no cells but is listed as a name
    expect(r.names).toContain("STAFF");
    expect(r.cells.filter((c) => c.employeeName === "STAFF")).toHaveLength(0);
  });

  it("matches names case-insensitively and flags unknowns", () => {
    const m = matchNames(["Fon", "ZINKO", "Nobody"], [
      { id: "1", name: "Fon" },
      { id: "2", name: "Zinko" },
    ]);
    expect(m.matched["Fon"]).toBe("1");
    expect(m.matched["ZINKO"]).toBe("2");
    expect(m.unmatched).toContain("Nobody");
  });
});
