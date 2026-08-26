"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { PageHeader } from "@/components/ui/page-header";
import { PlusIcon, PencilIcon, ArchiveIcon, Trash2Icon, ArchiveRestoreIcon, Loader2Icon, ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import type { Employee, AdminLocation } from "@/modules/admin/types";
import { EMPTY_EMPLOYEE_FORM, NATIONALITIES, type EmployeeFormState } from "./EmployeeForm";

interface Props {
  locations: AdminLocation[];
}

type FormState = EmployeeFormState;
const EMPTY_FORM: FormState = EMPTY_EMPLOYEE_FORM;

const MODAL_BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "var(--overlay-strong)", backdropFilter: "blur(2px)",
  padding: "0 16px",
};

const MODAL_PANEL: React.CSSProperties = {
  width: "100%", maxWidth: 520,
  borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
  background: "var(--surface)", padding: 24,
  boxShadow: "var(--shadow-2)",
};

const SIMPLE_INPUT: React.CSSProperties = {
  height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)",
  background: "var(--bg)", color: "var(--fg)", padding: "0 10px", fontSize: 13, width: "100%",
};

type SortKey = "first_name" | "nationality" | "shop" | "salary" | "thai_bank" | "service_charge";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "nationality", label: "Nationality" },
  { key: "shop", label: "Shop" },
  { key: "salary", label: "Salary" },
  { key: "thai_bank", label: "Thai bank" },
  { key: "service_charge", label: "Service charge" },
  { key: null, label: "" },
];

const SORT_HEADER_STYLE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "transparent", border: "none", padding: 0, cursor: "pointer",
  font: "inherit", letterSpacing: "inherit", textTransform: "inherit",
};

const SHOP_PILL_STYLE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  borderRadius: "var(--r-pill)", padding: "5px 12px", fontSize: 12, fontWeight: 500,
  border: "1px solid var(--line)", background: "var(--bg)", color: "var(--fg-3)",
  cursor: "pointer", transition: "all 150ms",
};

function primaryShopName(emp: Employee): string | null {
  const primary = emp.employee_locations?.find((el) => el.is_primary);
  if (primary) return primary.location_name;
  if (emp.employee_locations && emp.employee_locations.length > 0) return emp.employee_locations[0].location_name;
  return emp.location_name;
}

function primarySalary(emp: Employee): number | null {
  const perLoc = (emp.employee_locations ?? []).filter((el) => el.base_salary_monthly != null);
  return perLoc[0]?.base_salary_monthly ?? emp.base_salary_monthly;
}

function SimpleEmployeeForm({ form, locIds, primaryLoc, locations, locationSalaries, submitting, onChange, onToggleLoc, onSetPrimary, onSalaryChange, onSubmit, onCancel, submitLabel }: {
  form: FormState; locIds: Set<string>; primaryLoc: string; locations: AdminLocation[]; locationSalaries: Record<string, string>; submitting: boolean;
  onChange: (key: keyof FormState, value: string | boolean) => void; onToggleLoc: (id: string) => void;
  onSetPrimary: (id: string) => void; onSalaryChange: (id: string, value: string) => void; onSubmit: (event: React.FormEvent) => void; onCancel: () => void; submitLabel: string;
}) {
  return <form onSubmit={onSubmit} style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--fg-3)" }}>First name
        <input autoFocus required value={form.first_name} onChange={(event) => onChange("first_name", event.target.value)} style={SIMPLE_INPUT} placeholder="First name" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--fg-3)" }}>Nationality
        <select value={form.nationality} onChange={(event) => onChange("nationality", event.target.value)} style={{ ...SIMPLE_INPUT, cursor: "pointer" }}>
          {NATIONALITIES.map((nationality) => <option key={nationality} value={nationality}>{nationality || "Select nationality"}</option>)}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--fg-3)" }}>Base salary / month (฿)
        <input type="number" min="0" step="100" value={form.base_salary_monthly} onChange={(event) => onChange("base_salary_monthly", event.target.value)} style={SIMPLE_INPUT} placeholder="e.g. 15000" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--fg-3)" }}>Service charge %
        <input type="number" min="0" step="0.1" value={form.service_charge_pct} onChange={(event) => onChange("service_charge_pct", event.target.value)} style={SIMPLE_INPUT} placeholder="Shop default" />
      </label>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg)", cursor: "pointer" }}>
        <input type="checkbox" checked={form.has_thai_bank_account} onChange={(event) => onChange("has_thai_bank_account", event.target.checked)} />
        Thai bank account
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg)", cursor: "pointer" }}>
        <input type="checkbox" checked={form.service_charge_eligible ?? true} onChange={(event) => onChange("service_charge_eligible", event.target.checked)} />
        Eligible for service charge
      </label>
    </div>
    <div><span style={{ display: "block", marginBottom: 7, fontSize: 12, color: "var(--fg-3)" }}>Shop</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {locations.map((location) => {
        const selected = locIds.has(location.id);
        return <div key={location.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: "var(--r-sm)", border: `1px solid ${selected ? "var(--bronze)" : "var(--line)"}`, background: selected ? "var(--bronze-soft)" : "var(--bg)" }}>
          <button type="button" onClick={() => { onToggleLoc(location.id); if (!selected) onSetPrimary(location.id); }} aria-pressed={selected} style={{ padding: "3px 0", background: "transparent", border: "none", color: selected ? "var(--bronze)" : "var(--fg-3)", fontSize: 12, cursor: "pointer" }}>{location.name}{primaryLoc === location.id && selected ? " · primary" : ""}</button>
          {selected && (
            <input type="number" min="0" step="100" value={locationSalaries[location.id] ?? ""} onChange={(e) => onSalaryChange(location.id, e.target.value)} placeholder="฿/mo" style={{ width: 84, height: 24, borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)", background: "var(--bg)", color: "var(--fg)", padding: "0 6px", fontSize: 11 }} />
          )}
        </div>;
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
  const [formSalaries, setFormSalaries] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editLocIds, setEditLocIds] = useState<Set<string>>(new Set());
  const [editPrimaryLoc, setEditPrimaryLoc] = useState("");
  const [editSalaries, setEditSalaries] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string; isArchived: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("first_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [shopFilter, setShopFilter] = useState<string | null>(null);

  const shopFiltered = useMemo(() => {
    if (!shopFilter) return employees;
    return employees.filter((emp) => {
      const locIds = (emp.employee_locations ?? []).map((el) => el.location_id);
      return locIds.includes(shopFilter) || emp.location_id === shopFilter;
    });
  }, [employees, shopFilter]);

  const sorted = useMemo(() => {
    const arr = [...shopFiltered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "first_name":
          cmp = (a.first_name ?? "").localeCompare(b.first_name ?? "");
          break;
        case "nationality":
          cmp = (a.nationality ?? "").localeCompare(b.nationality ?? "");
          break;
        case "shop":
          cmp = (primaryShopName(a) ?? "").localeCompare(primaryShopName(b) ?? "");
          break;
        case "salary":
          cmp = (primarySalary(a) ?? 0) - (primarySalary(b) ?? 0);
          break;
        case "thai_bank":
          cmp = Number(!!a.has_thai_bank_account) - Number(!!b.has_thai_bank_account);
          break;
        case "service_charge":
          cmp = (a.service_charge_pct ?? -1) - (b.service_charge_pct ?? -1);
          break;
      }
      return cmp * dir;
    });
    return arr;
  }, [shopFiltered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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
    setFormSalaries({});
    setShowAdd(false);
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditForm(empToForm(emp));
    const locIds = new Set((emp.employee_locations ?? []).map((el) => el.location_id));
    setEditLocIds(locIds);
    const primary = emp.employee_locations?.find((el) => el.is_primary)?.location_id ?? emp.location_id ?? "";
    setEditPrimaryLoc(primary);
    const salaries: Record<string, string> = {};
    for (const el of emp.employee_locations ?? []) {
      if (el.base_salary_monthly != null) salaries[el.location_id] = String(el.base_salary_monthly);
    }
    setEditSalaries(salaries);
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
          nationality: form.nationality || undefined,
          base_salary_monthly: form.base_salary_monthly ? parseFloat(form.base_salary_monthly) : undefined,
          has_thai_bank_account: form.has_thai_bank_account,
          service_charge_pct: form.service_charge_pct ? parseFloat(form.service_charge_pct) : undefined,
          service_charge_eligible: form.service_charge_eligible,
          location_ids: Array.from(formLocIds),
          primary_location_id: formPrimaryLoc || undefined,
          location_salaries: formSalaries,
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
          nationality: editForm.nationality || null,
          base_salary_monthly: editForm.base_salary_monthly ? parseFloat(editForm.base_salary_monthly) : null,
          has_thai_bank_account: editForm.has_thai_bank_account,
          service_charge_pct: editForm.service_charge_pct ? parseFloat(editForm.service_charge_pct) : null,
          service_charge_eligible: editForm.service_charge_eligible,
          location_ids: Array.from(editLocIds),
          primary_location_id: editPrimaryLoc || null,
          location_salaries: editSalaries,
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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => setShopFilter(null)}
          aria-pressed={shopFilter === null}
          style={{
            ...SHOP_PILL_STYLE,
            ...(shopFilter === null
              ? { border: "1px solid var(--bronze)", background: "var(--bronze-soft)", color: "var(--bronze)" }
              : {}),
          }}
        >
          All shops
        </button>
        {locations.map((loc) => {
          const active = shopFilter === loc.id;
          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => setShopFilter(active ? null : loc.id)}
              aria-pressed={active}
              style={{
                ...SHOP_PILL_STYLE,
                ...(active
                  ? { border: "1px solid var(--bronze)", background: "var(--bronze-soft)", color: "var(--bronze)" }
                  : {}),
              }}
            >
              {loc.name}
            </button>
          );
        })}
      </div>

      {showAdd && (
        <SimpleEmployeeForm
          form={form}
          locIds={formLocIds}
          primaryLoc={formPrimaryLoc}
          locations={locations}
          locationSalaries={formSalaries}
          submitting={submitting}
          onChange={(key, val) => setForm((prev) => ({ ...prev, [key]: val }))}
          onToggleLoc={(id) => toggleLoc(formLocIds, setFormLocIds, setFormPrimaryLoc, id)}
          onSetPrimary={setFormPrimaryLoc}
          onSalaryChange={(id, val) => setFormSalaries((prev) => ({ ...prev, [id]: val }))}
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
                {COLUMNS.map((col) => (
                  <th key={col.label || "__actions__"} className="eyebrow" style={{ padding: "10px 16px", textAlign: "left", color: "var(--fg-4)" }}>
                    {col.key ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key!)}
                        style={SORT_HEADER_STYLE}
                        title={`Sort by ${col.label}`}
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === "asc"
                            ? <ArrowUpIcon className="size-3" />
                            : <ArrowDownIcon className="size-3" />
                        ) : (
                          <ArrowUpDownIcon className="size-3" style={{ opacity: 0.4 }} />
                        )}
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((emp) =>
                editingId === emp.id ? (
                  <tr key={emp.id}>
                    <td colSpan={7} style={{ padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
                      <SimpleEmployeeForm
                        form={editForm}
                        locIds={editLocIds}
                        primaryLoc={editPrimaryLoc}
                        locations={locations}
                        locationSalaries={editSalaries}
                        submitting={submitting}
                        onChange={(key, val) => setEditForm((prev) => ({ ...prev, [key]: val }))}
                        onToggleLoc={(id) => toggleLoc(editLocIds, setEditLocIds, setEditPrimaryLoc, id)}
                        onSetPrimary={setEditPrimaryLoc}
                        onSalaryChange={(id, val) => setEditSalaries((prev) => ({ ...prev, [id]: val }))}
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
          {employees.length > 0 && shopFiltered.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>No employees at this shop.</div>
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
        {emp.nationality || <span style={{ color: "var(--fg-4)" }}>—</span>}
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
      <td className="mono tabular-nums" style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
        {(() => {
          const perLoc = (emp.employee_locations ?? []).filter((el) => el.base_salary_monthly != null);
          if (perLoc.length > 1) {
            return perLoc.map((el) => (
              <span key={el.location_id} style={{ display: "block" }}>
                {el.location_name}: ฿{el.base_salary_monthly!.toLocaleString()}
              </span>
            ));
          }
          const s = perLoc[0]?.base_salary_monthly ?? emp.base_salary_monthly;
          return s != null ? `฿${s.toLocaleString()}/mo` : <span style={{ color: "var(--fg-4)" }}>—</span>;
        })()}
      </td>
      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)" }}>
        {emp.has_thai_bank_account ? "Yes" : "No"}
      </td>
      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
        {emp.service_charge_eligible === false ? "Not eligible" : emp.service_charge_pct != null ? `${emp.service_charge_pct}%` : "Shop default"}
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
