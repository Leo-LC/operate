"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, XIcon, UserPlusIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeForm, EMPTY_EMPLOYEE_FORM, type EmployeeFormState } from "@/modules/admin/components/EmployeeForm";
import type { Employee, AdminLocation } from "@/modules/admin/types";

type Panel = "none" | "browse" | "create";

export default function SchedulingEmployeesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locationId = searchParams.get("location_id") ?? "";

  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>("none");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // employee id being processed

  // New employee form state
  const [createForm, setCreateForm] = useState<EmployeeFormState>(EMPTY_EMPLOYEE_FORM);
  const [createLocIds, setCreateLocIds] = useState<Set<string>>(new Set());
  const [createPrimaryLoc, setCreatePrimaryLoc] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, locRes] = await Promise.all([
        fetch("/api/admin/employees"),
        fetch("/api/admin/locations"),
      ]);
      const empData = await empRes.json();
      const locData = await locRes.json();
      setAllEmployees(Array.isArray(empData) ? empData : []);
      setLocations(Array.isArray(locData) ? locData : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Pre-select current location in create form when panel opens
  useEffect(() => {
    if (panel === "create" && locationId) {
      setCreateLocIds(new Set([locationId]));
      setCreatePrimaryLoc(locationId);
    }
  }, [panel, locationId]);

  const atLocation = allEmployees.filter((e) =>
    e.employee_locations?.some((el) => el.location_id === locationId) ||
    (e.location_id === locationId && !e.employee_locations?.length)
  );

  const notAtLocation = allEmployees.filter((e) =>
    !e.employee_locations?.some((el) => el.location_id === locationId) &&
    !(e.location_id === locationId && !e.employee_locations?.length)
  );

  const filtered = notAtLocation.filter((e) => {
    const q = search.toLowerCase();
    return !q || `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) || (e.position ?? "").toLowerCase().includes(q);
  });

  async function assignToLocation(emp: Employee) {
    if (!locationId) { toast.error("Select a location first"); return; }
    setBusy(emp.id);
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/assign-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to add employee");
        return;
      }
      toast.success(`${emp.first_name} ${emp.last_name} added to this location`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function removeFromLocation(emp: Employee) {
    if (!locationId) return;
    setBusy(emp.id);
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/assign-location?location_id=${encodeURIComponent(locationId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to remove employee");
        return;
      }
      toast.success(`${emp.first_name} ${emp.last_name} removed from this location`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  function toggleCreateLoc(id: string) {
    setCreateLocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (createPrimaryLoc === id) setCreatePrimaryLoc(next.values().next().value ?? "");
      } else {
        next.add(id);
        if (!createPrimaryLoc) setCreatePrimaryLoc(id);
      }
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: createForm.first_name,
          last_name: createForm.last_name,
          position: createForm.position || undefined,
          nationality: createForm.nationality || undefined,
          national_id: createForm.national_id || undefined,
          work_permit_number: createForm.work_permit_number || undefined,
          work_permit_expires_at: createForm.work_permit_expires_at || undefined,
          email: createForm.email || undefined,
          phone: createForm.phone || undefined,
          notes: createForm.notes || undefined,
          location_ids: Array.from(createLocIds),
          primary_location_id: createPrimaryLoc || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to create employee");
        return;
      }
      toast.success("Employee created");
      setCreateForm(EMPTY_EMPLOYEE_FORM);
      setCreateLocIds(new Set());
      setCreatePrimaryLoc("");
      setPanel("none");
      await load();
    } finally {
      setCreateSubmitting(false);
    }
  }

  const currentLocation = locations.find((l) => l.id === locationId);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentLocation ? `Staff at ${currentLocation.name}` : "Select a location to manage employees"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={locationId}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("location_id", e.target.value);
              router.replace(`?${params.toString()}`);
            }}
            className="h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm"
          >
            <option value="">— Select location —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {locationId && (
            <Button size="sm" onClick={() => setPanel(panel === "none" ? "browse" : "none")} className="gap-1.5">
              <UserPlusIcon className="size-4" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Add employee panel */}
      {panel !== "none" && locationId && (
        <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-md border border-border overflow-hidden text-xs w-fit">
              {(["browse", "create"] as const).map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPanel(p)}
                  className={`px-4 py-1.5 ${i > 0 ? "border-l border-border" : ""} ${
                    panel === p ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {p === "browse" ? "Browse existing" : "Create new"}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPanel("none")} className="text-muted-foreground hover:text-foreground">
              <XIcon className="size-4" />
            </button>
          </div>

          {panel === "browse" && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Search by name or position…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 text-sm max-w-sm"
              />
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {notAtLocation.length === 0 ? "All employees are already at this location." : "No employees match your search."}
                </p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Position</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Current locations</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((emp) => (
                        <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium">
                            {emp.first_name} {emp.last_name}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{emp.position ?? "—"}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">
                            {emp.employee_locations && emp.employee_locations.length > 0
                              ? emp.employee_locations.map((el) => el.location_name).join(", ")
                              : (emp.location_id ? "—" : "None")}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              disabled={busy === emp.id}
                              onClick={() => void assignToLocation(emp)}
                            >
                              {busy === emp.id ? <Loader2Icon className="size-3 animate-spin" /> : <PlusIcon className="size-3" />}
                              Add to this location
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {panel === "create" && (
            <EmployeeForm
              form={createForm}
              locIds={createLocIds}
              primaryLoc={createPrimaryLoc}
              locations={locations}
              submitting={createSubmitting}
              onChange={(key, val) => setCreateForm((prev) => ({ ...prev, [key]: val }))}
              onToggleLoc={toggleCreateLoc}
              onSetPrimary={setCreatePrimaryLoc}
              onSubmit={(e) => void handleCreate(e)}
              onCancel={() => setPanel("none")}
              submitLabel="Create employee"
            />
          )}
        </div>
      )}

      {/* Employees at this location */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin mr-2" />
          Loading…
        </div>
      ) : !locationId ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Select a location above to see its employees.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Position</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {atLocation.map((emp) => (
                <tr key={emp.id} className={`transition-colors ${emp.archived_at ? "opacity-60 bg-muted/10" : "hover:bg-muted/20"}`}>
                  <td className="px-4 py-2.5 font-medium">
                    {emp.first_name} {emp.last_name}
                    {emp.archived_at && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Archived</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{emp.position ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {emp.email && <div>{emp.email}</div>}
                    {emp.phone && <div>{emp.phone}</div>}
                    {!emp.email && !emp.phone && "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      disabled={busy === emp.id}
                      onClick={() => void removeFromLocation(emp)}
                      title="Remove from this location"
                    >
                      {busy === emp.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <XIcon className="size-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {atLocation.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No employees at this location yet. Use "Add Employee" to assign some.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
