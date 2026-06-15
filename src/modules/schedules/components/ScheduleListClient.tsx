"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, TrashIcon, CalendarIcon, PrinterIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";
import type { Schedule } from "@/modules/schedules/types";
import type { AdminLocation } from "@/modules/admin/types";
import { DateInput } from "@/components/ui/date-input";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";

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
  return `${format(start, "d MMM")} – ${format(addDays(start, 6), "d MMM")}`;
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
  const [dupTarget, setDupTarget] = useState<Schedule | null>(null);
  const [dupWeek, setDupWeek] = useState("");
  const [dupName, setDupName] = useState("");

  const createName = createNameOverride ?? defaultScheduleName(createWeek);

  const filtered = useMemo(() => {
    const list = locationFilter ? schedules.filter((s) => s.location_id === locationFilter) : schedules;
    return [...list].sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
  }, [schedules, locationFilter]);

  // IDs of schedules that share location + week with another schedule
  const conflictIds = useMemo(() => {
    const seen = new Map<string, string[]>();
    for (const s of schedules) {
      const key = `${s.location_id}__${s.week_start_date}`;
      const group = seen.get(key) ?? [];
      group.push(s.id);
      seen.set(key, group);
    }
    const result = new Set<string>();
    Array.from(seen.values()).forEach((ids) => {
      if (ids.length > 1) ids.forEach((id: string) => result.add(id));
    });
    return result;
  }, [schedules]);

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
      router.push(`/scheduling/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  function openDuplicate(schedule: Schedule) {
    const nextWeek = format(addDays(parseISO(schedule.week_start_date), 7), "yyyy-MM-dd");
    setDupTarget(schedule);
    setDupWeek(nextWeek);
    setDupName(defaultScheduleName(nextWeek));
  }

  async function handleDuplicateConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!dupTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/schedules/${dupTarget.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dupName.trim() || defaultScheduleName(dupWeek), week_start_date: dupWeek }),
      });
      if (!res.ok) { toast.error("Failed to duplicate"); return; }
      const duped = (await res.json()) as Schedule;
      const loc = locations.find((l) => l.id === duped.location_id);
      setSchedules((prev) => [{ ...duped, location_name: loc?.name ?? null }, ...prev]);
      toast.success("Schedule duplicated");
      setDupTarget(null);
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

  const inputStyle: React.CSSProperties = {
    height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
    background: "var(--bg)", padding: "0 var(--s-3)", fontSize: 13,
    color: "var(--fg)", outline: "none", width: "100%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      <PageHeader
        eyebrow="Weekly shifts"
        title="Schedules"
        subtitle="Weekly shift plans by shop."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            {locations.length > 1 && (
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                style={{ ...inputStyle, width: "auto", minWidth: 120 }}
              >
                <option value="">All shops</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
            <Button size="sm" variant="primary" onClick={() => { setShowCreate((v) => !v); if (locationFilter) setCreateLocation(locationFilter); }}>
              <PlusIcon style={{ width: 14, height: 14 }} />
              New schedule
            </Button>
          </div>
        }
      />

      {/* ── Create form ─────────────────────────────────────────── */}
      {showCreate && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          style={{
            borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
            background: "var(--bg-2)", padding: "var(--s-4)",
            display: "flex", flexDirection: "column", gap: "var(--s-3)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-3)", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 220 }}>
              <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Schedule name</label>
              <input
                type="text"
                required
                value={createName}
                onChange={(e) => setCreateNameOverride(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Week of 5 May 2026"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
              <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Shop</label>
              <select
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                required
                style={inputStyle}
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
              <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Week starting (Monday)</label>
              <DateInput
                required
                value={createWeek}
                onChange={(e) => {
                  setCreateWeek(e.target.value);
                  setCreateNameOverride(null);
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              paddingTop: "var(--s-3)", borderTop: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              onClick={() => { setShowCreate(false); setCreateNameOverride(null); }}
              style={{ fontSize: 13, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
            >
              Cancel
            </button>
            <Button type="submit" size="sm" variant="primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create schedule"}
            </Button>
          </div>
        </form>
      )}

      {/* ── Schedules table ─────────────────────────────────────── */}
      <div
        style={{
          borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
          background: "var(--surface)", overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-2)" }}>
              {["Name", "Shop", "Week", ""].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: "10px var(--s-5)", textAlign: i === 3 ? "right" : "left",
                    color: "var(--fg-3)", fontWeight: 500, fontSize: 12,
                    borderBottom: "1px solid var(--line)",
                    width: i === 3 ? 120 : undefined,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => (
              <tr
                key={s.id}
                style={{ borderTop: idx > 0 ? "1px solid var(--line)" : undefined, cursor: "pointer" }}
                onClick={() => router.push(`/scheduling/${s.id}`)}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
              >
                <td style={{ padding: "12px var(--s-5)", fontWeight: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CalendarIcon style={{ width: 13, height: 13, color: "var(--fg-4)", flexShrink: 0 }} />
                    {s.name}
                    {conflictIds.has(s.id) && (
                      <Pill tone="warn" size="sm">
                        <TriangleAlertIcon style={{ width: 10, height: 10 }} />
                        Overlap
                      </Pill>
                    )}
                  </div>
                </td>
                <td style={{ padding: "12px var(--s-5)", color: "var(--fg-3)" }}>{s.location_name ?? "—"}</td>
                <td style={{ padding: "12px var(--s-5)", color: "var(--fg-3)" }}>{weekLabel(s.week_start_date)}</td>
                <td style={{ padding: "12px var(--s-5)" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                    <Button size="icon" variant="ghost" title="Duplicate" disabled={submitting} onClick={() => openDuplicate(s)}>
                      <CopyIcon style={{ width: 13, height: 13 }} />
                    </Button>
                    <Button size="icon" variant="ghost" title="Download as PDF" disabled={printingId === s.id} onClick={() => void printSchedule(s)}>
                      <PrinterIcon style={{ width: 13, height: 13 }} />
                    </Button>
                    <Button size="icon" variant="ghost" title="Edit schedule" onClick={() => router.push(`/scheduling/${s.id}`)}>
                      <PencilIcon style={{ width: 13, height: 13 }} />
                    </Button>
                    <Button size="icon" variant="danger" title="Delete" onClick={() => setDeleteTarget(s)}>
                      <TrashIcon style={{ width: 13, height: 13 }} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: "40px var(--s-5)", textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
            {schedules.length === 0
              ? "No schedules yet — create your first one above."
              : "No schedules for this shop."}
          </div>
        )}
      </div>

      {/* ── Duplicate modal ─────────────────────────────────────── */}
      {dupTarget && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
            padding: "0 var(--s-4)",
          }}
          onKeyDown={(e) => { if (e.key === "Escape") setDupTarget(null); }}
        >
          <form
            onSubmit={(e) => void handleDuplicateConfirm(e)}
            style={{
              width: "100%", maxWidth: 440,
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", padding: "var(--s-6)",
              boxShadow: "var(--shadow-drawer)", display: "flex", flexDirection: "column", gap: "var(--s-4)",
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Duplicate schedule</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="eyebrow" style={{ color: "var(--fg-4)" }}>New week starting (Monday)</label>
              <DateInput
                required
                value={dupWeek}
                onChange={(e) => {
                  setDupWeek(e.target.value);
                  setDupName(defaultScheduleName(e.target.value));
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Schedule name</label>
              <input type="text" required value={dupName} onChange={(e) => setDupName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--s-2)" }}>
              <Button variant="secondary" size="sm" type="button" onClick={() => setDupTarget(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" disabled={submitting}>
                {submitting ? "Duplicating…" : "Duplicate"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Delete confirmation modal ────────────────────────────── */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
            padding: "0 var(--s-4)",
          }}
          onKeyDown={(e) => { if (e.key === "Escape") setDeleteTarget(null); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 380,
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", padding: "var(--s-6)",
              boxShadow: "var(--shadow-drawer)",
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Delete schedule?</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 4 }}>
              You&apos;re about to permanently delete{" "}
              <span style={{ fontWeight: 500, color: "var(--fg)" }}>{deleteTarget.name}</span>.
            </p>
            <p style={{ fontSize: 12, color: "var(--fg-4)", marginBottom: "var(--s-5)" }}>This cannot be undone.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--s-2)" }}>
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => void executeDelete()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
