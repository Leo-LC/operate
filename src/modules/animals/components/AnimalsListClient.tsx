"use client";
import React, { useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { PlusIcon, ChevronRightIcon, XIcon, DownloadIcon, ListIcon, CalendarIcon } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import {
  type Animal,
  type AnimalSex,
  ANIMAL_SPECIES,
} from "@/modules/animals/types";
import { VaccinationCalendar } from "@/modules/animals/components/VaccinationCalendar";
import type { AdminLocation } from "@/modules/admin/types";

interface FormState {
  name: string;
  species: string;
  sex: AnimalSex | "";
  location_id: string;
  estimated_birth_date: string;
  notes: string;
  last_vaccination_date: string;
  next_vaccination_date: string;
  vaccination_passport: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  species: "",
  sex: "",
  location_id: "",
  estimated_birth_date: "",
  notes: "",
  last_vaccination_date: "",
  next_vaccination_date: "",
  vaccination_passport: false,
};

interface AnimalsListClientProps {
  initialAnimals: Animal[];
  locations: AdminLocation[];
}

export function AnimalsListClient({ initialAnimals, locations }: AnimalsListClientProps) {
  const router = useRouter();
  const [animals, setAnimals] = useState(initialAnimals);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [vaccineView, setVaccineView] = useState<"list" | "calendar">("list");
  const [locationFilter, setLocationFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{ species?: string; location_id?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const displayed = useMemo(() => {
    return animals.filter((a) => {
      if (locationFilter && a.location_id !== locationFilter) return false;
      return true;
    });
  }, [animals, locationFilter]);

  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const vaccineDueCount = animals.filter((a) => a.next_vaccination_date && a.next_vaccination_date <= in30).length;
  const missingLocationCount = animals.filter((a) => !a.location_id).length;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const errors: { species?: string; location_id?: string } = {};
    if (!form.species) errors.species = "Species is required";
    if (!form.location_id) errors.location_id = "Location is required";
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          species: form.species,
          sex: form.sex || null,
          status: "active",
          location_id: form.location_id || null,
          estimated_birth_date: form.estimated_birth_date || null,
          notes: form.notes || null,
          last_vaccination_date: form.last_vaccination_date || null,
          next_vaccination_date: form.next_vaccination_date || null,
          vaccination_passport: form.vaccination_passport,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to add animal");
        return;
      }
      const created = await res.json() as Animal;
      const loc = locations.find((l) => l.id === created.location_id);
      setAnimals((prev) => [...prev, { ...created, location_name: loc?.name ?? null }]);
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success(`${created.name} added`);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
    background: "var(--bg)", padding: "0 var(--s-3)", fontSize: 13,
    color: "var(--fg)", outline: "none", width: "100%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      <PageHeader
        eyebrow="Health & welfare"
        title="Animals"
        subtitle="Track location, health records, vaccines, and events."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            <div style={{ display: "flex", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", overflow: "hidden" }}>
              {(["list", "calendar"] as const).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "0 var(--s-3)", height: 32, fontSize: 12, cursor: "pointer", border: "none",
                    borderLeft: i > 0 ? "1px solid var(--line)" : "none",
                    background: view === v ? "var(--row-active)" : "var(--bg)",
                    color: view === v ? "var(--fg)" : "var(--fg-4)",
                    transition: "background var(--dur) var(--ease)",
                  }}
                >
                  {v === "list" ? <ListIcon style={{ width: 13, height: 13 }} /> : <CalendarIcon style={{ width: 13, height: 13 }} />}
                  {v === "list" ? "List" : "Vaccines"}
                </button>
              ))}
            </div>
            <a href="/api/animals/export" download style={{ textDecoration: "none" }}>
              <Button size="sm" variant="secondary"><DownloadIcon style={{ width: 13, height: 13 }} /> CSV</Button>
            </a>
            <a href="/api/animals/export/pdf" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Button size="sm" variant="secondary"><DownloadIcon style={{ width: 13, height: 13 }} /> PDF</Button>
            </a>
            <Button size="sm" variant="primary" onClick={() => setShowForm((v) => !v)}>
              <PlusIcon style={{ width: 13, height: 13 }} /> Add animal
            </Button>
          </div>
        }
      />

      {/* Summary stats */}
      {animals.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: "var(--s-3) var(--s-4)" }}>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 4 }}>Total</p>
            <p className="mono" style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{animals.length}</p>
          </div>
          <div
            style={{
              borderRadius: "var(--r-lg)",
              border: `1px solid ${vaccineDueCount > 0 ? "var(--warn)" : "var(--line)"}`,
              background: vaccineDueCount > 0 ? "var(--warn-soft)" : "var(--surface)",
              padding: "var(--s-3) var(--s-4)",
            }}
          >
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 4 }}>Vaccines due</p>
            <p className="mono" style={{ fontSize: 20, fontWeight: 700, color: vaccineDueCount > 0 ? "var(--warn)" : "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{vaccineDueCount}</p>
          </div>
          <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: "var(--s-3) var(--s-4)" }}>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 4 }}>No location</p>
            <p className="mono" style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{missingLocationCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--s-2)" }}>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--fg-4)" }}>
          {displayed.length} animal{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleAdd(e)}
          style={{
            borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
            background: "var(--surface)", padding: "var(--s-5)",
            display: "flex", flexDirection: "column", gap: "var(--s-5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Add animal</span>
              <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2, marginBottom: 0 }}>
                Create a profile to track location, health records, vaccines, and events.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", marginTop: 2 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
            >
              <XIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Basic information */}
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", paddingBottom: "var(--s-2)", borderBottom: "1px solid var(--line)", marginBottom: "var(--s-3)" }}>Basic information</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "var(--s-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Name <span style={{ color: "var(--bad)" }}>*</span></label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="e.g. Coco" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Species <span style={{ color: "var(--bad)" }}>*</span></label>
                <select
                  value={form.species}
                  onChange={(e) => { setForm((f) => ({ ...f, species: e.target.value })); setFormErrors((prev) => ({ ...prev, species: undefined })); }}
                  style={{ ...inputStyle, borderColor: formErrors.species ? "var(--bad)" : "var(--line)" }}
                >
                  <option value="">— select —</option>
                  {ANIMAL_SPECIES.map((s) => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                </select>
                {formErrors.species && <p style={{ fontSize: 11, color: "var(--bad)", margin: 0 }}>{formErrors.species}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Sex</label>
                <select value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as AnimalSex | "" }))} style={inputStyle}>
                  <option value="">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Est. birth date</label>
                <DateInput value={form.estimated_birth_date} onChange={(e) => setForm((f) => ({ ...f, estimated_birth_date: e.target.value }))} />
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
                onChange={(e) => { setForm((f) => ({ ...f, location_id: e.target.value })); setFormErrors((prev) => ({ ...prev, location_id: undefined })); }}
                style={{ ...inputStyle, borderColor: formErrors.location_id ? "var(--bad)" : "var(--line)" }}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--s-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Last vaccine</label>
                <DateInput value={form.last_vaccination_date} onChange={(e) => setForm((f) => ({ ...f, last_vaccination_date: e.target.value }))} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Next vaccine</label>
                <DateInput value={form.next_vaccination_date} onChange={(e) => setForm((f) => ({ ...f, next_vaccination_date: e.target.value }))} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "flex-end" }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Vaccination passport</label>
                <div style={{ display: "flex", alignItems: "center", height: 32, gap: 8 }}>
                  <input
                    type="checkbox"
                    id="vacc_passport"
                    checked={form.vaccination_passport}
                    onChange={(e) => setForm((f) => ({ ...f, vaccination_passport: e.target.checked }))}
                  />
                  <label htmlFor="vacc_passport" style={{ fontSize: 13, color: "var(--fg-3)", cursor: "pointer" }}>Has passport</label>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", paddingBottom: "var(--s-2)", borderBottom: "1px solid var(--line)", marginBottom: "var(--s-3)" }}>Notes</p>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ width: "100%", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", padding: "var(--s-2) var(--s-3)", fontSize: 13, color: "var(--fg)", outline: "none", resize: "none", boxSizing: "border-box" }}
              placeholder="Optional"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--s-2)", paddingTop: "var(--s-3)", borderTop: "1px solid var(--line)" }}>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" variant="primary" disabled={submitting}>{submitting ? "Adding…" : "Add animal"}</Button>
          </div>
        </form>
      )}

      {/* Vaccines view with List / Calendar sub-toggle */}
      {view === "calendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            <div style={{ display: "flex", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", overflow: "hidden" }}>
              {(["list", "calendar"] as const).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVaccineView(v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "0 var(--s-3)", height: 28, fontSize: 12, cursor: "pointer", border: "none",
                    borderLeft: i > 0 ? "1px solid var(--line)" : "none",
                    background: vaccineView === v ? "var(--row-active)" : "var(--bg)",
                    color: vaccineView === v ? "var(--fg)" : "var(--fg-4)",
                  }}
                >
                  {v === "list" ? <ListIcon style={{ width: 12, height: 12 }} /> : <CalendarIcon style={{ width: 12, height: 12 }} />}
                  {v === "list" ? "List" : "Calendar"}
                </button>
              ))}
            </div>
          </div>
          {vaccineView === "list"
            ? <VaccinationUrgencyList animals={displayed} locations={locations} />
            : <VaccinationCalendar animals={displayed} />}
        </div>
      )}

      {/* List */}
      {view === "list" && (
        displayed.length === 0 ? (
          <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", padding: "48px var(--s-5)", textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
            No animals found — add one to get started.
          </div>
        ) : (
          <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
                  {["Name", "Species", "Location", "Sex", ""].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "10px var(--s-5)", textAlign: "left",
                        color: "var(--fg-3)", fontWeight: 500, fontSize: 12,
                        width: i === 4 ? 40 : undefined,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((animal, idx) => (
                  <tr
                    key={animal.id}
                    style={{ borderTop: idx > 0 ? "1px solid var(--line)" : undefined, cursor: "pointer" }}
                    onClick={() => router.push(`/dashboard/animals/${animal.id}`)}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                  >
                    <td style={{ padding: "12px var(--s-5)", fontWeight: 500 }}>{animal.name}</td>
                    <td style={{ padding: "12px var(--s-5)", color: "var(--fg-3)", fontSize: 12, textTransform: "capitalize" }}>{animal.species}</td>
                    <td style={{ padding: "12px var(--s-5)", fontSize: 12 }}>
                      {animal.location_name ?? <span style={{ color: "var(--fg-mute)", fontStyle: "italic" }}>No location</span>}
                    </td>
                    <td style={{ padding: "12px var(--s-5)", fontSize: 12, textTransform: "capitalize" }}>
                      {animal.sex ?? <span style={{ color: "var(--fg-mute)" }}>Unknown</span>}
                    </td>
                    <td style={{ padding: "12px var(--s-5)", textAlign: "right" }}>
                      <ChevronRightIcon style={{ width: 14, height: 14, color: "var(--fg-4)", display: "inline" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function VaccinationUrgencyList({ animals, locations }: { animals: Animal[]; locations: AdminLocation[] }) {
  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  const overdue: Animal[] = [];
  const dueSoon: Animal[] = [];
  const upcoming: Animal[] = [];
  const noDate: Animal[] = [];

  for (const a of animals) {
    if (!a.next_vaccination_date) { noDate.push(a); continue; }
    if (a.next_vaccination_date < today) { overdue.push(a); continue; }
    if (a.next_vaccination_date <= in30) { dueSoon.push(a); continue; }
    upcoming.push(a);
  }

  const sortByDate = (arr: Animal[]) =>
    [...arr].sort((a, b) => (a.next_vaccination_date ?? "").localeCompare(b.next_vaccination_date ?? ""));

  function daysUntil(dateStr: string) {
    const diff = Math.round((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
    return diff;
  }

  function Section({ title, animals: list, badge }: { title: string; animals: Animal[]; badge: (a: Animal) => ReactNode }) {
    if (list.length === 0) return null;
    return (
      <div>
        <p className="eyebrow mb-2" style={{ color: "var(--fg-4)" }}>{title} ({list.length})</p>
        <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", overflow: "hidden" }}>
          {list.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                fontSize: 13,
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
                background: "var(--surface)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 500, color: "var(--fg)" }}>{a.name}</span>
                <span style={{ fontSize: 12, color: "var(--fg-3)", textTransform: "capitalize" }}>{a.species}</span>
                {a.location_id && <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{locMap[a.location_id] ?? ""}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {a.next_vaccination_date && (
                  <span className="mono" style={{ fontSize: 12, color: "var(--fg-4)" }}>{a.next_vaccination_date}</span>
                )}
                {badge(a)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (overdue.length === 0 && dueSoon.length === 0 && upcoming.length === 0 && noDate.length === 0) {
    return (
      <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>
        No animals with vaccination data yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section
        title="Overdue"
        animals={sortByDate(overdue)}
        badge={(a) => (
          <Pill tone="bad" size="sm">{Math.abs(daysUntil(a.next_vaccination_date!))}d overdue</Pill>
        )}
      />
      <Section
        title="Due within 30 days"
        animals={sortByDate(dueSoon)}
        badge={(a) => (
          <Pill tone="warn" size="sm">in {daysUntil(a.next_vaccination_date!)}d</Pill>
        )}
      />
      <Section
        title="Upcoming"
        animals={sortByDate(upcoming)}
        badge={(a) => (
          <Pill tone="good" size="sm">in {daysUntil(a.next_vaccination_date!)}d</Pill>
        )}
      />
      <Section
        title="No date set"
        animals={noDate}
        badge={() => (
          <Pill tone="neutral" size="sm">—</Pill>
        )}
      />
    </div>
  );
}
