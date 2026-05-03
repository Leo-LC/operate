"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, CopyIcon, TrashIcon, CalendarIcon, ChevronRightIcon } from "lucide-react";
import type { Schedule } from "@/modules/schedules/types";
import { STATUS_LABELS, STATUS_CLASSES } from "@/modules/schedules/types";
import type { AdminLocation } from "@/modules/admin/types";

interface Props {
  initialSchedules: Schedule[];
  locations: AdminLocation[];
}

function weekLabel(iso: string) {
  const start = parseISO(iso);
  return `${format(start, "d MMM")} – ${format(addDays(start, 6), "d MMM yyyy")}`;
}

function mondayOf(d: Date) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function ScheduleListClient({ initialSchedules, locations }: Props) {
  const router = useRouter();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [locationFilter, setLocationFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLocation, setCreateLocation] = useState(locations[0]?.id ?? "");
  const [createWeek, setCreateWeek] = useState(mondayOf(new Date()));
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(
    () => locationFilter ? schedules.filter((s) => s.location_id === locationFilter) : schedules,
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
      const created = await res.json() as Schedule;
      const loc = locations.find((l) => l.id === created.location_id);
      setSchedules((prev) => [{ ...created, location_name: loc?.name ?? null }, ...prev]);
      setShowCreate(false);
      setCreateName("");
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
      const duped = await res.json() as Schedule;
      const loc = locations.find((l) => l.id === duped.location_id);
      setSchedules((prev) => [{ ...duped, location_name: loc?.name ?? null }, ...prev]);
      toast.success("Schedule duplicated");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete schedule"); return; }
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    toast.success("Schedule deleted");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-xl font-semibold">Schedules</h1>
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
          <Button size="sm" onClick={() => setShowCreate((v) => !v)} className="gap-1.5">
            <PlusIcon className="size-4" />
            New schedule
          </Button>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="rounded-lg border border-border bg-muted/20 p-4 flex flex-wrap gap-3 items-end"
        >
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Schedule name</label>
            <input
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="e.g. Week 20 — Samui"
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
            <input
              type="date"
              required
              value={createWeek}
              onChange={(e) => setCreateWeek(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Creating…" : "Create"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Shop</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Week</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => (
              <tr
                key={s.id}
                className="hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/scheduling/${s.id}`)}
              >
                <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                  <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
                  {s.name}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.location_name ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{weekLabel(s.week_start_date)}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="size-7" title="Duplicate" onClick={() => void handleDuplicate(s)}>
                      <CopyIcon className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" title="Delete" onClick={() => void handleDelete(s.id, s.name)}>
                      <TrashIcon className="size-3.5" />
                    </Button>
                    <ChevronRightIcon className="size-4 text-muted-foreground self-center ml-1" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {schedules.length === 0 ? "No schedules yet. Create your first one above." : "No schedules for this shop."}
          </div>
        )}
      </div>
    </div>
  );
}
