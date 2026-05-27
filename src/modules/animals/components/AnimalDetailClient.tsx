"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
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
  EVENT_TYPE_LABELS,
  ANIMAL_SPECIES,
  type Animal,
  type AnimalEvent,
  type AnimalSex,
  type EventType,
} from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";
import { DateInput } from "@/components/ui/date-input";
import type { PillTone } from "@/components/ui/pill";

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

const VACCINE_TONE: Record<VaccineStatusKey, PillTone> = {
  ok: "good",
  soon: "warn",
  overdue: "bad",
  unknown: "neutral",
};

const EVENT_TYPE_TONE: Record<EventType, PillTone> = {
  health_check: "info",
  vet_visit: "info",
  vaccine: "good",
  transfer: "neutral",
  feeding_note: "good",
  incident: "bad",
  note: "neutral",
  other: "neutral",
};

const EVENT_DOT_COLOR: Record<EventType, string> = {
  health_check: "var(--info)",
  vet_visit: "var(--info)",
  vaccine: "var(--good)",
  transfer: "var(--fg-4)",
  feeding_note: "var(--good)",
  incident: "var(--bad)",
  note: "var(--fg-4)",
  other: "var(--fg-4)",
};

const inputStyle: React.CSSProperties = {
  height: 32,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line-strong)",
  background: "var(--bg)",
  color: "var(--fg)",
  padding: "0 10px",
  fontSize: 13,
  width: "100%",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const textareaStyle: React.CSSProperties = {
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line-strong)",
  background: "var(--bg)",
  color: "var(--fg)",
  padding: "8px 10px",
  fontSize: 13,
  width: "100%",
  resize: "none",
  outline: "none",
};

const cardStyle: React.CSSProperties = {
  borderRadius: "var(--r-lg)",
  border: "1px solid var(--line)",
  background: "var(--surface)",
  padding: 20,
};

interface AnimalDetailClientProps {
  animal: Animal;
  initialEvents: AnimalEvent[];
  locations: AdminLocation[];
  isOwner?: boolean;
}

export function AnimalDetailClient({ animal: initialAnimal, initialEvents, locations, isOwner = false }: AnimalDetailClientProps) {
  const router = useRouter();
  const [animal, setAnimal] = useState(initialAnimal);
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Animal>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    setDeleting(true);
    try {
      const res = await fetch(`/api/animals/${animal.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Delete failed"); return; }
      toast.success(`${animal.name} deleted`);
      router.push("/animals");
    } finally {
      setDeleting(false);
    }
  }

  const vaccStatus = getVaccineStatus(animal.next_vaccination_date);

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <ArrowLeftIcon className="size-4" />
            Cancel
          </Button>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)" }}>Edit — {animal.name}</h1>
        </div>

        <form onSubmit={(e) => void handleSaveEdit(e)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Basic information */}
          <div style={cardStyle}>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 16 }}>Basic information</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>
                  Name <span style={{ color: "var(--bad)" }}>*</span>
                </label>
                <input
                  required
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Species</label>
                <select
                  value={editForm.species ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, species: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">— select —</option>
                  {ANIMAL_SPECIES.map((s) => (
                    <option key={s} value={s.toLowerCase()}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Sex</label>
                <select
                  value={editForm.sex ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, sex: (e.target.value || null) as AnimalSex | null }))}
                  style={selectStyle}
                >
                  <option value="">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div style={cardStyle}>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 16 }}>Location</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Location</label>
                <select
                  value={editForm.location_id ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, location_id: e.target.value || undefined }))}
                  style={selectStyle}
                >
                  <option value="">No location</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Est. birth date</label>
                <DateInput
                  value={editForm.estimated_birth_date ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, estimated_birth_date: e.target.value || undefined }))}
                />
              </div>
            </div>
          </div>

          {/* Health & vaccines */}
          <div style={cardStyle}>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 16 }}>Health &amp; vaccines</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Last vaccine</label>
                <DateInput
                  value={editForm.last_vaccination_date ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, last_vaccination_date: e.target.value || undefined }))}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Next vaccine</label>
                <DateInput
                  value={editForm.next_vaccination_date ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, next_vaccination_date: e.target.value || undefined }))}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Vaccination passport</label>
                <div style={{ display: "flex", alignItems: "center", height: 32, gap: 8 }}>
                  <input
                    type="checkbox"
                    id="edit_vacc_passport"
                    checked={editForm.vaccination_passport ?? false}
                    onChange={(e) => setEditForm((f) => ({ ...f, vaccination_passport: e.target.checked }))}
                    style={{ width: 16, height: 16, borderRadius: "var(--r-sm)", cursor: "pointer" }}
                  />
                  <label htmlFor="edit_vacc_passport" style={{ fontSize: 13, color: "var(--fg-3)", cursor: "pointer" }}>Has passport</label>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={cardStyle}>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 16 }}>Notes</p>
            <textarea
              value={editForm.notes ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value || undefined }))}
              rows={3}
              style={textareaStyle}
              placeholder="Optional notes about this animal"
            />
          </div>

          {/* Form actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
            {isOwner ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <TrashIcon className="size-3.5" />
                Delete animal
              </Button>
            ) : (
              <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Only admins can delete animals</span>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</Button>
            </div>
          </div>
        </form>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
              padding: "0 16px",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
          >
            <div style={{
              width: "100%", maxWidth: 400,
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", padding: 24,
              boxShadow: "var(--shadow-2)",
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Delete {animal.name}?</h2>
              <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
                This cannot be undone. The animal record and all associated events will be permanently removed.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={() => void handleDelete()} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/animals")}
          style={{ marginBottom: 12 }}
        >
          <ArrowLeftIcon className="size-4" />
          Animals
        </Button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>{animal.name}</h1>
            <p style={{ marginTop: 6, fontSize: 13, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ textTransform: "capitalize" }}>{animal.species}</span>
              <span style={{ color: "var(--fg-4)" }}>·</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPinIcon className="size-3.5 shrink-0" />
                {animal.location_name ?? <span style={{ fontStyle: "italic", color: "var(--fg-4)" }}>No location</span>}
              </span>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button size="sm" variant="secondary" onClick={startEdit}>
              <PencilIcon className="size-3.5" />
              Edit
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowEventForm((v) => !v)}>
              <PlusIcon className="size-3.5" />
              Add event
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Species", value: animal.species, capitalize: true },
          { label: "Location", value: animal.location_name },
          { label: "Sex", value: animal.sex ? animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1) : null, empty: "Unknown" },
        ].map(({ label, value, capitalize, empty }) => (
          <div key={label} style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--bg-2)", padding: 12 }}>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 4 }}>{label}</p>
            {value ? (
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", textTransform: capitalize ? "capitalize" : undefined }}>{value}</p>
            ) : (
              <p style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>{empty ?? "No location assigned"}</p>
            )}
          </div>
        ))}
      </div>

      {/* Health & vaccines */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheckIcon className="size-4" style={{ color: "var(--fg-3)" }} />
            Health &amp; vaccines
          </h2>
          <Pill tone={VACCINE_TONE[vaccStatus.key]}>{vaccStatus.label}</Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 2 }}>Last vaccine</p>
            <p style={{ fontSize: 13, color: "var(--fg)" }}>{fmtDate(animal.last_vaccination_date) ?? <span style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>Not recorded</span>}</p>
          </div>
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 2 }}>Next vaccine</p>
            {animal.next_vaccination_date ? (
              <p style={{ fontSize: 13, color: "var(--fg)" }}>{fmtDate(animal.next_vaccination_date)}</p>
            ) : (
              <p style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>No date recorded</p>
            )}
          </div>
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 2 }}>Passport</p>
            <p style={{ fontSize: 13, color: "var(--fg)" }}>{animal.vaccination_passport ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 12 }}>Profile details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 24px", fontSize: 13 }}>
          {(
            [
              { label: "Name", value: animal.name },
              { label: "Species", value: animal.species, capitalize: true },
              { label: "Sex", value: animal.sex ? animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1) : null, empty: "Unknown" },
              { label: "Location", value: animal.location_name, empty: "No location assigned" },
              { label: "Est. birth date", value: fmtDate(animal.estimated_birth_date), empty: "Not recorded" },
            ] as Array<{ label: string; value: string | null; empty?: string; capitalize?: boolean }>
          ).map(({ label, value, empty, capitalize }) => (
            <div key={label}>
              <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 2 }}>{label}</p>
              {value ? (
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)", textTransform: capitalize ? "capitalize" : undefined }}>{value}</p>
              ) : (
                <p style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>{empty ?? "Not recorded"}</p>
              )}
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 2 }}>Notes</p>
            {animal.notes ? (
              <p style={{ fontSize: 13, color: "var(--fg-3)", whiteSpace: "pre-wrap" }}>{animal.notes}</p>
            ) : (
              <p style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>No notes yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Event timeline */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", display: "flex", alignItems: "center", gap: 8 }}>
            Event timeline
            {events.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--fg-4)" }}>
                {events.length} event{events.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>
          {!showEventForm && (
            <Button size="sm" variant="secondary" onClick={() => setShowEventForm(true)}>
              <PlusIcon className="size-3.5" />
              Add event
            </Button>
          )}
        </div>

        {showEventForm && (
          <form
            onSubmit={(e) => void handleAddEvent(e)}
            style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--bg-2)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>New event</span>
              <button
                type="button"
                onClick={() => setShowEventForm(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", display: "flex", alignItems: "center" }}
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Type</label>
                <select
                  value={eventForm.event_type}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_type: e.target.value as EventType }))}
                  style={selectStyle}
                >
                  {ALL_EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Date</label>
                <DateInput
                  required
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_date: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>
                  Title <span style={{ color: "var(--bad)" }}>*</span>
                </label>
                <input
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. Annual check-up"
                />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Notes</label>
              <textarea
                value={eventForm.notes}
                onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                style={textareaStyle}
                placeholder="Optional details"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowEventForm(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submittingEvent}>{submittingEvent ? "Adding…" : "Add event"}</Button>
            </div>
          </form>
        )}

        {events.length === 0 ? (
          <div style={{
            borderRadius: "var(--r-lg)", border: "1px dashed var(--line-strong)",
            padding: "32px 24px", textAlign: "center",
          }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)", marginBottom: 4 }}>No events recorded yet</p>
            <p style={{ fontSize: 12, color: "var(--fg-4)", marginBottom: 16, maxWidth: 320, margin: "0 auto 16px" }}>
              Add vaccines, health checks, transfers, notes, or important incidents to build this animal&apos;s history.
            </p>
            {!showEventForm && (
              <Button size="sm" variant="secondary" onClick={() => setShowEventForm(true)}>
                <PlusIcon className="size-3.5" />
                Add event
              </Button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map((ev) => (
              <EventRow
                key={ev.id}
                ev={ev}
                onDelete={() => void handleDeleteEvent(ev.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventRow({ ev, onDelete }: { ev: AnimalEvent; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--line)",
        background: hovered ? "var(--row-hover)" : "var(--surface)",
        padding: 12,
        transition: "background 150ms",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: EVENT_DOT_COLOR[ev.event_type], flexShrink: 0 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <Pill tone={EVENT_TYPE_TONE[ev.event_type]} size="sm">{EVENT_TYPE_LABELS[ev.event_type]}</Pill>
          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>
            {new Date(ev.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{ev.title}</p>
        {ev.notes && <p style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2, whiteSpace: "pre-wrap" }}>{ev.notes}</p>}
      </div>
      <button
        onClick={onDelete}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: hovered ? "var(--bad)" : "transparent",
          transition: "color 150ms",
          alignSelf: "flex-start", marginTop: 2, flexShrink: 0,
          display: "flex", alignItems: "center",
        }}
        title="Delete event"
      >
        <TrashIcon className="size-3.5" />
      </button>
    </div>
  );
}
