"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShopSingleSelect } from "@/components/ui/filters/ShopSingleSelect";
import { WeekPicker } from "@/modules/scheduling/components/WeekPicker";
import {
  WeekExportCard,
  formatWeekTitle,
  type ExportRow,
} from "@/modules/scheduling/components/WeekExportCard";
import {
  cellKey,
  toHHMM,
  SCHEDULING_SHOP_KEY,
  type BranchSettings,
  type RangeEmployee,
  type RangeResponse,
} from "@/modules/scheduling/types";
import { addDaysStr, computeShiftHours, formatTotalHours } from "@/modules/scheduling/lib/math";
import { parseShiftValue } from "@/modules/scheduling/lib/time-input";
import { classifyShift, paletteToStyles, type ShiftPalette } from "@/modules/scheduling/lib/colors";

interface Props {
  locations: Array<{ id: string; name: string }>;
  initialLocationId: string;
  initialWeek: string; // Monday YYYY-MM-DD
  canEdit: boolean;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyViewClient({ locations, initialLocationId, initialWeek, canEdit }: Props) {
  const [locationId, setLocationId] = useState(initialLocationId);
  const [week, setWeek] = useState(initialWeek);
  const [employees, setEmployees] = useState<RangeEmployee[]>([]);
  const [shifts, setShifts] = useState<Record<string, { start: string; end: string; isOff: boolean }>>({});
  const [settings, setSettings] = useState<BranchSettings | null>(null);
  const [palette, setPalette] = useState<ShiftPalette | null>(null);
  const [loading, setLoading] = useState(true);
  const exportRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysStr(week, i)), [week]);
  const locationName = locations.find((l) => l.id === locationId)?.name ?? "";

  // Same persisted shop as the Scheduling tab.
  useEffect(() => {
    try {
      const urlLoc = new URLSearchParams(window.location.search).get("location");
      if (!urlLoc) {
        const saved = localStorage.getItem(SCHEDULING_SHOP_KEY);
        if (saved && locations.some((l) => l.id === saved)) setLocationId(saved);
      }
    } catch {
      /* ignore */
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [range, s] = await Promise.all([
        fetch(`/api/scheduling/range?location_id=${locationId}&from=${days[0]}&to=${days[6]}`).then((r) => {
          if (!r.ok) throw new Error("Failed to load week");
          return r.json() as Promise<RangeResponse>;
        }),
        fetch("/api/scheduling/settings").then((r) => (r.ok ? r.json() : null)),
      ]);
      const withShifts = new Set(range.shifts.map((sh) => sh.employee_id));
      setEmployees(
        [...range.employees]
          .filter((e) => e.active || withShifts.has(e.id))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      const map: Record<string, { start: string; end: string; isOff: boolean }> = {};
      for (const sh of range.shifts) {
        map[cellKey(sh.employee_id, sh.shift_date)] = {
          start: toHHMM(sh.start_time),
          end: toHHMM(sh.end_time),
          isOff: !!sh.is_off && !sh.start_time,
        };
      }
      setShifts(map);
      setSettings((s?.branches ?? []).find((b: BranchSettings) => b.location_id === locationId) ?? null);
      setPalette(((s?.global ?? {}) as { palette?: ShiftPalette }).palette ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [locationId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  function shiftWeek(dir: number) {
    setWeek(addDaysStr(week, dir * 7));
  }

  const totals = useMemo(() => {
    const perEmp: Record<string, number> = {};
    for (const e of employees) {
      let t = 0;
      for (const d of days) {
        const c = shifts[cellKey(e.id, d)];
        if (c) t += computeShiftHours(c.start, c.end, settings?.default_break_minutes ?? 30);
      }
      perEmp[e.id] = Number(t.toFixed(1));
    }
    return perEmp;
  }, [employees, days, shifts, settings]);

  const styles = useMemo(() => paletteToStyles(palette ?? {}), [palette]);

  const breakMinutes = settings?.default_break_minutes ?? 30;

  // ── On-the-fly editing (same API + same data as Scheduling — two-way) ──
  const [editing, setEditing] = useState<{ empId: string; date: string; draft: string } | null>(null);
  const editingRef = useRef<{ empId: string; date: string; draft: string } | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function cellOf(empId: string, date: string) {
    return shifts[cellKey(empId, date)] ?? { start: "", end: "", isOff: false };
  }

  function displayText(c: { start: string; end: string; isOff: boolean }): string {
    if (c.start && c.end) return `${c.start}-${c.end}`;
    return c.isOff ? "OFF" : "";
  }

  function focusWCell(ei: number, di: number) {
    if (ei < 0 || ei >= employees.length || di < 0 || di >= days.length) return;
    document.querySelector<HTMLDivElement>(`div[data-wcell="${ei}-${di}"]`)?.focus();
  }

  function startEdit(empId: string, date: string, initial: string) {
    if (!canEdit) return;
    editingRef.current = { empId, date, draft: initial };
    setEditing(editingRef.current);
  }

  async function persist(
    empId: string,
    date: string,
    v: { start: string; end: string; isOff: boolean } | null,
  ) {
    if (!canEdit) return;
    setShifts((prev) => {
      const next = { ...prev };
      if (v && (v.start || v.end || v.isOff)) next[cellKey(empId, date)] = v;
      else delete next[cellKey(empId, date)];
      return next;
    });
    setSaveState("saving");
    try {
      const r = await fetch("/api/scheduling/range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          shifts: [
            {
              employee_id: empId,
              shift_date: date,
              start_time: v?.start || null,
              end_time: v?.end || null,
              is_off: !!v?.isOff,
            },
          ],
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.details?.[0] ?? j.error ?? "Save failed");
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
      toast.error(e instanceof Error ? e.message : "Save failed");
      void load(); // resync from the server
    }
  }

  function commitEdit(refocus: boolean) {
    const cur = editingRef.current;
    if (!cur) return;
    editingRef.current = null;
    const parsed = parseShiftValue(cur.draft);
    if (parsed === null) {
      editingRef.current = cur; // stay in edit mode so the value can be fixed
      toast.error(`"${cur.draft.trim()}" — use HH:MM-HH:MM, OFF, or empty`);
      return;
    }
    setEditing(null);
    void persist(cur.empId, cur.date, parsed === "clear" ? null : parsed);
    if (refocus) {
      const ei = employees.findIndex((e) => e.id === cur.empId);
      const di = days.indexOf(cur.date);
      requestAnimationFrame(() => focusWCell(ei, di));
    }
  }

  function onCellKeyDown(e: React.KeyboardEvent, ei: number, di: number) {
    if (editing) return;
    const emp = employees[ei];
    const date = days[di];
    const c = cellOf(emp.id, date);
    const go = (nei: number, ndi: number) => {
      e.preventDefault();
      focusWCell(nei, ndi);
    };
    if (e.key === "ArrowDown") go(ei + 1, di);
    else if (e.key === "ArrowUp") go(ei - 1, di);
    else if (e.key === "ArrowRight") go(ei, di + 1);
    else if (e.key === "ArrowLeft") go(ei, di - 1);
    else if (e.key === "Enter") {
      e.preventDefault();
      startEdit(emp.id, date, displayText(c));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (!canEdit) return;
      e.preventDefault();
      if (c.start || c.end || c.isOff) void persist(emp.id, date, null);
      else void persist(emp.id, date, { start: "", end: "", isOff: true });
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
      try {
        const t = displayText(c);
        if (t) void navigator.clipboard?.writeText(t);
      } catch {
        /* clipboard unavailable — ignore */
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
      if (!canEdit) return;
      e.preventDefault();
      navigator.clipboard
        ?.readText()
        .then((text) => {
          const parsed = parseShiftValue((text.trim().split("\n")[0] ?? "").split("\t")[0] ?? "");
          if (parsed === null) {
            toast.error("Clipboard isn't a shift (HH:MM-HH:MM or OFF)");
            return;
          }
          void persist(emp.id, date, parsed === "clear" ? null : parsed);
        })
        .catch(() => toast.error("Clipboard blocked by browser"));
    } else if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
      if (!canEdit) return;
      if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        void persist(emp.id, date, { start: "", end: "", isOff: true });
      } else if (/[0-9]/.test(e.key)) {
        e.preventDefault();
        startEdit(emp.id, date, e.key);
      }
    }
  }

  // ── Export data (shared by the JPEG raster and the PDF iframe) ──
  const exportProps = useMemo(() => {
    const dayHeaders = days.map((d, i) => {
      const [y, m, day] = d.split("-").map(Number);
      const mon = new Date(y, m - 1, day).toLocaleDateString("en-GB", { month: "short" });
      const base = `${DOW[i]} ${day}`;
      return i === 0 || day === 1 ? `${base} ${mon}` : base;
    });
    const rows: ExportRow[] = employees.map((e) => ({
      name: e.name,
      cells: days.map((d) => {
        const c = shifts[cellKey(e.id, d)];
        if (!c || (!c.start && !c.end && !c.isOff)) {
          return { main: "—", bg: "#ffffff", fg: "#cbd5e1" };
        }
        if (c.isOff || (!c.start && !c.end)) {
          return { main: "OFF", bg: "#f1f5f9", fg: "#64748b" };
        }
        const kind = classifyShift({
          start: c.start,
          end: c.end,
          openingTime: settings?.opening_time.slice(0, 5),
          closingTime: settings?.closing_time.slice(0, 5),
        });
        const fg = styles[kind].fg;
        const h = computeShiftHours(c.start, c.end, breakMinutes);
        return {
          main: `${c.start}–${c.end}`,
          sub: h > 0 ? `${h.toFixed(1)}h` : undefined,
          bg: `${fg}1f`,
          fg,
        };
      }),
      total: formatTotalHours(totals[e.id] ?? 0),
    }));
    return {
      brand: `CAPYBARA COFFEE — ${locationName.toUpperCase()}`,
      title: formatWeekTitle(week),
      dayHeaders,
      rows,
      footer: `Hours exclude a ${breakMinutes}-minute break · Informational only`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, days, shifts, settings, styles, totals, locationName, week, breakMinutes]);

  const fileSlug = useMemo(() => {
    const slug = locationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `capybara-${slug || "shop"}-week-${week}`;
  }, [locationName, week]);

  async function exportJpeg() {
    const node = exportRef.current;
    if (!node) return;
    try {
      const { toJpeg } = await import("html-to-image");
      const dataUrl = await toJpeg(node, { quality: 0.92, pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.download = `${fileSlug}.jpg`;
      a.href = dataUrl;
      a.click();
      toast.success("JPEG downloaded");
    } catch {
      toast.error("JPEG export failed");
    }
  }

  async function exportPdf() {
    try {
      const { renderToStaticMarkup } = await import("react-dom/server");
      const markup = renderToStaticMarkup(<WeekExportCard {...exportProps} />);
      const doc =
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileSlug}</title>` +
        `<style>@page{size:A4 landscape;margin:10mm}html,body{margin:0;padding:0;background:#fff}</style>` +
        `</head><body>${markup}</body></html>`;
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);
      const idoc = iframe.contentDocument;
      if (!idoc) {
        iframe.remove();
        return;
      }
      idoc.open();
      idoc.write(doc);
      idoc.close();
      const win = iframe.contentWindow;
      if (win) win.onafterprint = () => iframe.remove();
      setTimeout(() => iframe.remove(), 120000); // safety net
      setTimeout(() => {
        win?.focus();
        win?.print();
      }, 300);
    } catch {
      toast.error("PDF export failed");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ShopSingleSelect options={locations} value={locationId} onChange={changeLocation} />
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>← Prev week</Button>
        <WeekPicker week={week} onChange={setWeek} />
        <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>Next week →</Button>
        <span className="text-xs text-muted-foreground" role="status">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "All changes saved"}
          {saveState === "error" && "Save failed"}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void exportJpeg()}>
            JPEG
          </Button>
          <Button size="sm" onClick={() => void exportPdf()}>
            PDF
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading week…</div>
        ) : (
          <table className="w-full text-sm print:text-xs" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left font-medium" style={{ minWidth: 140 }}>Staff</th>
                {days.map((d, i) => (
                  <th key={d} className="p-2 text-center font-medium" style={{ minWidth: 110 }}>
                    {DOW[i]}<br />
                    <span className="font-mono font-normal">{d.slice(5)}</span>
                  </th>
                ))}
                <th className="p-2 text-center font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, ei) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="p-2 font-medium">{e.name}</td>
                  {days.map((d, di) => {
                    const c = cellOf(e.id, d);
                    const kind = classifyShift({
                      start: c.start,
                      end: c.end,
                      isOff: c.isOff,
                      openingTime: settings?.opening_time.slice(0, 5),
                      closingTime: settings?.closing_time.slice(0, 5),
                    });
                    const st = styles[kind];
                    const h = computeShiftHours(c.start, c.end, breakMinutes);
                    const isEditing = editing?.empId === e.id && editing?.date === d;
                    const key = cellKey(e.id, d);
                    const isFocused = focusedKey === key;
                    return (
                      <td
                        key={d}
                        className="p-1 text-center"
                        style={{
                          background: kind === "off" ? "transparent" : st.bg,
                          borderLeft: "1px solid var(--line)",
                        }}
                      >
                        {isEditing && editing ? (
                          <input
                            autoFocus
                            value={editing.draft}
                            maxLength={13}
                            placeholder="07:00-16:00"
                            onChange={(ev) => {
                              editingRef.current = { ...editing, draft: ev.target.value };
                              setEditing(editingRef.current);
                            }}
                            onKeyDown={(ev) => {
                              ev.stopPropagation();
                              if (ev.key === "Enter") commitEdit(true);
                              else if (ev.key === "Escape") {
                                editingRef.current = null;
                                setEditing(null);
                                requestAnimationFrame(() => focusWCell(ei, di));
                              } else if (ev.key === "Tab") {
                                ev.preventDefault();
                                const ok = parseShiftValue(editing.draft) !== null;
                                commitEdit(false);
                                if (ok) focusWCell(ei, di + 1);
                              }
                            }}
                            onBlur={() => commitEdit(false)}
                            className="h-9 w-full rounded border bg-background px-1 font-mono text-center text-xs outline-none"
                            style={{ minWidth: 104, borderColor: "var(--accent)", color: "var(--fg)" }}
                            aria-label={`${e.name} ${d} shift`}
                          />
                        ) : (
                          <div
                            data-wcell={`${ei}-${di}`}
                            tabIndex={!canEdit ? -1 : isFocused || (focusedKey === null && ei === 0 && di === 0) ? 0 : -1}
                            onFocus={() => setFocusedKey(key)}
                            onClick={(ev) => (ev.currentTarget as HTMLDivElement).focus()}
                            onDoubleClick={() => canEdit && startEdit(e.id, d, displayText(c))}
                            onKeyDown={(ev) => onCellKeyDown(ev, ei, di)}
                            onMouseEnter={(ev) => {
                              ev.currentTarget.style.filter = "brightness(0.95)";
                            }}
                            onMouseLeave={(ev) => {
                              ev.currentTarget.style.filter = "";
                            }}
                            className="flex flex-col items-center justify-center rounded px-1 font-mono text-xs outline-none"
                            style={{
                              minHeight: 40,
                              cursor: canEdit ? "pointer" : "default",
                              color: !displayText(c) && kind === "unscheduled" ? "var(--fg-mute)" : st.fg,
                              background: isFocused ? "rgba(255, 255, 255, 0.5)" : undefined,
                              boxShadow: isFocused
                                ? "0 2px 8px rgba(15, 23, 42, 0.18), inset 0 0 0 1.5px var(--accent)"
                                : undefined,
                            }}
                            title={canEdit ? "Enter to edit · O for day off" : undefined}
                          >
                            {c.start && c.end ? (
                              <span className="font-medium">
                                {c.start}–{c.end}
                              </span>
                            ) : c.isOff ? (
                              <span className="font-semibold tracking-widest" style={{ fontSize: 11 }}>OFF</span>
                            ) : (
                              <span style={{ opacity: 0.4 }}>—</span>
                            )}
                            {h > 0 && <div style={{ fontSize: 10 }}>{h.toFixed(1)}h</div>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center font-mono font-semibold">{formatTotalHours(totals[e.id] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Off-screen formatted layout for the JPEG raster (never visible). */}
      <div aria-hidden style={{ position: "fixed", left: -12000, top: 0 }}>
        <div ref={exportRef}>
          <WeekExportCard {...exportProps} />
        </div>
      </div>
    </div>
  );
}
