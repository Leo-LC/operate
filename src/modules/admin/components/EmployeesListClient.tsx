"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, ArchiveIcon, Trash2Icon, ArchiveRestoreIcon, Loader2Icon } from "lucide-react";
import type { Employee, AdminLocation } from "@/modules/admin/types";
import { EmployeeForm, EMPTY_EMPLOYEE_FORM, type EmployeeFormState } from "./EmployeeForm";

interface Props {
  locations: AdminLocation[];
}

type FormState = EmployeeFormState;
const EMPTY_FORM: FormState = EMPTY_EMPLOYEE_FORM;

function empToForm(emp: Employee): FormState {
  return {
    first_name: emp.first_name,
    last_name: emp.last_name,
    position: emp.position ?? "",
    nationality: emp.nationality ?? "",
    national_id: emp.national_id ?? "",
    work_permit_number: emp.work_permit_number ?? "",
    work_permit_expires_at: emp.work_permit_expires_at?.slice(0, 10) ?? "",
    email: emp.email ?? "",
    phone: emp.phone ?? "",
    notes: emp.notes ?? "",
    base_salary_monthly: emp.base_salary_monthly != null ? String(emp.base_salary_monthly) : "",
    has_thai_bank_account: emp.has_thai_bank_account ?? false,
  };
}

function WorkPermitBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const days = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  const label = days < 0 ? "Expired" : days === 0 ? "Expires today" : `${days}d left`;
  const cls =
    days > 90
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : days > 0
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      Permit · {label}
    </span>
  );
}

export function EmployeesListClient({ locations }: Props) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formLocIds, setFormLocIds] = useState<Set<string>>(new Set());
  const [formPrimaryLoc, setFormPrimaryLoc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editLocIds, setEditLocIds] = useState<Set<string>>(new Set());
  const [editPrimaryLoc, setEditPrimaryLoc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string; isArchived: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/employees", { cache: "no-store" });
      if (!res.ok) {
        toast.error("Failed to load employees");
        return;
      }
      const data: unknown = await res.json();
      if (Array.isArray(data)) setEmployees(data as Employee[]);
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchEmployees(); }, [fetchEmployees]);

  function resetAddForm() {
    setForm(EMPTY_FORM);
    setFormLocIds(new Set());
    setFormPrimaryLoc("");
    setShowAdd(false);
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditForm(empToForm(emp));
    const locIds = new Set((emp.employee_locations ?? []).map((el) => el.location_id));
    setEditLocIds(locIds);
    const primary = emp.employee_locations?.find((el) => el.is_primary)?.location_id ?? emp.location_id ?? "";
    setEditPrimaryLoc(primary);
  }

  function toggleLoc(set: Set<string>, setter: (s: Set<string>) => void, primarySetter: (s: string) => void, id: string, currentPrimary: string) {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
      if (currentPrimary === id) primarySetter(next.values().next().value ?? "");
    } else {
      next.add(id);
      if (!currentPrimary) primarySetter(id);
    }
    setter(next);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          position: form.position || undefined,
          nationality: form.nationality || undefined,
          national_id: form.national_id || undefined,
          work_permit_number: form.work_permit_number || undefined,
          work_permit_expires_at: form.work_permit_expires_at || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
          base_salary_monthly: form.base_salary_monthly ? parseFloat(form.base_salary_monthly) : undefined,
          has_thai_bank_account: form.has_thai_bank_account,
          location_ids: Array.from(formLocIds),
          primary_location_id: formPrimaryLoc || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to add employee");
        return;
      }
      resetAddForm();
      await fetchEmployees();
      router.refresh();
      toast.success("Employee added");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/employees/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          position: editForm.position || null,
          nationality: editForm.nationality || null,
          national_id: editForm.national_id || null,
          work_permit_number: editForm.work_permit_number || null,
          work_permit_expires_at: editForm.work_permit_expires_at || null,
          email: editForm.email || null,
          phone: editForm.phone || null,
          notes: editForm.notes || null,
          base_salary_monthly: editForm.base_salary_monthly ? parseFloat(editForm.base_salary_monthly) : null,
          has_thai_bank_account: editForm.has_thai_bank_account,
          location_ids: Array.from(editLocIds),
          primary_location_id: editPrimaryLoc || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to update employee");
        return;
      }
      setEditingId(null);
      await fetchEmployees();
      router.refresh();
      toast.success("Employee updated");
    } finally {
      setSubmitting(false);
    }
  }

  async function executeArchiveToggle() {
    if (!archiveTarget) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/employees/${archiveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archived_at: archiveTarget.isArchived ? null : new Date().toISOString(),
          active: archiveTarget.isArchived,
        }),
      });
      if (!res.ok) { toast.error("Failed to update employee"); return; }
      setArchiveTarget(null);
      await fetchEmployees();
      router.refresh();
      toast.success(archiveTarget.isArchived ? "Employee unarchived" : "Employee archived");
    } finally {
      setActionBusy(false);
    }
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/employees/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete employee"); return; }
      setDeleteTarget(null);
      await fetchEmployees();
      router.refresh();
      toast.success("Employee deleted");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Employees</h1>
        <Button size="sm" onClick={() => { setShowAdd((v) => !v); setEditingId(null); }} className="gap-1.5">
          <PlusIcon className="size-4" />
          Add employee
        </Button>
      </div>

      {showAdd && (
        <EmployeeForm
          form={form}
          locIds={formLocIds}
          primaryLoc={formPrimaryLoc}
          locations={locations}
          submitting={submitting}
          onChange={(key, val) => setForm((prev) => ({ ...prev, [key]: val }))}
          onToggleLoc={(id) => toggleLoc(formLocIds, setFormLocIds, setFormPrimaryLoc, id, formPrimaryLoc)}
          onSetPrimary={setFormPrimaryLoc}
          onSubmit={(e) => void handleAdd(e)}
          onCancel={resetAddForm}
          submitLabel="Add employee"
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin mr-2" />
          Loading…
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Position</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nationality</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Work Permit</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Locations</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((emp) =>
                editingId === emp.id ? (
                  <tr key={emp.id}>
                    <td colSpan={7} className="px-4 py-3">
                      <EmployeeForm
                        form={editForm}
                        locIds={editLocIds}
                        primaryLoc={editPrimaryLoc}
                        locations={locations}
                        submitting={submitting}
                        onChange={(key, val) => setEditForm((prev) => ({ ...prev, [key]: val }))}
                        onToggleLoc={(id) => toggleLoc(editLocIds, setEditLocIds, setEditPrimaryLoc, id, editPrimaryLoc)}
                        onSetPrimary={setEditPrimaryLoc}
                        onSubmit={(e) => void handleEdit(e)}
                        onCancel={() => setEditingId(null)}
                        submitLabel="Save"
                      />
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={emp.id}
                    className={`transition-colors ${emp.archived_at ? "opacity-60 bg-muted/10" : "hover:bg-muted/20 cursor-pointer"}`}
                    onClick={() => { if (!emp.archived_at) startEdit(emp); }}
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {emp.first_name} {emp.last_name}
                      {emp.archived_at && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Archived</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{emp.position ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{emp.nationality ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {emp.work_permit_expires_at
                        ? <WorkPermitBadge expiresAt={emp.work_permit_expires_at} />
                        : <span className="text-muted-foreground/50">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {(emp.employee_locations && emp.employee_locations.length > 0)
                        ? emp.employee_locations.map((el) => (
                            <span key={el.location_id} className="inline-block mr-1">
                              {el.location_name}{el.is_primary ? " ★" : ""}
                            </span>
                          ))
                        : (emp.location_name ?? <span className="text-muted-foreground/50">—</span>)
                      }
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {emp.email && <div>{emp.email}</div>}
                      {emp.phone && <div>{emp.phone}</div>}
                      {!emp.email && !emp.phone && "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => startEdit(emp)} title="Edit">
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          title={emp.archived_at ? "Unarchive" : "Archive"}
                          onClick={() => setArchiveTarget({ id: emp.id, name: `${emp.first_name} ${emp.last_name}`, isArchived: !!emp.archived_at })}
                        >
                          {emp.archived_at ? <ArchiveRestoreIcon className="size-3.5" /> : <ArchiveIcon className="size-3.5" />}
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="size-7 text-destructive hover:text-destructive"
                          title="Delete permanently"
                          onClick={() => setDeleteTarget({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` })}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {employees.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No employees yet.</div>
          )}
        </div>
      )}

      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="text-base font-semibold mb-1">
              {archiveTarget.isArchived ? "Unarchive" : "Archive"} employee
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {archiveTarget.isArchived
                ? <>Restore <span className="font-medium text-foreground">{archiveTarget.name}</span> to active status?</>
                : <>Archive <span className="font-medium text-foreground">{archiveTarget.name}</span>? They will be hidden from scheduling but their record will be kept.</>
              }
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setArchiveTarget(null)} disabled={actionBusy}>Cancel</Button>
              <Button size="sm" onClick={() => void executeArchiveToggle()} disabled={actionBusy}>
                {actionBusy ? "Saving…" : archiveTarget.isArchived ? "Unarchive" : "Archive"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="text-base font-semibold mb-1">Delete employee</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Permanently delete <span className="font-medium text-foreground">{deleteTarget.name}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={actionBusy}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => void executeDelete()} disabled={actionBusy}>
                {actionBusy ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
