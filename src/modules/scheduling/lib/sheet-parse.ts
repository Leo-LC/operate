/**
 * Parse a pasted Google Sheets week tab (transposed layout from the sample):
 * - header row: [?, ?, day1..day7, TOTAL]  e.g. "Tue 13 October", "10-12"
 * - body rows per employee: [NAME, START|FINISH, v1..v7, total?], plus grey "Total" rows (skipped)
 * - OFF (any case) = confirmed day off; empty = unscheduled
 * - trailing TOTAL column + "Total" sub-rows are skipped (totals are recomputed)
 */

export interface ParsedCell {
  employeeName: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM or ""
  end: string;
  isOff: boolean;
}

export interface ParseResult {
  cells: ParsedCell[];
  warnings: string[];
  dates: string[];
  names: string[];
}

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

function normTime(raw: string): string | null {
  const t = raw.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2];
  if (h > 23 || Number(min) > 59) return null;
  return `${String(h).padStart(2, "0")}:${min}`;
}

/** Resolve a day-column header to YYYY-MM-DD using the provided year context. */
export function resolveHeaderDate(header: string, year: number, fallback: string | null): string | null {
  const h = header.trim();
  // "Tue 13 October" / "13 October"
  let m = h.match(/(\d{1,2})\s+([A-Za-z]+)/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon) return `${year}-${mon}-${m[1].padStart(2, "0")}`;
  }
  // "10-12" (M-D)
  m = h.match(/^(\d{1,2})-(\d{1,2})$/);
  if (m) return `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return fallback;
}

export function parseSheetGrid(tsv: string, year: number, weekMonday: string): ParseResult {
  const warnings: string[] = [];
  const lines = tsv.split("\n").map((l) => l.split("\t").map((c) => c.trim()));
  if (lines.length < 4) return { cells: [], warnings: ["Paste at least the header row + one employee"], dates: [], names: [] };

  // Find header row: the row with the most date-like cells
  let headerIdx = -1;
  let headerCols: string[] = [];
  for (let i = 0; i < Math.min(4, lines.length); i++) {
    const dateLike = lines[i].filter((c) => /(\d{1,2})\s+[A-Za-z]+/.test(c) || /^\d{1,2}-\d{1,2}$/.test(c)).length;
    if (dateLike >= 5) {
      headerIdx = i;
      headerCols = lines[i];
      break;
    }
  }
  if (headerIdx === -1) {
    // Fallback: assume first row is the header and days are sequential from weekMonday
    headerIdx = 0;
    headerCols = lines[0];
    warnings.push("No date headers detected — assuming columns run Mon→Sun from the chosen week");
  }

  // Day columns: skip leading non-date columns + trailing TOTAL column
  let dayIdx: number[] = [];
  headerCols.forEach((c, i) => {
    if (/^total$/i.test(c)) return;
    if (/(\d{1,2})\s+[A-Za-z]+/.test(c) || /^\d{1,2}-\d{1,2}$/.test(c) || (i >= 2 && c === "")) dayIdx.push(i);
  });
  // If blanks confused us, take columns 2..8 (sample shape: name, START/FINISH, 7 days, TOTAL)
  if (dayIdx.length !== 7) {
    dayIdx = [2, 3, 4, 5, 6, 7, 8];
    if (headerCols.length < 9) warnings.push("Expected 7 day columns — check the pasted range");
  }
  const dates = dayIdx.map((ci, k) => {
    const resolved = resolveHeaderDate(headerCols[ci] ?? "", year, null);
    if (resolved) return resolved;
    // Sequential fallback from weekMonday
    const [y, m, d] = weekMonday.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + k));
    warnings.push(`Column ${ci + 1} header "${headerCols[ci] ?? ""}" unreadable — using ${dt.toISOString().slice(0, 10)}`);
    return dt.toISOString().slice(0, 10);
  });

  // Body: pair START/FINISH rows per employee; skip Total rows + empty names
  const starts = new Map<string, Map<number, string>>(); // name -> colIdx -> time
  const ends = new Map<string, Map<number, string>>();
  const offs = new Set<string>(); // name__colIdx confirmed OFF
  const names: string[] = [];
  const seenName = new Set<string>();

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = lines[i];
    const name = (row[0] ?? "").trim();
    const kind = (row[1] ?? "").trim().toUpperCase();
    if (!name || /^total$/i.test(name) || /^total$/i.test(kind)) continue;
    if (kind !== "START" && kind !== "FINISH") continue;
    if (!seenName.has(name)) {
      seenName.add(name);
      names.push(name);
    }
    const target = kind === "START" ? starts : ends;
    if (!target.has(name)) target.set(name, new Map());
    const map = target.get(name)!;
    dayIdx.forEach((ci, k) => {
      const raw = (row[ci] ?? "").trim();
      if (!raw) return;
      if (/^off$/i.test(raw)) {
        offs.add(`${name}__${k}`);
        return;
      }
      const t = normTime(raw);
      if (t) map.set(k, t);
      else warnings.push(`Row "${name}" ${kind} day ${k + 1}: unreadable "${raw}" — skipped`);
    });
  }

  const cells: ParsedCell[] = [];
  for (const name of names) {
    dates.forEach((date, k) => {
      const s = starts.get(name)?.get(k) ?? "";
      const e = ends.get(name)?.get(k) ?? "";
      const isOff = offs.has(`${name}__${k}`) || (!!offs.size && false);
      // OFF may appear on START row only (merged) — if either row flagged, treat as OFF when no times
      const flaggedOff = offs.has(`${name}__${k}`);
      if (!s && !e) {
        if (flaggedOff) cells.push({ employeeName: name, date, start: "", end: "", isOff: true });
        return; // empty = unscheduled → no row
      }
      if (s && e) {
        cells.push({ employeeName: name, date, start: s, end: e, isOff: false });
      } else {
        warnings.push(`Row "${name}" ${date}: half-filled (${s || "?"} → ${e || "?"}) — skipped`);
        void isOff;
      }
    });
  }

  return { cells, warnings, dates, names };
}

/** Match sheet names to employees (case-insensitive exact first; else contains). */
export function matchNames(
  sheetNames: string[],
  employees: Array<{ id: string; name: string }>,
): { matched: Record<string, string>; unmatched: string[]; ambiguous: string[] } {
  const matched: Record<string, string> = {};
  const unmatched: string[] = [];
  const ambiguous: string[] = [];
  const lower = employees.map((e) => ({ ...e, l: e.name.toLowerCase().trim() }));
  for (const n of sheetNames) {
    const l = n.toLowerCase().trim();
    const exact = lower.filter((e) => e.l === l);
    if (exact.length === 1) {
      matched[n] = exact[0].id;
      continue;
    }
    const partial = lower.filter((e) => e.l.includes(l) || l.includes(e.l));
    if (partial.length === 1) {
      matched[n] = partial[0].id;
      continue;
    }
    if (partial.length > 1) ambiguous.push(n);
    else unmatched.push(n);
  }
  return { matched, unmatched, ambiguous };
}
