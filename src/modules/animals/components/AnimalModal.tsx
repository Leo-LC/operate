"use client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DateInput } from "@/components/ui/date-input";
import { Pill } from "@/components/ui/pill";
import type { PillTone } from "@/components/ui/pill";
import {
  CopyIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  SyringeIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import {
  ANIMAL_SPECIES,
  type Animal,
  type AnimalSex,
} from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";
import {
  lastVaccinationDate,
  suggestNextVaccine,
} from "@/modules/animals/lib/vaccines";

interface FormValues {
  name: string;
  species: string;
  sex: AnimalSex | "";
  location_id: string;
  estimated_birth_date: string;
  vaccination_dates: string[];
  next_vaccination_date: string;
  vaccination_passport: boolean;
}

const EMPTY_FORM: FormValues = {
  name: "",
  species: "",
  sex: "",
  location_id: "",
  estimated_birth_date: "",
  vaccination_dates: [],
  next_vaccination_date: "",
  vaccination_passport: false,
};

interface AnimalModalProps {
  animal: Animal | null;
  locations: AdminLocation[];
  availableSpecies?: string[];
  initialDuplicate?: { animal: Animal; vaccineDates: string[] } | null;
  onClose: () => void;
  onSaved: (animal: Animal) => void;
  onDeleted?: (animalId: string) => void;
}

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

const inputStyle: React.CSSProperties = {
  height: 32,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)",
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

function dedupSpecies(base: string[], extra: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...base, ...extra]) {
    const v = s.trim().toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.sort();
}

export function AnimalModal({ animal, locations, availableSpecies, initialDuplicate, onClose, onSaved, onDeleted }: AnimalModalProps) {
  const isAdd = animal === null;
  const isDuplicateInit = !!initialDuplicate && isAdd;

  const [detail, setDetail] = useState<Animal | null>(isAdd ? null : animal);
  const [vaccineDates, setVaccineDates] = useState<string[]>([]);
  const [editing, setEditing] = useState(isAdd);
  const [form, setForm] = useState<FormValues | null>(() => {
    if (!isAdd) return null;
    if (initialDuplicate) {
      const src = initialDuplicate.animal;
      const dates = [...(initialDuplicate.vaccineDates ?? [])].filter(Boolean).sort();
      const suggested = suggestNextVaccine(dates) ?? src.next_vaccination_date ?? "";
      const overridden = !!src.next_vaccination_date && src.next_vaccination_date !== suggestNextVaccine(dates);
      return {
        name: src.name ? `${src.name} (copy)` : "",
        species: src.species ?? "",
        sex: (src.sex as AnimalSex) ?? "",
        location_id: src.location_id ?? "",
        estimated_birth_date: src.estimated_birth_date ?? "",
        vaccination_dates: dates,
        next_vaccination_date: overridden ? (src.next_vaccination_date ?? "") : suggested,
        vaccination_passport: src.vaccination_passport ?? false,
      };
    }
    return EMPTY_FORM;
  });
  const [nextOverridden, setNextOverridden] = useState(false);
  const [formErrors, setFormErrors] = useState<{ species?: string; location_id?: string }>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(isDuplicateInit);

  const speciesOptions = React.useMemo(() => {
    const base = ANIMAL_SPECIES.map((s) => s.toLowerCase());
    const extra = availableSpecies ?? [];
    // include current species values so custom ones stay visible
    const current = [detail?.species, form?.species].filter(Boolean) as string[];
    return dedupSpecies(base, [...extra, ...current]);
  }, [availableSpecies, detail?.species, form?.species]);

  function handleDuplicate() {
    if (!detail) return;
    const dates = [...vaccineDates];
    const suggested = suggestNextVaccine(dates) ?? detail.next_vaccination_date ?? "";
    const storedNext = detail.next_vaccination_date ?? "";
    const overridden = !!storedNext && storedNext !== suggestNextVaccine(dates);
    const dupNext = overridden ? storedNext : suggested;
    setForm({
      name: detail.name ? `${detail.name} (copy)` : "",
      species: detail.species,
      sex: detail.sex ?? "",
      location_id: detail.location_id ?? "",
      estimated_birth_date: detail.estimated_birth_date ?? "",
      vaccination_dates: dates,
      next_vaccination_date: dupNext,
      vaccination_passport: detail.vaccination_passport,
    });
    setNextOverridden(overridden);
    setFormErrors({});
    setIsDuplicate(true);
    setEditing(true);
  }

  // The modal mounts fresh each time it is opened; props stay stable for its lifetime.
  useEffect(() => {
    if (isAdd) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/animals/${animal!.id}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { animal: Animal; vaccination_dates: string[] };
        if (cancelled) return;
        const dates = (data.vaccination_dates ?? []).filter(Boolean).sort();
        const locName = locations.find((l) => l.id === data.animal.location_id)?.name ?? null;
        setDetail({ ...data.animal, location_name: locName });
        setVaccineDates(dates);
      } catch {
        toast.error("Could not load animal details");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [animal, isAdd, locations]);

  function startEdit() {
    if (!detail) return;
    const dates = [...vaccineDates];
    const suggested = suggestNextVaccine(dates) ?? "";
    const storedNext = detail.next_vaccination_date ?? "";
    const overridden = !!storedNext && storedNext !== suggested;
    setForm({
      name: detail.name,
      species: detail.species,
      sex: detail.sex ?? "",
      location_id: detail.location_id ?? "",
      estimated_birth_date: detail.estimated_birth_date ?? "",
      vaccination_dates: dates,
      next_vaccination_date: overridden ? storedNext : suggested,
      vaccination_passport: detail.vaccination_passport,
    });
    setNextOverridden(overridden);
    setFormErrors({});
    setIsDuplicate(false);
    setEditing(true);
  }

  function handleDateChange(index: number, value: string) {
    setForm((f) => {
      if (!f) return f;
      const dates = [...f.vaccination_dates];
      dates[index] = value;
      const clean = dates.filter(Boolean).sort();
      return {
        ...f,
        vaccination_dates: clean,
        next_vaccination_date: nextOverridden ? f.next_vaccination_date : (suggestNextVaccine(clean) ?? ""),
      };
    });
  }

  function handleAddDate() {
    setForm((f) => (f ? { ...f, vaccination_dates: [...f.vaccination_dates, ""] } : f));
  }

  function handleRemoveDate(index: number) {
    setForm((f) => {
      if (!f) return f;
      const dates = f.vaccination_dates.filter((_, i) => i !== index);
      return {
        ...f,
        vaccination_dates: dates,
        next_vaccination_date: nextOverridden ? f.next_vaccination_date : (suggestNextVaccine(dates) ?? ""),
      };
    });
  }

  function handleNextChange(value: string) {
    setNextOverridden(value !== "");
    setForm((f) => (f ? { ...f, next_vaccination_date: value } : f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const errors: { species?: string; location_id?: string } = {};
    if (!form.species) errors.species = "Species is required";
    if (!form.location_id) errors.location_id = "Location is required";
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});

    const body = {
      name: form.name,
      species: form.species,
      sex: form.sex || null,
      location_id: form.location_id || null,
      estimated_birth_date: form.estimated_birth_date || null,
      vaccination_dates: form.vaccination_dates,
      next_vaccination_date: form.next_vaccination_date || null,
      vaccination_passport: form.vaccination_passport,
    };

    // normalize species to lowercase for storage but keep display-friendly
    const normalizedSpecies = form.species.trim().toLowerCase();
    const bodySpecies = normalizedSpecies || form.species.trim();
    const bodyWithSpecies = { ...body, species: bodySpecies };

    setSaving(true);
    try {
      if (isAdd || isDuplicate) {
        const res = await fetch("/api/animals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyWithSpecies),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error ?? "Failed to add animal");
          return;
        }
        const created = (await res.json()) as Animal;
        const loc = locations.find((l) => l.id === created.location_id);
        onSaved({ ...created, location_name: loc?.name ?? null });
        onClose();
        toast.success(`${created.name} added`);
        return;
      }

      const res = await fetch(`/api/animals/${animal!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyWithSpecies),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Update failed");
        return;
      }
      const updated = (await res.json()) as Animal;
      const loc = locations.find((l) => l.id === updated.location_id);
      const merged = { ...updated, location_name: loc?.name ?? null };
      setDetail(merged);
      setVaccineDates([...form.vaccination_dates].filter(Boolean).sort());
      setEditing(false);
      onSaved(merged);
      toast.success("Saved");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!animal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/animals/${animal.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Delete failed"); return; }
      toast.success(`${detail?.name ?? animal.name} deleted`);
      onDeleted?.(animal.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const lastDate = lastVaccinationDate(form?.vaccination_dates ?? vaccineDates);
  const viewStatus = getVaccineStatus(detail?.next_vaccination_date ?? null);

  const title = isAdd
    ? isDuplicate
      ? `Duplicate — ${initialDuplicate?.animal.name ?? form?.name ?? ""}`
      : "Add animal"
    : editing
      ? isDuplicate
        ? `Duplicate — ${detail?.name ?? animal?.name ?? ""}`
        : `Edit — ${detail?.name ?? animal?.name ?? ""}`
      : detail?.name ?? animal?.name ?? "";
  const description = isAdd
    ? isDuplicate
      ? "Duplicated profile — adjust before saving."
      : "Create a profile to track vaccines."
    : editing
      ? isDuplicate
        ? "Duplicated profile — adjust before saving."
        : "Update the animal's profile and vaccine history."
      : detail?.location_name ?? "No location";

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      width={620}
      footer={
        editing ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="sm" type="submit" form="animal-form" disabled={saving}>
              {saving ? "Saving…" : isDuplicate || isAdd ? "Add animal" : "Save changes"}
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          </div>
        )
      }
    >
      {editing && form ? (
        /* ── Form (add / edit) ─────────────────────────────────────────── */
        <form id="animal-form" onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Basic information */}
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", paddingBottom: "var(--s-2)", borderBottom: "1px solid var(--line)", marginBottom: "var(--s-3)" }}>Basic information</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Name <span style={{ color: "var(--bad)" }}>*</span></label>
                <input required value={form.name} onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))} style={inputStyle} placeholder="e.g. Coco" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Species <span style={{ color: "var(--bad)" }}>*</span></label>
                <input
                  list="species-list"
                  value={form.species}
                  onChange={(e) => { setForm((f) => (f ? { ...f, species: e.target.value } : f)); setFormErrors((prev) => ({ ...prev, species: undefined })); }}
                  style={{ ...inputStyle, borderColor: formErrors.species ? "var(--bad)" : undefined, textTransform: "capitalize" }}
                  placeholder="e.g. Capybara or new species"
                />
                <datalist id="species-list">
                  {speciesOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <p style={{ fontSize: 11, color: "var(--fg-4)", margin: 0 }}>Type a new species to add it — it will be reusable.</p>
                {formErrors.species && <p style={{ fontSize: 11, color: "var(--bad)", margin: 0 }}>{formErrors.species}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Sex</label>
                <select value={form.sex} onChange={(e) => setForm((f) => (f ? { ...f, sex: e.target.value as AnimalSex | "" } : f))} style={selectStyle}>
                  <option value="">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Est. birth date</label>
                <DateInput value={form.estimated_birth_date} onChange={(e: { target: { value: string } }) => setForm((f) => (f ? { ...f, estimated_birth_date: e.target.value } : f))} />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", paddingBottom: "var(--s-2)", borderBottom: "1px solid var(--line)", marginBottom: "var(--s-3)" }}>Location</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 240 }}>
              <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Location <span style={{ color: "var(--bad)" }}>*</span></label>
              <select
                value={form.location_id}
                onChange={(e) => { setForm((f) => (f ? { ...f, location_id: e.target.value } : f)); setFormErrors((prev) => ({ ...prev, location_id: undefined })); }}
                style={{ ...selectStyle, borderColor: formErrors.location_id ? "var(--bad)" : undefined }}
              >
                <option value="">— select location —</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {formErrors.location_id && <p style={{ fontSize: 11, color: "var(--bad)", margin: 0 }}>{formErrors.location_id}</p>}
            </div>
          </div>

          {/* Health & vaccines */}
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", paddingBottom: "var(--s-2)", borderBottom: "1px solid var(--line)", marginBottom: "var(--s-3)" }}>Health &amp; vaccines</p>

            {/* Vaccine history */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Vaccine history</label>
              {form.vaccination_dates.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0, fontStyle: "italic" }}>No vaccines recorded yet.</p>
              ) : (
                form.vaccination_dates.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SyringeIcon style={{ width: 14, height: 14, color: "var(--fg-4)", flexShrink: 0 }} />
                    <DateInput value={d} onChange={(e: { target: { value: string } }) => handleDateChange(i, e.target.value)} />
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(i)}
                      aria-label="Remove vaccine date"
                      style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 4, borderRadius: "var(--r-sm)", flexShrink: 0 }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = "var(--bad)")}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = "var(--fg-4)")}
                    >
                      <XIcon style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))
              )}
              <Button type="button" size="sm" variant="secondary" onClick={handleAddDate} style={{ alignSelf: "flex-start" }}>
                <PlusIcon style={{ width: 13, height: 13 }} /> Add vaccine date
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Last vaccine</label>
                <input value={fmtDate(lastDate) ?? ""} readOnly style={{ ...inputStyle, color: lastDate ? "var(--fg)" : "var(--fg-4)" }} placeholder="Auto from history" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>
                  Next vaccine {!nextOverridden && <span style={{ color: "var(--fg-4)" }}>(auto)</span>}
                </label>
                <DateInput value={form.next_vaccination_date} onChange={(e: { target: { value: string } }) => handleNextChange(e.target.value)} />
                <p style={{ fontSize: 11, color: "var(--fg-4)", margin: 0 }}>
                  Auto: {suggestNextVaccine(form.vaccination_dates) ? "1 month after the first vaccine, then 1 year after each" : "—"}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Vaccination passport</label>
                <div style={{ display: "flex", alignItems: "center", height: 32, gap: 8 }}>
                  <input
                    type="checkbox"
                    id="vacc_passport"
                    checked={form.vaccination_passport}
                    onChange={(e) => setForm((f) => (f ? { ...f, vaccination_passport: e.target.checked } : f))}
                  />
                  <label htmlFor="vacc_passport" style={{ fontSize: 13, color: "var(--fg-3)", cursor: "pointer" }}>Has passport</label>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* ── View mode ─────────────────────────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Pill tone={VACCINE_TONE[viewStatus.key]} dot>{viewStatus.label}</Pill>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={handleDuplicate}>
                <CopyIcon className="size-3.5" /> Duplicate
              </Button>
              <Button size="sm" variant="secondary" onClick={startEdit}>
                <PencilIcon className="size-3.5" /> Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <TrashIcon className="size-3.5" /> Delete
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { label: "Species", value: detail?.species, capitalize: true },
              { label: "Location", value: detail?.location_name },
              { label: "Sex", value: detail?.sex ? detail.sex.charAt(0).toUpperCase() + detail.sex.slice(1) : null, empty: "Unknown" },
              { label: "Est. birth date", value: fmtDate(detail?.estimated_birth_date) },
            ].map(({ label, value, capitalize, empty }) => (
              <div key={label} style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--bg-2)", padding: 12 }}>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 4 }}>{label}</p>
                {value ? (
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", textTransform: capitalize ? "capitalize" : undefined }}>{value}</p>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>{empty ?? "Not recorded"}</p>
                )}
              </div>
            ))}
          </div>

          {/* Vaccines */}
          <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", padding: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <ShieldCheckIcon className="size-4" style={{ color: "var(--fg-3)" }} />
              Vaccines
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 2 }}>Last vaccine</p>
                <p style={{ fontSize: 13, color: "var(--fg)" }}>
                  {fmtDate(detail?.last_vaccination_date) ?? <span style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>Not recorded</span>}
                </p>
              </div>
              <div>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 2 }}>Next vaccine</p>
                {detail?.next_vaccination_date ? (
                  <p style={{ fontSize: 13, color: "var(--fg)" }}>{fmtDate(detail.next_vaccination_date)}</p>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic" }}>No date set</p>
                )}
              </div>
              <div>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 2 }}>Passport</p>
                <p style={{ fontSize: 13, color: "var(--fg)" }}>{detail?.vaccination_passport ? "Yes" : "No"}</p>
              </div>
            </div>

            <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 8 }}>Vaccine history</p>
              {vaccineDates.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--fg-4)", fontStyle: "italic", margin: 0 }}>No vaccines recorded yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {vaccineDates.map((d) => (
                    <div key={d} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg)" }}>
                      <SyringeIcon style={{ width: 14, height: 14, color: "var(--good)", flexShrink: 0 }} />
                      {fmtDate(d)}
                      {d === lastDate && <span style={{ fontSize: 11, color: "var(--fg-4)" }}>(latest)</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--overlay-strong)", backdropFilter: "blur(2px)",
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
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Delete {detail?.name ?? ""}?</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
              This cannot be undone. The animal record and its vaccine history will be permanently removed.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => void handleDelete()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}