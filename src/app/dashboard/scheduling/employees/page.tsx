"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { XIcon, UserPlusIcon, Loader2Icon, PlusIcon, MinusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeForm, EMPTY_EMPLOYEE_FORM, type EmployeeFormState } from "@/modules/admin/components/EmployeeForm";
import type { Employee, AdminLocation } from "@/modules/admin/types";

export default function SchedulingEmployeesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locationId = searchParams.get("location_id") ?? "";

  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // New employee form state
  const [createForm, setCreateForm] = useState<EmployeeFormState>(EMPTY_EMPLOYEE_FORM);
  const [createLocIds, setCreateLocIds] = useState<Set<string>>(new Set());
  const [createPrimaryLoc, setCreatePrimaryLoc] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, locRes] = await Promise.all([
        fetch("/api/admin/employees", { cache: "no-store" }),
        fetch("/api/admin/locations", { cache: "no-store" }),
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

  const atLocation = allEmployees.filter((e) =>
    e.employee_locations?.some((el) => el.location_id === locationId) ||
    (e.location_id === locationId && !e.employee_locations?.length)
  );

  const notAtLocation = allEmployees.filter((e) =>
    !e.employee_locations?.some((el) => el.location_id === locationId) &&
    !(e.location_id === locationId && !e.employee_locations?.length)
  );

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
      toast.success(`${emp.first_name} ${emp.last_name} added`);
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
      toast.success(`${emp.first_name} ${emp.last_name} removed`);
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
      setShowCreate(false);
      await load();
    } finally {
      setCreateSubmitting(false);
    }
  }

  function openModal() {
    if (locationId) {
      setShowCreate(false);
      setShowModal(true);
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
            <Button size="sm" onClick={openModal} className="gap-1.5">
              <UserPlusIcon className="size-4" />
              Manage employees
            </Button>
          )}
        </div>
      </div>

      {/* Current employees table */}
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
                </tr>
              ))}
            </tbody>
          </table>
          {atLocation.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No employees at this location yet. Click "Manage employees" to assign some.
            </div>
          )}
        </div>
      )}

      {/* Manage employees modal */}
      {showModal && locationId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-xl flex flex-col gap-0 my-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold">
                Manage employees — {currentLocation?.name}
              </h2>
              <button
                type="button"
                onClick={() => { setShowModal(false); setShowCreate(false); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="flex flex-col gap-0 divide-y divide-border">
              {/* Currently at this location */}
              <div className="px-5 py-4 flex flex-col gap-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  At this location ({atLocation.length})
                </p>
                {atLocation.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No employees assigned yet.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {atLocation.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30 transition-colors">
                        <div>
                          <span className="text-sm font-medium">{emp.first_name} {emp.last_name}</span>
                          {emp.position && <span className="ml-2 text-xs text-muted-foreground">{emp.position}</span>}
                        </div>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 px-2 py-1 rounded"
                          disabled={busy === emp.id}
                          onClick={() => void removeFromLocation(emp)}
                        >
                          {busy === emp.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <MinusIcon className="size-3.5" />}
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All other employees */}
              <div className="px-5 py-4 flex flex-col gap-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Other employees ({notAtLocation.length})
                </p>
                {notAtLocation.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">All employees are already at this location.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {notAtLocation.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30 transition-colors">
                        <div>
                          <span className="text-sm font-medium">{emp.first_name} {emp.last_name}</span>
                          {emp.position && <span className="ml-2 text-xs text-muted-foreground">{emp.position}</span>}
                          {emp.employee_locations && emp.employee_locations.length > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground/60">
                              · {emp.employee_locations.map((el) => el.location_name).join(", ")}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50 px-2 py-1 rounded"
                          disabled={busy === emp.id}
                          onClick={() => void assignToLocation(emp)}
                        >
                          {busy === emp.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <PlusIcon className="size-3.5" />}
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create new employee */}
              <div className="px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Create new employee</p>
                  <button
                    type="button"
                    onClick={() => setShowCreate((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showCreate ? <XIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
                    {showCreate ? "Cancel" : "New employee"}
                  </button>
                </div>
                {showCreate && (
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
                    onCancel={() => setShowCreate(false)}
                    submitLabel="Create employee"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
