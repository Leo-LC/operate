"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, ChevronRightIcon, XIcon } from "lucide-react";
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  type Animal,
  type AnimalStatus,
  type AnimalSex,
} from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";

const ALL_STATUSES: AnimalStatus[] = [
  "active", "observation", "quarantine", "sick", "transferred", "retired", "deceased", "archived",
];

interface FormState {
  name: string;
  species: string;
  sex: AnimalSex | "";
  status: AnimalStatus;
  location_id: string;
  estimated_birth_date: string;
  arrival_date: string;
  microchip_id: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  species: "capybara",
  sex: "",
  status: "active",
  location_id: "",
  estimated_birth_date: "",
  arrival_date: "",
  microchip_id: "",
  notes: "",
};

interface AnimalsListClientProps {
  initialAnimals: Animal[];
  locations: AdminLocation[];
}

export function AnimalsListClient({ initialAnimals, locations }: AnimalsListClientProps) {
  const router = useRouter();
  const [animals, setAnimals] = useState(initialAnimals);
  const [statusFilter, setStatusFilter] = useState<"" | AnimalStatus>("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const displayed = useMemo(() => {
    return animals.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (locationFilter && a.location_id !== locationFilter) return false;
      return true;
    });
  }, [animals, statusFilter, locationFilter]);

  const urgentCount = useMemo(() =>
    animals.filter((a) => a.status === "sick" || a.status === "quarantine").length,
  [animals]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          species: form.species || "capybara",
          sex: form.sex || null,
          status: form.status,
          location_id: form.location_id || null,
          estimated_birth_date: form.estimated_birth_date || null,
          arrival_date: form.arrival_date || null,
          microchip_id: form.microchip_id || null,
          notes: form.notes || null,
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
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold">Animals</h1>
          {urgentCount > 0 && (
            <p className="text-xs text-[var(--destructive)] font-medium">
              {urgentCount} animal{urgentCount !== 1 ? "s" : ""} need attention
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
          <PlusIcon className="size-4" />
          Add animal
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | AnimalStatus)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
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
          className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Add animal</span>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" placeholder="e.g. Coco" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Species</label>
              <input value={form.species} onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" placeholder="capybara" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Sex</label>
              <select value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as AnimalSex | "" }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AnimalStatus }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <select value={form.location_id} onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">No location</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Arrival date</label>
              <input type="date" value={form.arrival_date} onChange={(e) => setForm((f) => ({ ...f, arrival_date: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Est. birth date</label>
              <input type="date" value={form.estimated_birth_date} onChange={(e) => setForm((f) => ({ ...f, estimated_birth_date: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Microchip / ID</label>
              <input value={form.microchip_id} onChange={(e) => setForm((f) => ({ ...f, microchip_id: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm" placeholder="Optional" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none" placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Adding…" : "Add animal"}</Button>
          </div>
        </form>
      )}

      {/* List */}
      {displayed.length === 0 ? (
        <div className="rounded-lg border border-border py-12 text-center text-sm text-muted-foreground">
          No animals found. Add one to get started.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Species</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Sex</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map((animal) => (
                <tr
                  key={animal.id}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/animals/${animal.id}`)}
                >
                  <td className="px-4 py-2.5 font-medium">{animal.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs capitalize">{animal.species}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[animal.status]}`}>
                      {STATUS_LABELS[animal.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {animal.location_name ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs capitalize">
                    {animal.sex ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ChevronRightIcon className="size-4 text-muted-foreground inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
