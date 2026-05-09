"use client";
import { useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold">Animals</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs ${view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
            >
              <ListIcon className="size-3.5" /> List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-border ${view === "calendar" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
            >
              <CalendarIcon className="size-3.5" /> Vaccines
            </button>
          </div>
          <a href="/api/animals/export" download>
            <Button size="sm" variant="outline" className="gap-1.5">
              <DownloadIcon className="size-4" />
              CSV
            </Button>
          </a>
          <a href="/api/animals/export/pdf" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5">
              <DownloadIcon className="size-4" />
              PDF
            </Button>
          </a>
          <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
            <PlusIcon className="size-4" />
            Add animal
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      {animals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Total</p>
            <p className="text-xl font-bold">{animals.length}</p>
          </div>
          <div className={`rounded-lg border p-3 ${vaccineDueCount > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-muted/30"}`}>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Vaccines due</p>
            <p className={`text-xl font-bold ${vaccineDueCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>{vaccineDueCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">No location</p>
            <p className="text-xl font-bold">{missingLocationCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {displayed.length} animal{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleAdd(e)}
          className="rounded-lg border border-border bg-muted/20 p-5 flex flex-col gap-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-semibold">Add animal</span>
              <p className="text-xs text-muted-foreground mt-0.5">Create a profile to track location, health records, vaccines, and events.</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground mt-0.5">
              <XIcon className="size-4" />
            </button>
          </div>

          {/* Basic information */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Basic information</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  placeholder="e.g. Coco"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Species <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.species}
                  onChange={(e) => { setForm((f) => ({ ...f, species: e.target.value })); setFormErrors((prev) => ({ ...prev, species: undefined })); }}
                  className={`h-8 rounded-md border bg-background px-2 text-sm ${formErrors.species ? "border-destructive" : "border-input"}`}
                >
                  <option value="">— select —</option>
                  {ANIMAL_SPECIES.map((s) => (
                    <option key={s} value={s.toLowerCase()}>{s}</option>
                  ))}
                </select>
                {formErrors.species && <p className="text-[11px] text-destructive">{formErrors.species}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Sex</label>
                <select
                  value={form.sex}
                  onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as AnimalSex | "" }))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Est. birth date</label>
                <DateInput
                  value={form.estimated_birth_date}
                  onChange={(e) => setForm((f) => ({ ...f, estimated_birth_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Location</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Location <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.location_id}
                  onChange={(e) => { setForm((f) => ({ ...f, location_id: e.target.value })); setFormErrors((prev) => ({ ...prev, location_id: undefined })); }}
                  className={`h-8 rounded-md border bg-background px-2 text-sm ${formErrors.location_id ? "border-destructive" : "border-input"}`}
                >
                  <option value="">— select location —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {formErrors.location_id && <p className="text-[11px] text-destructive">{formErrors.location_id}</p>}
              </div>
            </div>
          </div>

          {/* Health & vaccines */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Health & vaccines</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Last vaccine</label>
                <DateInput
                  value={form.last_vaccination_date}
                  onChange={(e) => setForm((f) => ({ ...f, last_vaccination_date: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Next vaccine</label>
                <DateInput
                  value={form.next_vaccination_date}
                  onChange={(e) => setForm((f) => ({ ...f, next_vaccination_date: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5 justify-end">
                <label className="text-xs font-medium text-muted-foreground">Vaccination passport</label>
                <div className="flex items-center h-8 gap-2">
                  <input
                    type="checkbox"
                    id="vacc_passport"
                    checked={form.vaccination_passport}
                    onChange={(e) => setForm((f) => ({ ...f, vaccination_passport: e.target.checked }))}
                    className="size-4 rounded"
                  />
                  <label htmlFor="vacc_passport" className="text-sm text-muted-foreground">Has passport</label>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notes</p>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
              placeholder="Optional"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-border">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Adding…" : "Add animal"}</Button>
          </div>
        </form>
      )}

      {/* Vaccines view with List / Calendar sub-toggle */}
      {view === "calendar" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setVaccineView("list")}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs ${vaccineView === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
              >
                <ListIcon className="size-3.5" /> List
              </button>
              <button
                type="button"
                onClick={() => setVaccineView("calendar")}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-border ${vaccineView === "calendar" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
              >
                <CalendarIcon className="size-3.5" /> Calendar
              </button>
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
          <div className="rounded-lg border border-border py-12 text-center text-sm text-muted-foreground">
            No animals found. Add one to get started.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Species</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sex</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayed.map((animal) => (
                  <tr
                    key={animal.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/animals/${animal.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{animal.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{animal.species}</td>
                    <td className="px-4 py-3 text-xs">
                      {animal.location_name ?? <span className="text-muted-foreground/50 italic">No location</span>}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">
                      {animal.sex ?? <span className="text-muted-foreground/50">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRightIcon className="size-4 text-muted-foreground inline" />
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
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title} ({list.length})</p>
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {list.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/10">
              <div className="flex items-center gap-3">
                <span className="font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{a.species}</span>
                {a.location_id && <span className="text-xs text-muted-foreground">{locMap[a.location_id] ?? ""}</span>}
              </div>
              <div className="flex items-center gap-2">
                {a.next_vaccination_date && (
                  <span className="text-xs text-muted-foreground">{a.next_vaccination_date}</span>
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
      <div className="rounded-lg border border-border py-12 text-center text-sm text-muted-foreground">
        No animals with vaccination data yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Overdue"
        animals={sortByDate(overdue)}
        badge={(a) => (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {Math.abs(daysUntil(a.next_vaccination_date!))}d overdue
          </span>
        )}
      />
      <Section
        title="Due within 30 days"
        animals={sortByDate(dueSoon)}
        badge={(a) => (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            in {daysUntil(a.next_vaccination_date!)}d
          </span>
        )}
      />
      <Section
        title="Upcoming"
        animals={sortByDate(upcoming)}
        badge={(a) => (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            in {daysUntil(a.next_vaccination_date!)}d
          </span>
        )}
      />
      <Section
        title="No date set"
        animals={noDate}
        badge={() => (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            —
          </span>
        )}
      />
    </div>
  );
}
