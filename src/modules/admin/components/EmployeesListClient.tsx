"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { PageHeader } from "@/components/ui/page-header";
import { PlusIcon, PencilIcon, ArchiveIcon, Trash2Icon, ArchiveRestoreIcon, Loader2Icon } from "lucide-react";
import type { Employee, AdminLocation } from "@/modules/admin/types";
import { EMPTY_EMPLOYEE_FORM, type EmployeeFormState } from "./EmployeeForm";

interface Props {
  locations: AdminLocation[];
}

type FormState = EmployeeFormState;
const EMPTY_FORM: FormState = EMPTY_EMPLOYEE_FORM;

const MODAL_BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
  padding: "0 16px",
};

const MODAL_PANEL: React.CSSProperties = {
  width: "100%", maxWidth: 400,
  borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
  background: "var(--surface)", padding: 24,
  boxShadow: "var(--shadow-2)",
};

const SIMPLE_INPUT: React.CSSProperties = {
  height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)",
  background: "var(--bg)", color: "var(--fg)", padding: "0 10px", fontSize: 13, width: "100%",
};

function SimpleEmployeeForm({ form, locIds, primaryLoc, locations, submitting, onChange, onToggleLoc, onSetPrimary, onSubmit, onCancel, submitLabel }: {
  form: FormState; locIds: Set<string>; primaryLoc: string; locations: AdminLocation[]; submitting: boolean;
  onChange: (key: keyof FormState, value: string | boolean) => void; onToggleLoc: (id: string) => void;
  onSetPrimary: (id: string) => void; onSubmit: (event: React.FormEvent) => void; onCancel: () => void; submitLabel: string;
}) {
  return <form onSubmit={onSubmit} style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
    <label style={{ display: "flex", flexDirection: "column", gap: 5, maxWidth: 360, fontSize: 12, color: "var(--fg-3)" }}>First name
      <input autoFocus required value={form.first_name} onChange={(event) => onChange("first_name", event.target.value)} style={SIMPLE_INPUT} placeholder="First name" />
    </label>
    <div><span style={{ display: "block", marginBottom: 7, fontSize: 12, color: "var(--fg-3)" }}>Shop</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {locations.map((location) => {
        const selected = locIds.has(location.id);
        return <button key={location.id} type="button" onClick={() => { onToggleLoc(location.id); if (!selected) onSetPrimary(location.id); }} aria-pressed={selected} style={{ padding: "7px 11px", borderRadius: "var(--r-sm)", border: `1px solid ${selected ? "var(--bronze)" : "var(--line)"}`, background: selected ? "var(--bronze-soft)" : "var(--bg)", color: selected ? "var(--bronze)" : "var(--fg-3)", fontSize: 12, cursor: "pointer" }}>{location.name}{primaryLoc === location.id && selected ? " · primary" : ""}</button>;
      })}
    </div></div>
    <div style={{ display: "flex", gap: 8 }}><Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving…" : submitLabel}</Button><Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={submitting}>Cancel</Button></div>
  </form>;
}

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
    credit_note: emp.credit_note ?? "",
    service_charge_pct: emp.service_charge_pct != null ? String(emp.service_charge_pct) : "",
    employment_start_date: emp.employment_start_date?.slice(0, 10) ?? "",
    employment_end_date: emp.employment_end_date?.slice(0, 10) ?? "",
    service_charge_eligible: emp.service_charge_eligible ?? true,
  };
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
      if (!res.ok) { toast.error("Failed to load employees"); return; }
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

  function toggleLoc(set: Set<string>, setter: (s: Set<string>) => void, primarySetter: (s: string) => void, id: string) {
    const next = set.has(id) ? new Set<string>() : new Set([id]);
    primarySetter(next.has(id) ? id : "");
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
          last_name: "",
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Employees"
        actions={
          <Button size="sm" onClick={() => { setShowAdd((v) => !v); setEditingId(null); }}>
            <PlusIcon className="size-4" />
            Add employee
          </Button>
        }
      />

      {showAdd && (
        <SimpleEmployeeForm
          form={form}
          locIds={formLocIds}
          primaryLoc={formPrimaryLoc}
          locations={locations}
          submitting={submitting}
          onChange={(key, val) => setForm((prev) => ({ ...prev, [key]: val }))}
          onToggleLoc={(id) => toggleLoc(formLocIds, setFormLocIds, setFormPrimaryLoc, id)}
          onSetPrimary={setFormPrimaryLoc}
          onSubmit={(e) => void handleAdd(e)}
          onCancel={resetAddForm}
          submitLabel="Add employee"
        />
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", fontSize: 13, color: "var(--fg-4)", gap: 8 }}>
          <Loader2Icon className="size-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg-2)" }}>
              <tr>
                {["First name", "Shop", ""].map((h) => (
                  <th key={h} className="eyebrow" style={{ padding: "10px 16px", textAlign: "left", color: "var(--fg-4)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) =>
                editingId === emp.id ? (
                  <tr key={emp.id}>
                    <td colSpan={3} style={{ padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
                      <SimpleEmployeeForm
                        form={editForm}
                        locIds={editLocIds}
                        primaryLoc={editPrimaryLoc}
                        locations={locations}
                        submitting={submitting}
                        onChange={(key, val) => setEditForm((prev) => ({ ...prev, [key]: val }))}
                        onToggleLoc={(id) => toggleLoc(editLocIds, setEditLocIds, setEditPrimaryLoc, id)}
                        onSetPrimary={setEditPrimaryLoc}
                        onSubmit={(e) => void handleEdit(e)}
                        onCancel={() => setEditingId(null)}
                        submitLabel="Save"
                      />
                    </td>
                  </tr>
                ) : (
                  <EmployeeRow
                    key={emp.id}
                    emp={emp}
                    onEdit={() => { if (!emp.archived_at) startEdit(emp); }}
                    onArchive={() => setArchiveTarget({ id: emp.id, name: emp.first_name, isArchived: !!emp.archived_at })}
                    onDelete={() => setDeleteTarget({ id: emp.id, name: emp.first_name })}
                  />
                )
              )}
            </tbody>
          </table>
          {employees.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>No employees yet.</div>
          )}
        </div>
      )}

      {archiveTarget && (
        <div style={MODAL_BACKDROP} onClick={(e) => { if (e.target === e.currentTarget) setArchiveTarget(null); }}>
          <div style={MODAL_PANEL}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>
              {archiveTarget.isArchived ? "Unarchive" : "Archive"} employee
            </h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
              {archiveTarget.isArchived
                ? <>Restore <strong style={{ color: "var(--fg)" }}>{archiveTarget.name}</strong> to active status?</>
                : <>Archive <strong style={{ color: "var(--fg)" }}>{archiveTarget.name}</strong>? They will be hidden from scheduling but their record will be kept.</>
              }
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setArchiveTarget(null)} disabled={actionBusy}>Cancel</Button>
              <Button size="sm" onClick={() => void executeArchiveToggle()} disabled={actionBusy}>
                {actionBusy ? "Saving…" : archiveTarget.isArchived ? "Unarchive" : "Archive"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={MODAL_BACKDROP} onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div style={MODAL_PANEL}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Delete employee</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
              Permanently delete <strong style={{ color: "var(--fg)" }}>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)} disabled={actionBusy}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => void executeDelete()} disabled={actionBusy}>
                {actionBusy ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeRow({ emp, onEdit, onArchive, onDelete }: {
  emp: Employee;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isArchived = !!emp.archived_at;

  return (
    <tr
      style={{
        background: hovered && !isArchived ? "var(--row-hover)" : "var(--surface)",
        opacity: isArchived ? 0.6 : 1,
        borderTop: "1px solid var(--line)",
        cursor: isArchived ? "default" : "pointer",
        transition: "background 150ms",
      }}
      onClick={onEdit}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--fg)" }}>
        {emp.first_name}
        {isArchived && (
          <Pill tone="neutral" size="sm" style={{ marginLeft: 8 }}>Archived</Pill>
        )}
      </td>
      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)" }}>
        {(emp.employee_locations && emp.employee_locations.length > 0)
          ? emp.employee_locations.map((el) => (
              <span key={el.location_id} style={{ marginRight: 4 }}>
                {el.location_name}{el.is_primary ? " ★" : ""}
              </span>
            ))
          : (emp.location_name ?? <span style={{ color: "var(--fg-4)" }}>—</span>)
        }
      </td>
      <td style={{ padding: "10px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
          <Button size="sm" variant="ghost" onClick={onEdit} title="Edit">
            <PencilIcon className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" title={isArchived ? "Unarchive" : "Archive"} onClick={onArchive}>
            {isArchived ? <ArchiveRestoreIcon className="size-3.5" /> : <ArchiveIcon className="size-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" title="Delete permanently" onClick={onDelete} style={{ color: "var(--bad)" }}>
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
