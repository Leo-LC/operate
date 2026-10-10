"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyIcon, ClipboardPasteIcon, TriangleAlertIcon } from "lucide-react";
import { ShopSingleSelect } from "@/components/ui/filters/ShopSingleSelect";
import { MonthPicker } from "@/components/ui/filters/MonthPicker";
import { Drawer } from "@/components/ui/drawer";
import { addMonthsStr, currentMonth, formatMonthLabel } from "@/components/ui/filters/dates";
import {
  cellKey,
  toHHMM,
  SCHEDULING_SHOP_KEY,
  type BranchSettings,
  type EditorCell,
  type RangeEmployee,
  type RangeResponse,
  type TimeOff,
} from "@/modules/scheduling/types";
import { addDaysStr, computeShiftHours, formatTotalHours, mondayOf } from "@/modules/scheduling/lib/math";
import { autoColon, isValidTimeLoose, normTime } from "@/modules/scheduling/lib/time-input";
import { validateCell, validateStaffing } from "@/modules/scheduling/lib/validation";
import { classifyShift, paletteToStyles, type ShiftPalette } from "@/modules/scheduling/lib/colors";

interface Props {
  locations: Array<{ id: string; name: string }>;
  initialLocationId: string;
  initialMonth: string; // YYYY-MM
  canEdit: boolean;
}

interface FocusPos {
  r: number;
  c: number;
  s: 0 | 1; // 0 = IN, 1 = OUT
}

/** Full Mon–Sun weeks covering the month, so split weeks always display whole. */
export function displayDays(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const first = `${month}-01`;
  const last = `${month}-${String(lastDay).padStart(2, "0")}`;
  const start = mondayOf(first);
  const end = addDaysStr(mondayOf(last), 6);
  const out: string[] = [];
  for (let d = start; d <= end; d = addDaysStr(d, 1)) out.push(d);
  return out;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function dateLabel(iso: string): { text: string; isMonday: boolean } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = DOW[dt.getDay()];
  let text = `${dow} ${d}`;
  if (dt.getDay() === 1 || d === 1) text += ` ${MONTH_SHORT[m - 1]}`;
  return { text, isMonday: dt.getDay() === 1 };
}

interface WeekClipboard {
  monday: string;
  byEmp: Record<string, { start: string; end: string; isOff: boolean }>;
}

export function AnnualGridClient({ locations, initialLocationId, initialMonth, canEdit }: Props) {
  const [locationId, setLocationId] = useState(initialLocationId);
  const [month, setMonth] = useState(initialMonth);
  const [employees, setEmployees] = useState<RangeEmployee[]>([]);
  const [grid, setGrid] = useState<Record<string, EditorCell>>({});
  const [settings, setSettings] = useState<BranchSettings | null>(null);
  const [palette, setPalette] = useState<ShiftPalette | null>(null);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [focus, setFocus] = useState<FocusPos | null>(null);
  const [editing, setEditing] = useState<(FocusPos & { draft: string }) | null>(null);
  const [weekClipboard, setWeekClipboard] = useState<WeekClipboard | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(false);

  const gridRef = useRef(grid);
  gridRef.current = grid;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingRef = useRef<(FocusPos & { draft: string }) | null>(null);

  const days = useMemo(() => displayDays(month), [month]);
  const from = days[0];
  const to = days[days.length - 1];

  // Keep the shop selection in sync across Scheduling tabs (Weekly reads the same key).
  // An explicit ?location= in the URL wins; otherwise restore the last choice.
  useEffect(() => {
    try {
      const urlLoc = new URLSearchParams(window.location.search).get("location");
      if (!urlLoc) {
        const saved = localStorage.getItem(SCHEDULING_SHOP_KEY);
        if (saved && locations.some((l) => l.id === saved)) setLocationId(saved);
      }
    } catch {
      /* non-browser or blocked storage — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeLocation(id: string) {
    if (!id) return;
    setLocationId(id);
    try {
      localStorage.setItem(SCHEDULING_SHOP_KEY, id);
    } catch {
      /* ignore */
    }
  }
  const empName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of employees) map[e.id] = e.name;
    return map;
  }, [employees]);

  const timeOffSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of timeOff) {
      if (t.kind !== "approved") continue;
      for (let d = t.date_from; d <= t.date_to; d = addDaysStr(d, 1)) {
        set.add(`${t.employee_id}__${d}`);
        if (d > to) break;
      }
    }
    return set;
  }, [timeOff, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setFocus(null);
    setEditing(null);
    try {
      const [range, s, off] = await Promise.all([
        fetch(`/api/scheduling/range?location_id=${locationId}&from=${from}&to=${to}`).then((r) => {
          if (!r.ok) throw new Error("Failed to load schedule");
          return r.json() as Promise<RangeResponse>;
        }),
        fetch("/api/scheduling/settings").then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/scheduling/time-off?from=${from}&to=${to}`).then((r) => (r.ok ? r.json() : [])),
      ]);
      const withShifts = new Set(range.shifts.map((sh) => sh.employee_id));
      const sorted = Array.from(range.employees).sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setEmployees(sorted.filter((e) => e.active || withShifts.has(e.id)));
      const next: Record<string, EditorCell> = {};
      for (const sh of range.shifts) {
        next[cellKey(sh.employee_id, sh.shift_date)] = {
          start: toHHMM(sh.start_time),
          end: toHHMM(sh.end_time),
          isOff: !!sh.is_off && !sh.start_time,
          dirty: false,
        };
      }
      setGrid(next);
      const branch = (s?.branches ?? []).find((b: BranchSettings) => b.location_id === locationId) ?? null;
      setSettings(branch);
      setPalette(((s?.global ?? {}) as { palette?: ShiftPalette }).palette ?? null);
      setTimeOff(Array.isArray(off) ? off : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [locationId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function getCell(empId: string, date: string): EditorCell {
    return grid[cellKey(empId, date)] ?? { start: "", end: "", isOff: false, dirty: false };
  }

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), 900);
  }

  function patchCell(empId: string, date: string, patch: Partial<EditorCell>) {
    if (!canEdit) return;
    setGrid((prev) => ({
      ...prev,
      [cellKey(empId, date)]: { ...getCell(empId, date), ...patch, dirty: true },
    }));
    setSaveState("idle");
    scheduleSave();
  }

  async function save() {
    const current = gridRef.current;
    const dirty = Object.entries(current).filter(([, c]) => c.dirty);
    if (dirty.length === 0 || !canEdit) return;
    setSaveState("saving");
    const shifts = dirty.map(([key, c]) => {
      const [employee_id, shift_date] = key.split("__");
      return {
        employee_id,
        shift_date,
        start_time: c.start || null,
        end_time: c.end || null,
        is_off: c.isOff && !c.start,
      };
    });
    try {
      const r = await fetch("/api/scheduling/range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, shifts }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.details?.[0] ?? j.error ?? "Save failed");
      setGrid((prev) => {
        const next = { ...prev };
        for (const [key] of dirty) {
          if (next[key]) next[key] = { ...next[key], dirty: false };
        }
        return next;
      });
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  // ── Focus movement (OFF days render one merged cell, so OUT may not exist) ──
  function focusCell(nr: number, nc: number, ns: 0 | 1): boolean {
    if (nr < 0 || nr >= days.length || nc < 0 || nc >= employees.length) return false;
    let el = document.querySelector<HTMLDivElement>(`div[data-cell="${nr}-${nc}-${ns}"]`);
    if (!el && ns === 1) el = document.querySelector<HTMLDivElement>(`div[data-cell="${nr}-${nc}-0"]`);
    if (!el) return false;
    el.focus();
    return true;
  }

  function isOffCell(nc: number, nr: number): boolean {
    const e = employees[nc];
    if (!e || !days[nr]) return false;
    return getCell(e.id, days[nr]).isOff;
  }

  /** Neighbor in a direction, skipping the missing OUT half of OFF days. */
  function neighbor(pos: FocusPos, dir: "up" | "down" | "left" | "right"): FocusPos | null {
    const { r, c, s } = pos;
    if (dir === "up") return r > 0 ? { r: r - 1, c, s } : null;
    if (dir === "down") return r < days.length - 1 ? { r: r + 1, c, s } : null;
    if (dir === "right") {
      if (s === 0 && !isOffCell(c, r)) return { r, c, s: 1 };
      return c < employees.length - 1 ? { r, c: c + 1, s: 0 } : null;
    }
    if (s === 1) return { r, c, s: 0 };
    if (c === 0) return null;
    return { r, c: c - 1, s: isOffCell(c - 1, r) ? 0 : 1 };
  }

  function cellText(empId: string, date: string, sub: 0 | 1): string {
    const c = getCell(empId, date);
    if (sub === 0) return c.isOff ? "OFF" : c.start;
    return c.isOff ? "" : c.end;
  }

  function copyText(text: string) {
    if (!text) return;
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  // ── Rectangular TSV paste starting at (employee idx, day idx) ──
  function applyTsv(text: string, startEmpIdx: number, startDayIdx: number, sub: 0 | 1 = 0) {
    if (!canEdit) return;
    const rows = text.trim().split("\n");
    let applied = 0;
    setGrid((prev) => {
      const next = { ...prev };
      rows.forEach((line, ri) => {
        line.split("\t").forEach((tok, ci) => {
          const emp = employees[startEmpIdx + ci];
          const date = days[startDayIdx + ri];
          if (!emp || !date) return;
          const t = tok.trim().toUpperCase();
          if (t === "OFF" || t === "O") {
            next[cellKey(emp.id, date)] = { start: "", end: "", isOff: true, dirty: true };
            applied++;
            } else {
              const m = t.match(/^(\d{1,2}:?\d{2})\s*[-–]\s*(\d{1,2}:?\d{2})$/);
              if (m) {
                const norm = (s: string) => normTime(autoColon(s.replace(/\s/g, "")));
                next[cellKey(emp.id, date)] = { start: norm(m[1]), end: norm(m[2]), isOff: false, dirty: true };
                applied++;
                return;
              }
              const single = t.match(/^(\d{1,2}:?\d{2})$/);
              if (single) {
                // Bare time: set the focused half, preserving the other side
                const nt = normTime(autoColon(single[1]));
                if (isValidTimeLoose(nt)) {
                  const prevCell = next[cellKey(emp.id, date)] ?? { start: "", end: "", isOff: false, dirty: false };
                  next[cellKey(emp.id, date)] = sub === 0
                    ? { start: nt, end: prevCell.end, isOff: false, dirty: true }
                    : { start: prevCell.start, end: nt, isOff: false, dirty: true };
                  applied++;
                }
              } else if (t === "") {
              next[cellKey(emp.id, date)] = { start: "", end: "", isOff: false, dirty: true };
              applied++;
            }
          }
        });
      });
      return next;
    });
    if (applied > 0) {
      setSaveState("idle");
      scheduleSave();
      toast.success("Pasted — saving…");
    }
  }

  async function pasteFromClipboard(startEmpIdx: number, startDayIdx: number, sub: 0 | 1 = 0) {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) applyTsv(text, startEmpIdx, startDayIdx, sub);
    } catch {
      toast.error("Clipboard blocked by browser — allow paste access");
    }
  }

  // ── Whole-week copy / paste ──
  function copyWeek(weekMonday: string) {
    // Store per-day snapshots keyed by employee id + day offset
    const perDay: Array<Record<string, { start: string; end: string; isOff: boolean }>> = [];
    for (let i = 0; i < 7; i++) {
      const d = addDaysStr(weekMonday, i);
      const row: Record<string, { start: string; end: string; isOff: boolean }> = {};
      for (const e of employees) {
        const c = getCell(e.id, d);
        row[e.id] = { start: c.start, end: c.end, isOff: c.isOff };
      }
      perDay.push(row);
    }
    setWeekClipboard({ monday: weekMonday, byEmp: Object.fromEntries(perDay.flatMap((row, i) => Object.entries(row).map(([id, v]) => [`${id}__${i}`, v]))) });
    // Also expose TSV for Sheets
    const lines = Array.from({ length: 7 }, (_, i) => {
      const d = addDaysStr(weekMonday, i);
      return employees.map((e) => {
        const c = getCell(e.id, d);
        if (c.start && c.end) return `${c.start}-${c.end}`;
        return c.isOff ? "OFF" : "";
      }).join("\t");
    });
    copyText(lines.join("\n"));
    toast.success(`Week of ${weekMonday} copied — paste it on another Monday`);
  }

  function pasteWeek(targetMonday: string) {
    if (!canEdit || !weekClipboard) return;
    setGrid((prev) => {
      const next = { ...prev };
      for (const e of employees) {
        for (let i = 0; i < 7; i++) {
          const v = weekClipboard.byEmp[`${e.id}__${i}`];
          if (!v) continue;
          const d = addDaysStr(targetMonday, i);
          next[cellKey(e.id, d)] = { start: v.start, end: v.end, isOff: v.isOff, dirty: true };
        }
      }
      return next;
    });
    setSaveState("idle");
    scheduleSave();
    toast.success(`Week of ${targetMonday} pasted — saving…`);
  }

  // ── Edit mode ──
  function startEdit(pos: FocusPos, initial: string) {
    if (!canEdit) return;
    editingRef.current = { ...pos, draft: initial };
    setEditing(editingRef.current);
  }

  /**
   * Commit the current edit. `refocus`: where to put focus afterwards —
   * "same" (Enter), an explicit cell (Tab), or null (blur: focus is already
   * moving somewhere else, don't steal it back).
   */
  function commitEdit(refocus: "same" | FocusPos | null = "same") {
    const cur = editingRef.current;
    if (!cur) return;
    editingRef.current = null;
    const emp = employees[cur.c];
    const date = days[cur.r];
    const v = cur.draft.trim().toUpperCase();
    const done = () => {
      setEditing(null);
      if (refocus === "same") requestAnimationFrame(() => focusCell(cur.r, cur.c, cur.s));
      else if (refocus) requestAnimationFrame(() => focusCell(refocus.r, refocus.c, refocus.s));
    };
    if (v === "") {
      // Empty commit clears the whole cell to unscheduled
      patchCell(emp.id, date, { start: "", end: "", isOff: false });
      done();
      return;
    }
    if (v === "OFF" || v === "O") {
      patchCell(emp.id, date, { start: "", end: "", isOff: true });
      done();
      return;
    }
    const withColon = autoColon(v.replace(/\s/g, ""));
    if (!isValidTimeLoose(withColon)) {
      // Stay in edit mode so the user can fix the value
      editingRef.current = cur;
      toast.error(`"${cur.draft.trim()}" is not a valid time (HH:MM)`);
      return;
    }
    const t = normTime(withColon);
    if (cur.s === 0) patchCell(emp.id, date, { start: t, isOff: false });
    else patchCell(emp.id, date, { end: t, isOff: false });
    done();
  }

  function onWrapperKeyDown(e: React.KeyboardEvent, pos: FocusPos) {
    if (editing) return;
    const emp = employees[pos.c];
    const date = days[pos.r];
    const go = (dir: "up" | "down" | "left" | "right") => {
      e.preventDefault();
      const n = neighbor(pos, dir);
      if (n) focusCell(n.r, n.c, n.s);
    };
    if (e.key === "ArrowDown") go("down");
    else if (e.key === "ArrowUp") go("up");
    else if (e.key === "ArrowRight") go("right");
    else if (e.key === "ArrowLeft") go("left");
    else if (e.key === "Enter") {
      e.preventDefault();
      startEdit(pos, cellText(emp.id, date, pos.s));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (!canEdit) return;
      e.preventDefault();
      const c = getCell(emp.id, date);
      if (c.start || c.end || c.isOff) patchCell(emp.id, date, { start: "", end: "", isOff: false });
      else patchCell(emp.id, date, { start: "", end: "", isOff: true });
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
      // Copy the whole shift (IN + OUT), so paste reproduces it in one go
      const cc = getCell(emp.id, date);
      copyText(cc.start && cc.end ? `${cc.start}-${cc.end}` : cc.isOff ? "OFF" : "");
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
      if (!canEdit) return;
      e.preventDefault();
      void pasteFromClipboard(pos.c, pos.r, pos.s);
    } else if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
      if (!canEdit) return;
      if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        patchCell(emp.id, date, { start: "", end: "", isOff: true });
      } else if (/[0-9]/.test(e.key)) {
        e.preventDefault();
        startEdit(pos, e.key);
      }
    }
  }

  // ── Validation summary ──
  const issues = useMemo(() => {
    const list: Array<{ level: "error" | "warning"; message: string; date?: string; employeeId?: string }> = [];
    for (const e of employees) {
      for (const d of days) {
        const c = getCell(e.id, d);
        list.push(
          ...validateCell({
            employeeId: e.id,
            date: d,
            start: c.start,
            end: c.end,
            isOff: c.isOff,
            openingTime: settings?.opening_time.slice(0, 5) ?? "07:00",
            closingTime: settings?.closing_time.slice(0, 5) ?? "21:30",
            onTimeOff: timeOffSet.has(cellKey(e.id, d)),
          }),
        );
      }
    }
    const perDay = days.map((d) => ({
      date: d,
      scheduledCount: employees.filter((e) => {
        const c = getCell(e.id, d);
        return Boolean(c.start && c.end);
      }).length,
      minRequired: settings?.min_staff_json?.[d] ?? settings?.min_staff_json?.default,
    }));
    list.push(...validateStaffing(perDay));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, employees, days, settings, timeOffSet]);

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  const totals = useMemo(() => {
    const perEmp: Record<string, number> = {};
    for (const e of employees) {
      let t = 0;
      for (const d of days) {
        const c = getCell(e.id, d);
        t += computeShiftHours(c.start, c.end, settings?.default_break_minutes ?? 30);
      }
      perEmp[e.id] = Number(t.toFixed(1));
    }
    return perEmp;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, employees, days, settings]);

  const monthBounds = useMemo(() => {
    const cur = currentMonth();
    return { min: "2024-01", max: addMonthsStr(cur, 18) };
  }, []);

  const styles = useMemo(() => paletteToStyles(palette ?? {}), [palette]);

  // ── One half-cell (IN or OUT). OFF days render a single merged cell, centered. ──
  function renderSub(
    e: RangeEmployee,
    d: string,
    ri: number,
    ci: number,
    sub: 0 | 1,
    isMonday: boolean,
    merged: boolean,
  ) {
    const c = getCell(e.id, d);
    const kind = classifyShift({
      start: c.start, end: c.end, isOff: c.isOff,
      openingTime: settings?.opening_time.slice(0, 5),
      closingTime: settings?.closing_time.slice(0, 5),
    });
    const st = styles[kind];
    const cellIssues = validateCell({
      employeeId: e.id, date: d, start: c.start, end: c.end, isOff: c.isOff,
      openingTime: settings?.opening_time.slice(0, 5) ?? "07:00",
      closingTime: settings?.closing_time.slice(0, 5) ?? "21:30",
      onTimeOff: timeOffSet.has(cellKey(e.id, d)),
    });
    const hasError = cellIssues.some((i) => i.level === "error");
    const ed = editing;
    const isEditing = ed?.r === ri && ed?.c === ci && ed?.s === sub;
    const isFocused = focus?.r === ri && focus?.c === ci && focus?.s === sub;
    const shown = merged ? "OFF" : cellText(e.id, d, sub);
    return (
      <td
        {...(merged ? { colSpan: 2 } : {})}
        className="p-1"
        style={{
          background: kind === "off" ? "transparent" : st.bg,
          borderTop: isMonday ? "2px solid var(--fg-3)" : "1px solid var(--line)",
          borderLeft: "1px solid var(--line)",
          outline: hasError ? "1px solid var(--bad)" : undefined,
          outlineOffset: -1,
        }}
        title={cellIssues.map((i) => i.message).join("; ") || (kind === "open-close" ? "Opens + closes" : st.label)}
      >
        {isEditing && ed ? (
          <input
            autoFocus
            value={ed.draft}
            maxLength={5}
            onChange={(ev) => {
              const draft = autoColon(ev.target.value);
              editingRef.current = { ...ed, draft };
              setEditing(editingRef.current);
            }}
            onKeyDown={(ev) => {
              ev.stopPropagation();
              if (ev.key.startsWith("Arrow")) {
                // Arrows always move (committing first) — never just move the caret
                ev.preventDefault();
                const dir =
                  ev.key === "ArrowDown" ? "down"
                  : ev.key === "ArrowUp" ? "up"
                  : ev.key === "ArrowRight" ? "right"
                  : "left";
                const n = neighbor({ r: ed.r, c: ed.c, s: ed.s }, dir);
                commitEdit(n ?? "same");
              } else if (ev.key === "Enter") commitEdit("same");
              else if (ev.key === "Escape") {
                const pos = { r: ed.r, c: ed.c, s: ed.s };
                editingRef.current = null;
                setEditing(null);
                requestAnimationFrame(() => focusCell(pos.r, pos.c, pos.s));
              } else if (ev.key === "Tab") {
                ev.preventDefault();
                const n = neighbor({ r: ed.r, c: ed.c, s: ed.s }, "right");
                commitEdit(n ?? "same");
              }
            }}
            onBlur={() => commitEdit(null)}
            className="h-8 w-full rounded border bg-background px-1 font-mono text-center text-xs outline-none"
            style={{ minWidth: 62, borderColor: "var(--accent)", color: "var(--fg)" }}
            aria-label={`${e.name} ${d} ${sub === 0 ? "start" : "finish"}`}
          />
        ) : (
          <div
            data-cell={`${ri}-${ci}-${sub}`}
            tabIndex={!canEdit ? -1 : isFocused || (focus === null && ri === 0 && ci === 0 && sub === 0) ? 0 : -1}
            onFocus={() => setFocus({ r: ri, c: ci, s: sub })}
            onClick={(ev) => (ev.currentTarget as HTMLDivElement).focus()}
            onDoubleClick={() => canEdit && startEdit({ r: ri, c: ci, s: sub }, shown)}
            onKeyDown={(ev) => onWrapperKeyDown(ev, { r: ri, c: ci, s: sub })}
            onMouseEnter={(ev) => {
              ev.currentTarget.style.filter = "brightness(0.95)";
            }}
            onMouseLeave={(ev) => {
              ev.currentTarget.style.filter = "";
            }}
            className="flex h-8 cursor-pointer items-center justify-center rounded px-1 font-mono text-xs outline-none transition-shadow"
            style={{
              minWidth: 62,
              color: merged || (!shown && kind === "unscheduled") ? "var(--fg-mute)" : st.fg,
              fontWeight: c.dirty ? 700 : 400,
              letterSpacing: merged ? "0.2em" : undefined,
              background: isFocused ? "rgba(255, 255, 255, 0.5)" : undefined,
              boxShadow: isFocused
                ? "0 2px 8px rgba(15, 23, 42, 0.18), inset 0 0 0 1.5px var(--accent)"
                : undefined,
            }}
          >
            {shown || <span style={{ opacity: 0.4 }}>—</span>}
          </div>
        )}
      </td>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Branch pills */}
      <ShopSingleSelect options={locations} value={locationId} onChange={changeLocation} />

      {/* Month + status + advisor */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setMonth(addMonthsStr(month, -1))} disabled={month <= monthBounds.min}>
          ← Prev month
        </Button>
        <MonthPicker value={month} onChange={setMonth} minMonth={monthBounds.min} maxMonth={monthBounds.max} jump chrome="label" />
        <Button variant="outline" onClick={() => setMonth(addMonthsStr(month, 1))} disabled={month >= monthBounds.max}>
          Next month →
        </Button>
        <span className="text-xs text-muted-foreground" role="status">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "All changes saved"}
          {saveState === "error" && "Save failed — retry by editing a cell"}
        </span>
        <button
          type="button"
          onClick={() => setAdvisorOpen(true)}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] font-medium hover:bg-[var(--row-hover)]"
          style={errors.length > 0 ? { color: "var(--bad)" } : { color: "var(--fg-3)" }}
          title="Open schedule check"
        >
          <TriangleAlertIcon size={14} />
          {errors.length > 0 && <span>{errors.length} error{errors.length > 1 ? "s" : ""}</span>}
          {errors.length > 0 && warnings.length > 0 && <span>·</span>}
          {warnings.length > 0 && <span>{warnings.length} warning{warnings.length > 1 ? "s" : ""}</span>}
          {issues.length === 0 && <span>All clear</span>}
        </button>
      </div>

      {/* Grid — page scrolls vertically, table scrolls horizontally */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading {formatMonthLabel(month)}…</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">No employees linked to this branch yet — add them in Employees first.</div>
        ) : (
          <table className="text-xs" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: employees.length * 160 + 170 }}>
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-muted p-3 text-left font-medium" style={{ minWidth: 150 }}>Date</th>
                {employees.map((e) => (
                  <th
                    key={e.id}
                    colSpan={2}
                    className="sticky top-0 z-10 bg-muted p-3 text-center font-medium"
                    style={{ minWidth: 160, borderLeft: "1px solid var(--line)" }}
                  >
                    {e.name}{!e.active && <span className="font-normal text-muted-foreground"> · left</span>}
                    <div className="mt-0.5 text-[10px] font-normal tracking-widest text-muted-foreground">IN · OUT</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d, ri) => {
                const { text, isMonday } = dateLabel(d);
                return (
                  <tr key={d}>
                    <td
                      className="sticky left-0 z-10 bg-card p-3 whitespace-nowrap"
                      style={{ borderTop: isMonday ? "2px solid var(--fg-3)" : "1px solid var(--line)" }}
                    >
                      <span className="font-medium">{text}</span>
                      {isMonday && canEdit && (
                        <span className="ml-2 inline-flex items-center gap-1 align-middle">
                          <button
                            type="button"
                            title={`Copy week of ${d}`}
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => copyWeek(d)}
                            className="rounded p-1 text-muted-foreground hover:bg-[var(--row-hover)] hover:text-[var(--fg)]"
                          >
                            <CopyIcon size={12} />
                          </button>
                          <button
                            type="button"
                            title={weekClipboard ? `Paste week of ${weekClipboard.monday} here` : "Copy a week first"}
                            disabled={!weekClipboard}
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => pasteWeek(d)}
                            className="rounded p-1 text-muted-foreground hover:bg-[var(--row-hover)] hover:text-[var(--fg)] disabled:opacity-30"
                          >
                            <ClipboardPasteIcon size={12} />
                          </button>
                        </span>
                      )}
                    </td>
                    {employees.map((e, ci) => {
                      const c = getCell(e.id, d);
                      if (c.isOff) {
                        return (
                          <span key={e.id} style={{ display: "contents" }}>
                            {renderSub(e, d, ri, ci, 0, isMonday, true)}
                          </span>
                        );
                      }
                      return (
                        <span key={e.id} style={{ display: "contents" }}>
                          {renderSub(e, d, ri, ci, 0, isMonday, false)}
                          {renderSub(e, d, ri, ci, 1, isMonday, false)}
                        </span>
                      );
                    })}
                  </tr>
                );
              })}
              <tr style={{ borderTop: "2px solid var(--line)" }}>
                <td className="sticky left-0 z-10 bg-muted p-3 font-medium">Total (h)</td>
                {employees.map((e) => (
                  <td key={e.id} colSpan={2} className="bg-muted p-3 text-center font-mono font-medium">
                    {formatTotalHours(totals[e.id] ?? 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Advisor drawer */}
      <Drawer
        open={advisorOpen}
        onClose={() => setAdvisorOpen(false)}
        title="Schedule check"
        description={`${formatMonthLabel(month)} · ${errors.length} error${errors.length === 1 ? "" : "s"} · ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`}
        width={400}
      >
        <div className="flex flex-col gap-5 text-[13px]">
          {issues.length === 0 && <p className="text-muted-foreground">All clear — no errors or warnings for the displayed weeks.</p>}
          {errors.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold" style={{ color: "var(--bad)" }}>
                Blocking errors ({errors.length})
              </h3>
              <ul className="flex flex-col gap-1.5">
                {errors.map((i, k) => (
                  <li key={k} className="rounded-[var(--r-sm)] border px-2.5 py-1.5" style={{ borderColor: "var(--line)", background: "var(--bad-soft)" }}>
                    <span className="font-mono text-xs">{i.date}</span>
                    {i.employeeId && <span> · {empName[i.employeeId] ?? ""}</span>}
                    <span> — {i.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {warnings.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold text-muted-foreground">Warnings ({warnings.length})</h3>
              <ul className="flex flex-col gap-1.5">
                {warnings.map((i, k) => (
                  <li key={k} className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-muted-foreground">
                    <span className="font-mono text-xs">{i.date}</span>
                    {i.employeeId && <span> · {empName[i.employeeId] ?? ""}</span>}
                    <span> — {i.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Drawer>
    </div>
  );
}
