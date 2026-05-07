"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  MapPinIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react";
import {
  EVENT_TYPE_CLASSES,
  EVENT_TYPE_LABELS,
  type Animal,
  type AnimalEvent,
  type AnimalSex,
  type EventType,
} from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";

const ALL_EVENT_TYPES: EventType[] = [
  "health_check", "vet_visit", "vaccine", "transfer", "feeding_note", "incident", "note", "other",
];

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type VaccineStatusKey = "ok" | "soon" | "overdue" | "unknown";

function getVaccineStatus(nextDate: string | null): { key: VaccineStatusKey; label: string } {
  if (!nextDate) return { key: "unknown", label: "Unknown" };
  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  if (nextDate < today) return { key: "overdue", label: "Overdue" };
  if (nextDate <= in30) return { key: "soon", label: "Due soon" };
  return { key: "ok", label: "Up to date" };
}

const VACCINE_BADGE: Record<VaccineStatusKey, string> = {
  ok: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  unknown: "bg-muted text-muted-foreground",
};

const EVENT_DOT: Record<EventType, string> = {
  health_check: "bg-blue-500",
  vet_visit: "bg-purple-500",
  vaccine: "bg-indigo-500",
  transfer: "bg-zinc-400",
  feeding_note: "bg-green-500",
  incident: "bg-red-500",
  note: "bg-zinc-400",
  other: "bg-zinc-400",
};

interface AnimalDetailClientProps {
  animal: Animal;
  initialEvents: AnimalEvent[];
  locations: AdminLocation[];
}

export function AnimalDetailClient({ animal: initialAnimal, initialEvents, locations }: AnimalDetailClientProps) {
  const router = useRouter();
  const [animal, setAnimal] = useState(initialAnimal);
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Animal>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    event_type: "note" as EventType,
    event_date: new Date().toISOString().slice(0, 10),
    title: "",
    notes: "",
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);

  function startEdit() {
    setEditForm({
      name: animal.name,
      species: animal.species,
      sex: animal.sex,
      location_id: animal.location_id ?? undefined,
      estimated_birth_date: animal.estimated_birth_date ?? undefined,
      notes: animal.notes ?? undefined,
      last_vaccination_date: animal.last_vaccination_date ?? undefined,
      next_vaccination_date: animal.next_vaccination_date ?? undefined,
      vaccination_passport: animal.vaccination_passport,
    });
    setEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/animals/${animal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Update failed");
        return;
      }
      const updated = await res.json() as Animal;
      const loc = locations.find((l) => l.id === updated.location_id);
      setAnimal({ ...updated, location_name: loc?.name ?? null });
      setEditing(false);
      toast.success("Saved");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingEvent(true);
    try {
      const res = await fetch(`/api/animals/${animal.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventForm.event_type,
          event_date: eventForm.event_date,
          title: eventForm.title,
          notes: eventForm.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to add event");
        return;
      }
      const newEvent = await res.json() as AnimalEvent;
      setEvents((prev) => [newEvent, ...prev]);
      setShowEventForm(false);
      setEventForm({ event_type: "note", event_date: new Date().toISOString().slice(0, 10), title: "", notes: "" });
      toast.success("Event added");
    } finally {
      setSubmittingEvent(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    const res = await fetch(`/api/animals/${animal.id}/events`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId }),
    });
    if (!res.ok) { toast.error("Delete failed"); return; }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    toast.success("Event removed");
  }

  async function handleDelete() {
    const res = await fetch(`/api/animals/${animal.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success(`${animal.name} deleted`);
    router.push("/dashboard/animals");
  }

  const vaccStatus = getVaccineStatus(animal.next_vaccination_date);

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1.5 text-muted-foreground -ml-2">
            <ArrowLeftIcon className="size-4" />
            Cancel
          </Button>
          <h1 className="text-lg font-semibold">Edit — {animal.name}</h1>
        </div>

        <form onSubmit={(e) => void handleSaveEdit(e)} className="flex flex-col gap-4">
          {/* Basic information */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Basic information</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Species</label>
                <input
                  value={editForm.species ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, species: e.target.value }))}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Sex</label>
                <select
                  value={editForm.sex ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, sex: (e.target.value || null) as AnimalSex | null }))}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
                >
                  <option value="">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Location</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <select
                  value={editForm.location_id ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, location_id: e.target.value || undefined }))}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
                >
                  <option value="">No location</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Est. birth date</label>
                <input
                  type="date"
                  value={editForm.estimated_birth_date ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, estimated_birth_date: e.target.value || undefined }))}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Health & vaccines */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Health & vaccines</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Last vaccine</label>
                <input
                  type="date"
                  value={editForm.last_vaccination_date ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, last_vaccination_date: e.target.value || undefined }))}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Next vaccine</label>
                <input
                  type="date"
                  value={editForm.next_vaccination_date ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, next_vaccination_date: e.target.value || undefined }))}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5 justify-end">
                <label className="text-xs font-medium text-muted-foreground">Vaccination passport</label>
                <div className="flex items-center h-8 gap-2">
                  <input
                    type="checkbox"
                    id="edit_vacc_passport"
                    checked={editForm.vaccination_passport ?? false}
                    onChange={(e) => setEditForm((f) => ({ ...f, vaccination_passport: e.target.checked }))}
                    className="size-4 rounded"
                  />
                  <label htmlFor="edit_vacc_passport" className="text-sm text-muted-foreground">Has passport</label>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Notes</h2>
            <textarea
              value={editForm.notes ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value || undefined }))}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm resize-none"
              placeholder="Optional notes about this animal"
            />
          </div>

          {/* Form actions */}
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 gap-1.5"
              onClick={() => void handleDelete()}
            >
              <TrashIcon className="size-3.5" />
              Delete animal
            </Button>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/animals")}
          className="gap-1.5 text-muted-foreground mb-3 -ml-2"
        >
          <ArrowLeftIcon className="size-4" />
          Animals
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{animal.name}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span className="capitalize">{animal.species}</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3.5 shrink-0" />
                {animal.location_name ?? <span className="italic">No location</span>}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5">
              <PencilIcon className="size-3.5" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowEventForm((v) => !v)} className="gap-1.5">
              <PlusIcon className="size-3.5" />
              Add event
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Species</p>
          <p className="text-sm font-semibold capitalize">{animal.species}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Location</p>
          {animal.location_name ? (
            <p className="text-sm font-semibold">{animal.location_name}</p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">No location assigned</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Sex</p>
          <p className="text-sm font-semibold capitalize">{animal.sex ?? "Unknown"}</p>
        </div>
      </div>

      {/* Health & vaccines */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-muted-foreground" />
            Health & vaccines
          </h2>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VACCINE_BADGE[vaccStatus.key]}`}>
            {vaccStatus.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Last vaccine</p>
            <p className="text-sm">{fmtDate(animal.last_vaccination_date) ?? <span className="text-muted-foreground/60 italic text-xs">Not recorded</span>}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Next vaccine</p>
            {animal.next_vaccination_date ? (
              <p className="text-sm">{fmtDate(animal.next_vaccination_date)}</p>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">No date recorded</p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Passport</p>
            <p className="text-sm">{animal.vaccination_passport ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3">Profile details</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 text-sm">
          {(
            [
              { label: "Name", value: animal.name },
              { label: "Species", value: animal.species, className: "capitalize" },
              { label: "Sex", value: animal.sex ? animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1) : null, empty: "Unknown" },
              { label: "Location", value: animal.location_name, empty: "No location assigned" },
              { label: "Est. birth date", value: fmtDate(animal.estimated_birth_date), empty: "Not recorded" },
            ] as Array<{ label: string; value: string | null; empty?: string; className?: string }>
          ).map(({ label, value, empty, className }) => (
            <div key={label}>
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{label}</p>
              {value ? (
                <p className={`text-sm font-medium ${className ?? ""}`}>{value}</p>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">{empty ?? "Not recorded"}</p>
              )}
            </div>
          ))}
          <div className="col-span-2 sm:col-span-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Notes</p>
            {animal.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{animal.notes}</p>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">No notes yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Event timeline */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Event timeline
            {events.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {events.length} event{events.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>
          {!showEventForm && (
            <Button size="sm" variant="outline" onClick={() => setShowEventForm(true)} className="gap-1.5">
              <PlusIcon className="size-3.5" />
              Add event
            </Button>
          )}
        </div>

        {showEventForm && (
          <form onSubmit={(e) => void handleAddEvent(e)} className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">New event</span>
              <button type="button" onClick={() => setShowEventForm(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={eventForm.event_type}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_type: e.target.value as EventType }))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {ALL_EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  required
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_date: e.target.value }))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  placeholder="e.g. Annual check-up"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={eventForm.notes}
                onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
                placeholder="Optional details"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setShowEventForm(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submittingEvent}>{submittingEvent ? "Adding…" : "Add event"}</Button>
            </div>
          </form>
        )}

        {events.length === 0 ? (
          <div className="rounded-lg border border-border border-dashed py-8 px-6 text-center">
            <p className="text-sm font-medium text-foreground mb-1">No events recorded yet</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
              Add vaccines, health checks, transfers, notes, or important incidents to build this animal&apos;s history.
            </p>
            {!showEventForm && (
              <Button size="sm" variant="outline" onClick={() => setShowEventForm(true)} className="gap-1.5">
                <PlusIcon className="size-3.5" />
                Add event
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((ev) => (
              <div key={ev.id} className="flex gap-3 group rounded-lg border border-border bg-card p-3 hover:bg-muted/20 transition-colors">
                <div className="flex flex-col items-center pt-[5px] shrink-0">
                  <div className={`size-2 rounded-full ${EVENT_DOT[ev.event_type]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${EVENT_TYPE_CLASSES[ev.event_type]}`}>
                      {EVENT_TYPE_LABELS[ev.event_type]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ev.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{ev.title}</p>
                  {ev.notes && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{ev.notes}</p>}
                </div>
                <button
                  onClick={() => void handleDeleteEvent(ev.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-destructive self-start mt-0.5 shrink-0"
                  title="Delete event"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
