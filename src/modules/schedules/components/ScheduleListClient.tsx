"use client";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, TrashIcon, CalendarIcon, PrinterIcon, CopyIcon } from "lucide-react";
import type { Schedule } from "@/modules/schedules/types";
import type { AdminLocation } from "@/modules/admin/types";
import { DateInput } from "@/components/ui/date-input";

interface Props {
  initialSchedules: Schedule[];
  locations: AdminLocation[];
}

function weekLabel(iso: string) {
  const start = parseISO(iso);
  return `${format(start, "d MMM")} – ${format(addDays(start, 6), "d MMM yyyy")}`;
}

function defaultScheduleName(weekIso: string): string {
  const start = parseISO(weekIso);
  return `Week of ${format(start, "d MMM yyyy")}`;
}

function mondayOf(d: Date) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function ScheduleListClient({ initialSchedules, locations }: Props) {
  const router = useRouter();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [locationFilter, setLocationFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createWeek, setCreateWeek] = useState(mondayOf(new Date()));
  const [createLocation, setCreateLocation] = useState(locations[0]?.id ?? "");
  // Name auto-fills from week; user can override
  const [createNameOverride, setCreateNameOverride] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const createName = createNameOverride ?? defaultScheduleName(createWeek);

  const filtered = useMemo(
    () => (locationFilter ? schedules.filter((s) => s.location_id === locationFilter) : schedules),
    [schedules, locationFilter],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = createName.trim();
    if (!name || !createLocation || !createWeek) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location_id: createLocation, week_start_date: createWeek }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to create schedule");
        return;
      }
      const created = (await res.json()) as Schedule;
      const loc = locations.find((l) => l.id === created.location_id);
      setSchedules((prev) => [{ ...created, location_name: loc?.name ?? null }, ...prev]);
      setShowCreate(false);
      setCreateNameOverride(null);
      toast.success("Schedule created");
      router.push(`/dashboard/scheduling/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDuplicate(schedule: Schedule) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/schedules/${schedule.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${schedule.name} (copy)` }),
      });
      if (!res.ok) { toast.error("Failed to duplicate"); return; }
      const duped = (await res.json()) as Schedule;
      const loc = locations.find((l) => l.id === duped.location_id);
      setSchedules((prev) => [{ ...duped, location_name: loc?.name ?? null }, ...prev]);
      toast.success("Schedule duplicated");
    } finally {
      setSubmitting(false);
    }
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/schedules/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete schedule"); return; }
      setSchedules((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success("Schedule deleted");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const printSchedule = useCallback(async (schedule: Schedule) => {
    setPrintingId(schedule.id);
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`);
      if (!res.ok) { toast.error("Failed to load schedule data"); return; }
      type ShiftRow = { employee_id: string; employee_name: string | null; shift_date: string; start_time: string | null; end_time: string | null };
      const data = (await res.json()) as { shifts: ShiftRow[]; location_name: string | null };
      const shifts = data.shifts ?? [];

      // Collect unique employees from shifts (preserving order) + build day set
      const empMap = new Map<string, string>();
      shifts.forEach((s) => { if (s.employee_name && !empMap.has(s.employee_id)) empMap.set(s.employee_id, s.employee_name); });

      const start = parseISO(schedule.week_start_date);
      const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(start, i);
        return { iso: format(d, "yyyy-MM-dd"), label: format(d, "EEE d") };
      });

      const shiftMap = new Map<string, ShiftRow>();
      shifts.forEach((s) => shiftMap.set(`${s.employee_id}__${s.shift_date}`, s));

      const computeH = (st: string | null, et: string | null): number => {
        if (!st || !et) return 0;
        const [sh, sm] = st.split(":").map(Number);
        const [eh, em] = et.split(":").map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        return diff <= 30 ? 0 : (diff - 30) / 60;
      };

      const headers = weekDays.map((d) => `<th>${d.label}</th>`).join("");
      const rows = Array.from(empMap.entries()).map(([empId, empName], rowIdx) => {
        let total = 0;
        const cells = weekDays.map((day) => {
          const s = shiftMap.get(`${empId}__${day.iso}`);
          if (!s?.start_time) return `<td class="off">—</td>`;
          const st = s.start_time.substring(0, 5);
          const et = (s.end_time ?? "").substring(0, 5);
          const h = computeH(st, et);
          total += h;
          return `<td class="shift"><span class="time">${st} – ${et}</span><span class="hrs">${h.toFixed(1)}h</span></td>`;
        }).join("");
        const rowClass = rowIdx % 2 === 0 ? "" : ' class="alt"';
        return `<tr${rowClass}><td class="name">${empName}</td>${cells}<td class="total">${total.toFixed(1)}h</td></tr>`;
      }).join("");

      const win = window.open("", "_blank", "width=1150,height=800");
      if (!win) { toast.error("Pop-up blocked — please allow pop-ups"); return; }
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${schedule.name}</title>
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
  col.name-col{width:130px}
  col.day-col{width:auto}
  col.total-col{width:64px}
  th{background:#1e3a8a;color:#fff;font-weight:600;font-size:10px;padding:7px 8px;text-align:center;letter-spacing:0.3px}
  th.name-th{text-align:left;padding-left:10px}
  td{padding:6px 8px;text-align:center;vertical-align:middle;border-bottom:1px solid #f0f0f0;font-size:10.5px}
  tr.alt td{background:#f8fafc}
  td.name{text-align:left;font-weight:600;padding-left:10px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  td.off{color:#d1d5db;font-size:13px}
  td.shift{line-height:1}
  td.shift .time{display:block;color:#374151;font-weight:500}
  td.shift .hrs{display:block;color:#16a34a;font-weight:700;font-size:10px;margin-top:2px}
  td.total{font-weight:700;color:#1e3a8a;background:#eff6ff!important;border-left:2px solid #bfdbfe}
  tfoot td{background:#f1f5f9;font-weight:700;font-size:11px;padding:7px 8px;border-top:2px solid #e2e8f0}
  tfoot .name{color:#6b7280;font-weight:600}
  @media print{@page{margin:8mm;size:landscape}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent{-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="accent"></div>
<div class="header">
  <div class="header-left">
    <h1>${schedule.name}</h1>
    <div class="meta">${data.location_name ? `${data.location_name} &nbsp;·&nbsp; ` : ""}${weekLabel(schedule.week_start_date)}</div>
  </div>
  <div class="header-right">Capybara Coffee<br>Internal Schedule</div>
</div>
<div class="content">
<table>
  <colgroup><col class="name-col">${weekDays.map(() => '<col class="day-col">').join("")}<col class="total-col"></colgroup>
  <thead><tr><th class="name-th">Employee</th>${headers}<th>Week</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
      win.document.close();
    } finally {
      setPrintingId(null);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-semibold">Schedules</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Weekly shift plans by shop.</p>
        </div>
        <div className="flex gap-2">
          {locations.length > 1 && (
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All shops</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}
          <Button size="sm" onClick={() => { setShowCreate((v) => !v); if (locationFilter) setCreateLocation(locationFilter); }} className="gap-1.5">
            <PlusIcon className="size-4" />
            New schedule
          </Button>
        </div>
      </div>

      {/* ── Create form ─────────────────────────────────────────── */}
      {showCreate && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3"
        >
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs font-medium text-muted-foreground">Schedule name</label>
              <input
                type="text"
                required
                value={createName}
                onChange={(e) => setCreateNameOverride(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                placeholder="e.g. Week of 5 May 2026"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Shop</label>
              <select
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                required
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Week starting (Monday)</label>
              <DateInput
                required
                value={createWeek}
                onChange={(e) => {
                  setCreateWeek(e.target.value);
                  // Reset name override so it auto-updates with the new week
                  setCreateNameOverride(null);
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between w-full pt-1 border-t border-border/40 mt-0.5">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setCreateNameOverride(null); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-1.5">
              {submitting ? "Creating…" : "Create schedule"}
            </Button>
          </div>
        </form>
      )}

      {/* ── Schedules table ─────────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Shop</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Week</th>
              <th className="px-4 py-3 w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => (
              <tr
                key={s.id}
                className="hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/scheduling/${s.id}`)}
              >
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
                    {s.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.location_name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{weekLabel(s.week_start_date)}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      title="Duplicate"
                      disabled={submitting}
                      onClick={() => void handleDuplicate(s)}
                    >
                      <CopyIcon className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      title="Download as PDF"
                      disabled={printingId === s.id}
                      onClick={() => void printSchedule(s)}
                    >
                      <PrinterIcon className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      title="Edit schedule"
                      onClick={() => router.push(`/dashboard/scheduling/${s.id}`)}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive"
                      title="Delete"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <TrashIcon className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {schedules.length === 0
              ? "No schedules yet. Create your first one above."
              : "No schedules for this shop."}
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="text-base font-semibold mb-1">Delete schedule?</h2>
            <p className="text-sm text-muted-foreground mb-1">
              You&apos;re about to permanently delete{" "}
              <span className="font-medium text-foreground">{deleteTarget.name}</span>.
            </p>
            <p className="text-xs text-muted-foreground mb-5">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void executeDelete()}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
