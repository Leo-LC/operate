"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { SaveIcon, CheckIcon, PencilIcon, PrinterIcon, UserPlusIcon, XIcon, CopyIcon, Loader2Icon, PlusIcon, MinusIcon, TriangleAlertIcon } from "lucide-react";
import { ShiftCell, computeShiftHours } from "@/modules/schedules/components/ShiftCell";
import { ScheduleHeatmap } from "@/modules/schedules/components/ScheduleHeatmap";
import type { Schedule, ScheduleShift, ShiftGrid, CellData } from "@/modules/schedules/types";
import { EMPTY_CELL } from "@/modules/schedules/types";
import type { Employee, AdminLocation } from "@/modules/admin/types";
import { EmployeeForm, EMPTY_EMPLOYEE_FORM, type EmployeeFormState } from "@/modules/admin/components/EmployeeForm";

const DEFAULT_BREAK_MINUTES = 30;

interface Props {
  schedule: Schedule;
  initialShifts: ScheduleShift[];
  employees: Employee[];
}

function cellKey(employeeId: string, date: string) {
  return `${employeeId}__${date}`;
}

function toHHMM(t: string | null | undefined): string {
  if (!t) return "";
  return t.length > 5 ? t.substring(0, 5) : t;
}

function buildGrid(shifts: ScheduleShift[]): ShiftGrid {
  const grid: ShiftGrid = {};
  for (const s of shifts) {
    grid[cellKey(s.employee_id, s.shift_date)] = {
      shiftId: s.id,
      start_time: toHHMM(s.start_time),
      end_time: toHHMM(s.end_time),
      break_minutes: s.break_minutes,
      notes: s.notes ?? "",
      dirty: false,
    };
  }
  return grid;
}

export function ScheduleGrid({ schedule, initialShifts, employees }: Props) {
  const router = useRouter();
  const [grid, setGrid] = useState<ShiftGrid>(() => buildGrid(initialShifts));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [localName, setLocalName] = useState(schedule.name);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(schedule.name);
  const [localWeekStart, setLocalWeekStart] = useState(schedule.week_start_date);
  const [editingWeek, setEditingWeek] = useState(false);
  const [weekInput, setWeekInput] = useState(schedule.week_start_date);
  const [conflictNames, setConflictNames] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<CellData | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  // Manage employees modal
  const [showManage, setShowManage] = useState(false);
  const [manageAllEmployees, setManageAllEmployees] = useState<Employee[]>([]);
  const [manageLocations, setManageLocations] = useState<AdminLocation[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageBusy, setManageBusy] = useState<string | null>(null);
  const [showManageCreate, setShowManageCreate] = useState(false);
  const [manageCreateForm, setManageCreateForm] = useState<EmployeeFormState>(EMPTY_EMPLOYEE_FORM);
  const [manageCreateLocIds, setManageCreateLocIds] = useState<Set<string>>(new Set());
  const [manageCreatePrimaryLoc, setManageCreatePrimaryLoc] = useState("");
  const [manageCreateSubmitting, setManageCreateSubmitting] = useState(false);

  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef(false);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const employeesRef = useRef(employees);
  employeesRef.current = employees;

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(parseISO(localWeekStart), i);
    return { iso: format(d, "yyyy-MM-dd"), label: format(d, "EEE d") };
  });
  const weekDaysRef = useRef(weekDays);
  weekDaysRef.current = weekDays;

  const getCell = useCallback(
    (empId: string, date: string): CellData => grid[cellKey(empId, date)] ?? { ...EMPTY_CELL },
    [grid],
  );

  function patchCell(empId: string, date: string, patch: Partial<CellData>) {
    setGrid((prev) => ({
      ...prev,
      [cellKey(empId, date)]: { ...(prev[cellKey(empId, date)] ?? EMPTY_CELL), ...patch },
    }));
    scheduleSave();
  }

  function scheduleSave() {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    setSaveState("idle");
    pendingSaveRef.current = true;
    autoSaveRef.current = setTimeout(() => {
      pendingSaveRef.current = false;
      void save();
    }, 800);
  }

  async function save() {
    const currentGrid = gridRef.current;
    const shifts = employeesRef.current.flatMap((emp) =>
      weekDaysRef.current
        .map((day) => {
          const cell = currentGrid[cellKey(emp.id, day.iso)] ?? EMPTY_CELL;
          return {
            employee_id: emp.id,
            shift_date: day.iso,
            start_time: cell.start_time || null,
            end_time: cell.end_time || null,
            break_minutes: DEFAULT_BREAK_MINUTES,
            notes: cell.notes || null,
          };
        })
        .filter((s) => s.start_time !== null),
    );

    setSaveState("saving");
    try {
      const res = await fetch(`/api/schedules/${schedule.id}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to save");
        setSaveState("idle");
        return;
      }
      setSaveState("saved");
      // Auto-publish draft on first save
      if (schedule.status === "draft") {
        await fetch(`/api/schedules/${schedule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });
      }
    } catch {
      toast.error("Network error while saving");
      setSaveState("idle");
    }
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    setEditingName(false);
    if (!trimmed || trimmed === localName) return;
    setLocalName(trimmed);
    const res = await fetch(`/api/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      toast.error("Failed to rename schedule");
      setLocalName(schedule.name);
    }
  }

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/api/schedules?location_id=${encodeURIComponent(schedule.location_id)}`);
        if (!res.ok) return;
        const all = (await res.json()) as Array<{ id: string; name: string; week_start_date: string }>;
        setConflictNames(all.filter((s) => s.week_start_date === localWeekStart && s.id !== schedule.id).map((s) => s.name));
      } catch { /* ignore */ }
    };
    void check();
  }, [localWeekStart, schedule.location_id, schedule.id]);

  async function saveWeek() {
    setEditingWeek(false);
    if (!weekInput || weekInput === localWeekStart) return;
    const prev = localWeekStart;
    setLocalWeekStart(weekInput);
    const res = await fetch(`/api/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start_date: weekInput }),
    });
    if (!res.ok) {
      toast.error("Failed to update dates");
      setLocalWeekStart(prev);
    } else {
      toast.success("Dates updated");
    }
  }

  function printSchedule() {
    const win = window.open("", "_blank", "width=1100,height=750");
    if (!win) { toast.error("Pop-up blocked — please allow pop-ups and try again"); return; }

    const weekRange = `${format(parseISO(localWeekStart), "d MMM")} – ${format(addDays(parseISO(localWeekStart), 6), "d MMM yyyy")}`;
    const headers = weekDaysRef.current.map((d) => `<th>${d.label}</th>`).join("");
    const rows = employeesRef.current.map((emp, rowIdx) => {
      let total = 0;
      const cells = weekDaysRef.current.map((day) => {
        const cell = gridRef.current[cellKey(emp.id, day.iso)] ?? EMPTY_CELL;
        if (!cell.start_time) return `<td class="off">—</td>`;
        const h = computeShiftHours(cell.start_time, cell.end_time, DEFAULT_BREAK_MINUTES);
        total += h;
        return `<td class="shift"><span class="time">${cell.start_time} – ${cell.end_time}</span><span class="hrs">${h.toFixed(1)}h</span></td>`;
      }).join("");
      const rowClass = rowIdx % 2 === 0 ? "" : ' class="alt"';
      return `<tr${rowClass}>
        <td class="name">${emp.first_name} ${emp.last_name}${emp.position ? `<br><small>${emp.position}</small>` : ""}</td>
        ${cells}
        <td class="total">${total.toFixed(1)}h</td>
      </tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${localName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
  .accent{height:5px;background:#1e3a8a;width:100%}
  .header{padding:16px 24px 12px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e5e7eb}
  .header-left h1{font-size:16px;font-weight:700;color:#111;margin-bottom:3px}
  .header-left .meta{font-size:11px;color:#6b7280}
  .header-right{text-align:right;font-size:10px;color:#9ca3af}
  .content{padding:16px 24px}
  table{border-collapse:collapse;width:100%;table-layout:fixed}
  col.name-col{width:140px}
  col.day-col{width:auto}
  col.total-col{width:64px}
  th{background:#1e3a8a;color:#fff;font-weight:600;font-size:10px;padding:7px 8px;text-align:center;letter-spacing:0.3px}
  th.name-th{text-align:left;padding-left:10px}
  td{padding:6px 8px;text-align:center;vertical-align:middle;border-bottom:1px solid #f0f0f0;font-size:10.5px}
  tr.alt td{background:#f8fafc}
  td.name{text-align:left;font-weight:600;padding-left:10px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  td.name small{color:#9ca3af;font-size:9px;display:block;font-weight:400}
  td.off{color:#d1d5db;font-size:13px}
  td.shift{line-height:1}
  td.shift .time{display:block;color:#374151;font-weight:500}
  td.shift .hrs{display:block;color:#16a34a;font-weight:700;font-size:10px;margin-top:2px}
  td.total{font-weight:700;color:#1e3a8a;background:#eff6ff!important;border-left:2px solid #bfdbfe}
  @media print{@page{margin:8mm;size:landscape}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent{-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="accent"></div>
<div class="header">
  <div class="header-left">
    <h1>${localName}</h1>
    <div class="meta">${schedule.location_name ? `${schedule.location_name} &nbsp;·&nbsp; ` : ""}${weekRange}</div>
  </div>
  <div class="header-right">Capybara Coffee<br>Internal Schedule</div>
</div>
<div class="content">
<table>
  <colgroup><col class="name-col">${weekDaysRef.current.map(() => '<col class="day-col">').join("")}<col class="total-col"></colgroup>
  <thead><tr><th class="name-th">Employee</th>${headers}<th>Week</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    win.document.close();
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/schedules/${schedule.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${localName} (copy)` }),
      });
      if (!res.ok) { toast.error("Failed to duplicate schedule"); return; }
      const duped = (await res.json()) as { id: string };
      toast.success("Schedule duplicated");
      router.push(`/dashboard/scheduling/${duped.id}`);
    } finally {
      setDuplicating(false);
    }
  }

  useEffect(() => {
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      if (pendingSaveRef.current) void save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openManage() {
    setShowManage(true);
    setShowManageCreate(false);
    setManageCreateForm(EMPTY_EMPLOYEE_FORM);
    setManageCreateLocIds(new Set());
    setManageCreatePrimaryLoc("");
    void (async () => {
      setManageLoading(true);
      try {
        const [empRes, locRes] = await Promise.all([
          fetch("/api/admin/employees", { cache: "no-store" }),
          fetch("/api/admin/locations", { cache: "no-store" }),
        ]);
        const empData = await empRes.json().catch(() => []);
        const locData = await locRes.json().catch(() => []);
        setManageAllEmployees(Array.isArray(empData) ? empData as Employee[] : []);
        setManageLocations(Array.isArray(locData) ? locData as AdminLocation[] : []);
      } finally {
        setManageLoading(false);
      }
    })();
  }

  async function reloadManage() {
    setManageLoading(true);
    try {
      const empRes = await fetch("/api/admin/employees", { cache: "no-store" });
      const empData = await empRes.json().catch(() => []);
      setManageAllEmployees(Array.isArray(empData) ? empData as Employee[] : []);
    } finally {
      setManageLoading(false);
    }
    router.refresh();
  }

  async function assignToLocation(emp: Employee) {
    setManageBusy(emp.id);
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/assign-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: schedule.location_id }),
      });
      if (!res.ok) { toast.error("Failed to add employee"); return; }
      toast.success(`${emp.first_name} added`);
      await reloadManage();
    } finally {
      setManageBusy(null);
    }
  }

  async function removeFromLocation(emp: Employee) {
    setManageBusy(emp.id);
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/assign-location?location_id=${encodeURIComponent(schedule.location_id)}`, {
        method: "DELETE",
      });
      if (!res.ok) { toast.error("Failed to remove employee"); return; }
      toast.success(`${emp.first_name} removed`);
      await reloadManage();
    } finally {
      setManageBusy(null);
    }
  }

  function toggleManageCreateLoc(id: string) {
    setManageCreateLocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (manageCreatePrimaryLoc === id) setManageCreatePrimaryLoc(next.values().next().value ?? "");
      } else {
        next.add(id);
        if (!manageCreatePrimaryLoc) setManageCreatePrimaryLoc(id);
      }
      return next;
    });
  }

  async function handleManageCreate(e: React.FormEvent) {
    e.preventDefault();
    setManageCreateSubmitting(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: manageCreateForm.first_name,
          last_name: manageCreateForm.last_name,
          position: manageCreateForm.position || undefined,
          nationality: manageCreateForm.nationality || undefined,
          national_id: manageCreateForm.national_id || undefined,
          work_permit_number: manageCreateForm.work_permit_number || undefined,
          work_permit_expires_at: manageCreateForm.work_permit_expires_at || undefined,
          email: manageCreateForm.email || undefined,
          phone: manageCreateForm.phone || undefined,
          notes: manageCreateForm.notes || undefined,
          location_ids: Array.from(manageCreateLocIds),
          primary_location_id: manageCreatePrimaryLoc || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to create employee");
        return;
      }
      toast.success("Employee created");
      setManageCreateForm(EMPTY_EMPLOYEE_FORM);
      setManageCreateLocIds(new Set());
      setManageCreatePrimaryLoc("");
      setShowManageCreate(false);
      await reloadManage();
    } finally {
      setManageCreateSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "var(--s-3)", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {editingName ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName();
                  if (e.key === "Escape") { setEditingName(false); setNameInput(localName); }
                }}
                style={{ fontSize: 18, fontWeight: 600, background: "transparent", borderBottom: "1px solid var(--bronze)", outline: "none", width: 260, color: "var(--fg)" }}
              />
              <button type="button" onClick={() => { setEditingName(false); setNameInput(localName); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", display: "flex" }}>
                <XIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setNameInput(localName); setEditingName(true); }}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}
              title="Click to rename"
            >
              <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)", margin: 0 }}>{localName}</h1>
              <PencilIcon style={{ width: 13, height: 13, color: "var(--fg-4)", opacity: 0.6 }} />
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-3)", flexWrap: "wrap" }}>
            {schedule.location_name && <span>{schedule.location_name}</span>}
            {schedule.location_name && <span style={{ color: "var(--fg-mute)" }}>·</span>}
            {editingWeek ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <DateInput
                  autoFocus
                  value={weekInput}
                  onChange={(e) => setWeekInput(e.target.value)}
                  onBlur={() => void saveWeek()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveWeek();
                    if (e.key === "Escape") { setEditingWeek(false); setWeekInput(localWeekStart); }
                  }}
                />
                <button type="button" onClick={() => { setEditingWeek(false); setWeekInput(localWeekStart); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", display: "flex" }}>
                  <XIcon style={{ width: 13, height: 13 }} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setWeekInput(localWeekStart); setEditingWeek(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "var(--fg-3)", padding: 0 }}
                title="Click to change dates"
              >
                <span>
                  {format(parseISO(localWeekStart), "d MMM")}
                  {" – "}
                  {format(addDays(parseISO(localWeekStart), 6), "d MMM yyyy")}
                </span>
                <PencilIcon style={{ width: 11, height: 11, opacity: 0.5 }} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
          <Button size="sm" variant="secondary" onClick={() => void handleDuplicate()} disabled={duplicating} title="Duplicate this schedule">
            <CopyIcon style={{ width: 13, height: 13 }} />
            Duplicate
          </Button>
          <Button size="sm" variant="secondary" onClick={printSchedule} title="Download as PDF">
            <PrinterIcon style={{ width: 13, height: 13 }} />
            PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={openManage}>
            <UserPlusIcon style={{ width: 13, height: 13 }} />
            Manage employees
          </Button>
          {saveState === "saved" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", fontSize: 13, color: "var(--good)", fontWeight: 500, borderRadius: "var(--r-sm)", background: "var(--good-soft)", border: "1px solid var(--good)" }}>
              <CheckIcon style={{ width: 14, height: 14 }} />
              Saved
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => void save()} disabled={saveState === "saving"}>
              <SaveIcon style={{ width: 13, height: 13 }} />
              {saveState === "saving" ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Overlap warning ────────────────────────────────────── */}
      {conflictNames.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, borderRadius: "var(--r-md)", border: "1px solid var(--warn)", background: "var(--warn-soft)", padding: "12px 16px", fontSize: 13, color: "var(--fg-2)" }}>
          <TriangleAlertIcon style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1, color: "var(--warn)" }} />
          <div>
            <span style={{ fontWeight: 600 }}>Scheduling overlap — </span>
            <span>
              {conflictNames.length === 1
                ? `"${conflictNames[0]}" also covers`
                : `${conflictNames.map((n) => `"${n}"`).join(" and ")} also cover`}{" "}
              this shop and week. Hours will be double-counted in payroll.
            </span>
          </div>
        </div>
      )}

      {/* ── No employees state ──────────────────────────────────── */}
      {employees.length === 0 && (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px dashed var(--line-strong)", padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <p style={{ fontWeight: 500, fontSize: 13, color: "var(--fg)" }}>No employees assigned to this shop yet</p>
          <p style={{ fontSize: 12, color: "var(--fg-4)", maxWidth: 320 }}>
            Browse all organisation employees or create a new one with full details including salary, nationality, and work permit.
          </p>
          <Button onClick={openManage}>
            <UserPlusIcon style={{ width: 14, height: 14 }} />
            Manage employees for this shop
          </Button>
        </div>
      )}

      {/* ── Schedule table ──────────────────────────────────────── */}
      {employees.length > 0 && (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead style={{ background: "var(--bg-2)", borderBottom: "2px solid var(--line)" }}>
              <tr>
                <th style={{ width: 160, padding: "10px 12px", textAlign: "left", borderRight: "1px solid var(--line)" }} />
                {weekDays.map((d) => {
                  const [dayName, dayNum] = d.label.split(" ");
                  return (
                    <th key={d.iso} style={{ padding: "10px 4px", textAlign: "center", borderLeft: "1px solid var(--line)" }}>
                      <div className="eyebrow" style={{ color: "var(--fg-4)" }}>{dayName}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", lineHeight: 1.2 }}>{dayNum}</div>
                    </th>
                  );
                })}
                <th className="eyebrow" style={{ width: 80, padding: "10px 4px", textAlign: "center", color: "var(--fg-4)", borderLeft: "1px solid var(--line)" }}>
                  Week
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, _empIdx) => {
                let weeklyHours = 0;
                return (
                  <tr key={emp.id} style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
                    <td style={{ width: 160, padding: "10px 12px", borderRight: "1px solid var(--line)", verticalAlign: "middle" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, fontSize: 12, color: "var(--fg)" }}>
                        {emp.first_name} {emp.last_name}
                      </div>
                      {emp.position && (
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, color: "var(--fg-4)", marginTop: 2 }}>
                          {emp.position}
                        </div>
                      )}
                    </td>
                    {weekDays.map((day) => {
                      const cell = getCell(emp.id, day.iso);
                      const hours = computeShiftHours(cell.start_time, cell.end_time, DEFAULT_BREAK_MINUTES);
                      weeklyHours += hours;
                      return (
                        <td key={day.iso} style={{ padding: 0, verticalAlign: "top", borderLeft: "1px solid var(--line)" }}>
                          <ShiftCell
                            data={cell}
                            hours={hours}
                            onChange={(patch) => patchCell(emp.id, day.iso, patch)}
                            onCopy={() => setClipboard({ ...cell })}
                            onPaste={() => {
                              if (clipboard) patchCell(emp.id, day.iso, { ...clipboard, shiftId: cell.shiftId, dirty: true });
                            }}
                            onClear={() => patchCell(emp.id, day.iso, { ...EMPTY_CELL, shiftId: cell.shiftId, dirty: true })}
                            hasCopied={clipboard !== null}
                            onDragStart={() => setDragSource(cellKey(emp.id, day.iso))}
                            onDrop={() => {
                              if (dragSource && dragSource !== cellKey(emp.id, day.iso)) {
                                const src = gridRef.current[dragSource] ?? EMPTY_CELL;
                                patchCell(emp.id, day.iso, { ...src, shiftId: cell.shiftId, dirty: true });
                              }
                              setDragSource(null);
                            }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ width: 80, padding: "6px", textAlign: "center", verticalAlign: "middle", borderLeft: "1px solid var(--line)" }}>
                      <span className="mono tabular" style={{ fontSize: 11, fontWeight: 600, color: weeklyHours > 0 ? "var(--fg)" : "var(--fg-mute)" }}>
                        {weeklyHours > 0 ? `${weeklyHours.toFixed(1)}h` : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Heatmap ─────────────────────────────────────────────── */}
      {employees.length > 0 && (
        <ScheduleHeatmap grid={grid} weekDays={weekDays.map((d) => d.iso)} employees={employees} />
      )}

      {/* ── Manage employees modal ───────────────────────────────── */}
      {showManage && (() => {
        const atLoc = manageAllEmployees.filter((e) =>
          e.employee_locations?.some((el) => el.location_id === schedule.location_id) ||
          (e.location_id === schedule.location_id && !e.employee_locations?.length)
        );
        const notAtLoc = manageAllEmployees.filter((e) =>
          !e.employee_locations?.some((el) => el.location_id === schedule.location_id) &&
          !(e.location_id === schedule.location_id && !e.employee_locations?.length)
        );
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)", padding: "32px 16px", overflowY: "auto" }}>
            <div style={{ width: "100%", maxWidth: 640, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "var(--shadow-drawer)", display: "flex", flexDirection: "column", margin: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", margin: 0 }}>Manage employees — {schedule.location_name}</h2>
                <button type="button" onClick={() => { setShowManage(false); setShowManageCreate(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", display: "flex" }}>
                  <XIcon style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {manageLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", fontSize: 13, color: "var(--fg-4)", gap: 8 }}>
                  <Loader2Icon style={{ width: 15, height: 15 }} className="animate-spin" />Loading…
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1px solid var(--line)" }}>
                    <p className="eyebrow" style={{ color: "var(--fg-4)" }}>At this location ({atLoc.length})</p>
                    {atLoc.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--fg-4)" }}>No employees assigned yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {atLoc.map((emp) => (
                          <div key={emp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "var(--r-sm)", padding: "8px 12px" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                          >
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{emp.first_name} {emp.last_name}</span>
                              {emp.position && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--fg-4)" }}>{emp.position}</span>}
                            </div>
                            <button
                              type="button"
                              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: "var(--r-sm)" }}
                              disabled={manageBusy === emp.id}
                              onClick={() => void removeFromLocation(emp)}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--bad)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--fg-4)"; }}
                            >
                              {manageBusy === emp.id ? <Loader2Icon style={{ width: 13, height: 13 }} className="animate-spin" /> : <MinusIcon style={{ width: 13, height: 13 }} />}
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1px solid var(--line)" }}>
                    <p className="eyebrow" style={{ color: "var(--fg-4)" }}>Other employees ({notAtLoc.length})</p>
                    {notAtLoc.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--fg-4)" }}>All employees are already at this location.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {notAtLoc.map((emp) => (
                          <div key={emp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "var(--r-sm)", padding: "8px 12px" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                          >
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{emp.first_name} {emp.last_name}</span>
                              {emp.position && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--fg-4)" }}>{emp.position}</span>}
                            </div>
                            <button
                              type="button"
                              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--bronze)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: "var(--r-sm)" }}
                              disabled={manageBusy === emp.id}
                              onClick={() => void assignToLocation(emp)}
                            >
                              {manageBusy === emp.id ? <Loader2Icon style={{ width: 13, height: 13 }} className="animate-spin" /> : <PlusIcon style={{ width: 13, height: 13 }} />}
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p className="eyebrow" style={{ color: "var(--fg-4)" }}>Create new employee</p>
                      <button
                        type="button"
                        onClick={() => setShowManageCreate((v) => !v)}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--fg-4)"; }}
                      >
                        {showManageCreate ? <XIcon style={{ width: 13, height: 13 }} /> : <PlusIcon style={{ width: 13, height: 13 }} />}
                        {showManageCreate ? "Cancel" : "New employee"}
                      </button>
                    </div>
                    {showManageCreate && (
                      <EmployeeForm
                        form={manageCreateForm}
                        locIds={manageCreateLocIds}
                        primaryLoc={manageCreatePrimaryLoc}
                        locations={manageLocations}
                        submitting={manageCreateSubmitting}
                        onChange={(key, val) => setManageCreateForm((prev) => ({ ...prev, [key]: val }))}
                        onToggleLoc={toggleManageCreateLoc}
                        onSetPrimary={setManageCreatePrimaryLoc}
                        onSubmit={(e) => void handleManageCreate(e)}
                        onCancel={() => setShowManageCreate(false)}
                        submitLabel="Create employee"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
