"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "lucide-react";
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  EVENT_TYPE_CLASSES,
  EVENT_TYPE_LABELS,
  type Animal,
  type AnimalEvent,
  type AnimalStatus,
  type AnimalSex,
  type EventType,
} from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";

const ALL_STATUSES: AnimalStatus[] = [
  "active", "observation", "quarantine", "sick", "transferred", "retired", "deceased", "archived",
];
const ALL_EVENT_TYPES: EventType[] = [
  "health_check", "vet_visit", "vaccine", "transfer", "feeding_note", "incident", "note", "other",
];

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
      status: animal.status,
      location_id: animal.location_id ?? undefined,
      estimated_birth_date: animal.estimated_birth_date ?? undefined,
      arrival_date: animal.arrival_date ?? undefined,
      microchip_id: animal.microchip_id ?? undefined,
      notes: animal.notes ?? undefined,
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

  return (
    <div className="flex flex-col gap-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/animals")} className="gap-1.5 text-muted-foreground">
          <ArrowLeftIcon className="size-4" />
          Animals
        </Button>
        <h1 className="text-lg font-semibold">{animal.name}</h1>
        <span className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[animal.status]}`}>
          {STATUS_LABELS[animal.status]}
        </span>
      </div>

      {/* Profile */}
      <section className="rounded-lg border border-border p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Profile</h2>
          {!editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => void handleDelete()}>Delete</Button>
            </div>
          )}
        </div>

        {editing ? (
          <form onSubmit={(e) => void handleSaveEdit(e)} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input required value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Species</label>
              <input value={editForm.species ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, species: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Sex</label>
              <select value={editForm.sex ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, sex: (e.target.value || null) as AnimalSex | null }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select value={editForm.status ?? "active"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as AnimalStatus }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <select value={editForm.location_id ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, location_id: e.target.value || undefined }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">No location</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Microchip / ID</label>
              <input value={editForm.microchip_id ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, microchip_id: e.target.value || undefined }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Arrival date</label>
              <input type="date" value={editForm.arrival_date ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, arrival_date: e.target.value || undefined }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Est. birth date</label>
              <input type="date" value={editForm.estimated_birth_date ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, estimated_birth_date: e.target.value || undefined }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <div className="col-span-2 sm:col-span-3 flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={editForm.notes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value || undefined }))} rows={2} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none" />
            </div>
            <div className="col-span-2 sm:col-span-3 flex gap-2">
              <Button type="submit" size="sm" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save"}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 text-sm">
            {[
              { label: "Species", value: animal.species },
              { label: "Sex", value: animal.sex ? (animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1)) : "—" },
              { label: "Location", value: animal.location_name ?? "—" },
              { label: "Arrival", value: animal.arrival_date ? new Date(animal.arrival_date).toLocaleDateString() : "—" },
              { label: "Est. birth", value: animal.estimated_birth_date ? new Date(animal.estimated_birth_date).toLocaleDateString() : "—" },
              { label: "Microchip", value: animal.microchip_id ?? "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
            {animal.notes && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{animal.notes}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Event timeline */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Event timeline</h2>
          <Button size="sm" variant="outline" onClick={() => setShowEventForm((v) => !v)} className="gap-1.5">
            <PlusIcon className="size-4" />
            Add event
          </Button>
        </div>

        {showEventForm && (
          <form onSubmit={(e) => void handleAddEvent(e)} className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select value={eventForm.event_type} onChange={(e) => setEventForm((f) => ({ ...f, event_type: e.target.value as EventType }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                  {ALL_EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input type="date" required value={eventForm.event_date} onChange={(e) => setEventForm((f) => ({ ...f, event_date: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Title *</label>
                <input required value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" placeholder="e.g. Annual check-up" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={eventForm.notes} onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none" placeholder="Optional details" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setShowEventForm(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submittingEvent}>{submittingEvent ? "Adding…" : "Add event"}</Button>
            </div>
          </form>
        )}

        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">No events recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((ev) => (
              <div key={ev.id} className="flex gap-3 rounded-lg border border-border p-3 group hover:bg-muted/20 transition-colors">
                <div className="flex flex-col items-center gap-1 pt-0.5 min-w-[48px]">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${EVENT_TYPE_CLASSES[ev.event_type]}`}>
                    {EVENT_TYPE_LABELS[ev.event_type]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(ev.event_date).toLocaleDateString()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ev.title}</p>
                  {ev.notes && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{ev.notes}</p>}
                </div>
                <button
                  onClick={() => void handleDeleteEvent(ev.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-destructive self-start mt-0.5"
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
