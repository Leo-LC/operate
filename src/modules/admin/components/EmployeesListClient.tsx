"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { PageHeader } from "@/components/ui/page-header";
import { PlusIcon, PencilIcon, ArchiveIcon, Trash2Icon, ArchiveRestoreIcon, Loader2Icon, ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon, SearchIcon, XIcon } from "lucide-react";
import type { Employee, AdminLocation } from "@/modules/admin/types";
import { EMPTY_EMPLOYEE_FORM, NATIONALITIES, THAI_BANKS, type EmployeeFormState } from "./EmployeeForm";

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

function SimpleEmployeeForm({ form, locIds, primaryLoc, locations, locationSalaries, locationEligible, submitting, onChange, onToggleLoc, onSetPrimary, onSalaryChange, onEligibleChange, onSubmit, onCancel, submitLabel, activeShopId, readOnlyShops }: {
  form: FormState; locIds: Set<string>; primaryLoc: string; locations: AdminLocation[]; locationSalaries: Record<string, string>; locationEligible: Record<string, boolean>; submitting: boolean;
  onChange: (key: keyof FormState, value: string | boolean) => void; onToggleLoc: (id: string) => void;
  onSetPrimary: (id: string) => void; onSalaryChange: (id: string, value: string) => void; onEligibleChange: (id: string, value: boolean) => void; onSubmit: (event: React.FormEvent) => void; onCancel: () => void; submitLabel: string;
  activeShopId?: string | null; readOnlyShops?: boolean;
}) {
  const activeShopName = activeShopId ? locations.find((l) => l.id === activeShopId)?.name ?? null : null;
  const salaryLabel = activeShopName ? `Base salary at ${activeShopName} (฿)` : "Base salary / month (฿)";
  const salaryHint = activeShopName ? `Updates salary for ${activeShopName} only` : undefined;
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
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--fg-3)" }}>{salaryLabel}
        <input type="number" min="0" step="1" value={form.base_salary_monthly} onChange={(event) => onChange("base_salary_monthly", event.target.value)} style={SIMPLE_INPUT} placeholder="e.g. 15000" />
        {salaryHint && <span style={{ fontSize: 10, color: "var(--fg-4)" }}>{salaryHint}</span>}
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
    {form.has_thai_bank_account && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--fg-3)" }}>Bank name
          <select value={form.bank_name ?? ""} onChange={(e) => onChange("bank_name", e.target.value)} style={{ ...SIMPLE_INPUT, cursor: "pointer" }}>
            {THAI_BANKS.map((b) => <option key={b} value={b}>{b || "— Select bank —"}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--fg-3)" }}>Account number
          <input value={form.bank_account_number ?? ""} onChange={(e) => onChange("bank_account_number", e.target.value.replace(/[^\d-]/g, ""))} style={SIMPLE_INPUT} placeholder="123-4-56789-0" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--fg-3)" }}>Holder name
          <input value={form.bank_account_name ?? ""} onChange={(e) => onChange("bank_account_name", e.target.value)} style={SIMPLE_INPUT} placeholder="As on bank book" />
        </label>
      </div>
    )}
    <div><span style={{ display: "block", marginBottom: 7, fontSize: 12, color: "var(--fg-3)" }}>Shops {readOnlyShops && <span style={{ fontSize: 10, color: "var(--fg-4)", fontWeight: 400 }}>(read-only)</span>}</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {locations.map((location) => {
        const selected = locIds.has(location.id);
        const isPrimary = primaryLoc === location.id && selected;
        // Read-only: show only assigned shops as static pills
        if (readOnlyShops) {
          if (!selected) return null;
          return <div key={location.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", fontSize: 12, color: "var(--fg-3)" }}>
            <span style={{ fontWeight: 500, color: isPrimary ? "var(--bronze)" : "var(--fg-3)" }}>{location.name}{isPrimary ? " ★ primary" : ""}</span>
            <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{locationSalaries[location.id] ? `฿${Number(locationSalaries[location.id]).toLocaleString()}/mo` : ""}</span>
            <span style={{ fontSize: 11, color: (locationEligible[location.id] ?? true) ? "var(--good)" : "var(--bad)" }}>{(locationEligible[location.id] ?? true) ? "SC" : "no SC"}</span>
          </div>;
        }
        return <div key={location.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: "var(--r-sm)", border: `1px solid ${selected ? "var(--bronze)" : "var(--line)"}`, background: selected ? "var(--bronze-soft)" : "var(--bg)" }}>
          <button type="button" onClick={() => onToggleLoc(location.id)} aria-pressed={selected} style={{ padding: "3px 0", background: "transparent", border: "none", color: selected ? "var(--bronze)" : "var(--fg-3)", fontSize: 12, cursor: "pointer" }}>{location.name}</button>
          {selected && (
            <>
              <button type="button" onClick={(e) => { e.preventDefault(); if (!isPrimary) onSetPrimary(location.id); }} style={{ fontSize: 9, fontWeight: 700, borderRadius: "var(--r-sm)", padding: "2px 4px", background: isPrimary ? "var(--bronze)" : "transparent", color: isPrimary ? "#fff" : "var(--fg-4)", border: "none", cursor: "pointer" }} title={isPrimary ? "Primary location" : "Set as primary"}>{isPrimary ? "PRIMARY" : "set primary"}</button>
              <input type="number" min="0" step="1" value={locationSalaries[location.id] ?? ""} onChange={(e) => onSalaryChange(location.id, e.target.value)} placeholder="฿/mo" style={{ width: 84, height: 24, borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)", background: "var(--bg)", color: "var(--fg)", padding: "0 6px", fontSize: 11 }} />
              <label onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", color: "var(--fg-3)" }}>
                <input type="checkbox" checked={locationEligible[location.id] ?? true} onChange={(e) => onEligibleChange(location.id, e.target.checked)} />
                SC
              </label>
            </>
          )}
        </div>;
      })}
    </div>
    {readOnlyShops && locIds.size === 0 && <p style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 6 }}>No shop assigned.</p>}
    </div>
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
    bank_name: (emp as unknown as { bank_name?: string | null }).bank_name ?? "",
    bank_account_number: (emp as unknown as { bank_account_number?: string | null }).bank_account_number ?? "",
    bank_account_name: (emp as unknown as { bank_account_name?: string | null }).bank_account_name ?? "",
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
  const [formEligible, setFormEligible] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editLocIds, setEditLocIds] = useState<Set<string>>(new Set());
  const [editPrimaryLoc, setEditPrimaryLoc] = useState("");
  const [editSalaries, setEditSalaries] = useState<Record<string, string>>({});
  const [editEligible, setEditEligible] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string; isArchived: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("first_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [shopFilter, setShopFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const shopFiltered = useMemo(() => {
    if (!shopFilter) return employees;
    return employees.filter((emp) => {
      const locIds = (emp.employee_locations ?? []).map((el) => el.location_id);
      return locIds.includes(shopFilter) || emp.location_id === shopFilter;
    });
  }, [employees, shopFilter]);

  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return shopFiltered;
    return shopFiltered.filter((emp) => {
      const haystack = [
        emp.first_name, emp.last_name, emp.position ?? "", emp.nationality ?? "",
        emp.location_name ?? "", emp.email ?? "", emp.phone ?? "",
        ...(emp.employee_locations ?? []).map((el) => el.location_name),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [shopFiltered, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...searchFiltered];
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
  }, [searchFiltered, sortKey, sortDir]);

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
    setFormEligible({});
    setShowAdd(false);
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    const locIds = new Set((emp.employee_locations ?? []).map((el) => el.location_id));
    setEditLocIds(locIds);
    const primary = emp.employee_locations?.find((el) => el.is_primary)?.location_id ?? emp.location_id ?? "";
    setEditPrimaryLoc(primary);
    const salaries: Record<string, string> = {};
    const eligible: Record<string, boolean> = {};
    for (const el of emp.employee_locations ?? []) {
      if (el.base_salary_monthly != null) salaries[el.location_id] = String(el.base_salary_monthly);
      eligible[el.location_id] = el.service_charge_eligible ?? true;
    }
    setEditSalaries(salaries);
    setEditEligible(eligible);
    // Main fields (salary + SC) are contextual: show values for the currently filtered shop if any
    const base = empToForm(emp);
    if (shopFilter && locIds.has(shopFilter)) {
      base.base_salary_monthly = salaries[shopFilter] ?? (emp.base_salary_monthly != null ? String(emp.base_salary_monthly) : "");
      base.service_charge_eligible = eligible[shopFilter] ?? (emp.service_charge_eligible ?? true);
    } else if (primary && salaries[primary]) {
      base.base_salary_monthly = salaries[primary];
      base.service_charge_eligible = eligible[primary] ?? (emp.service_charge_eligible ?? true);
    } else if (primary && eligible[primary] !== undefined) {
      base.service_charge_eligible = eligible[primary];
    }
    setEditForm(base);
  }

  function toggleLoc(
    set: Set<string>,
    setter: (s: Set<string>) => void,
    primary: string,
    primarySetter: (s: string) => void,
    id: string,
  ) {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
      setter(next);
      // Clear per-location salary/eligibility for the removed shop
      setFormSalaries((prev) => {
        if (!(id in prev)) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setEditSalaries((prev) => {
        if (!(id in prev)) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setFormEligible((prev) => {
        if (!(id in prev)) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setEditEligible((prev) => {
        if (!(id in prev)) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (primary === id) {
        primarySetter(next.values().next().value ?? "");
      }
    } else {
      next.add(id);
      setter(next);
      if (!primary) primarySetter(id);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Main fields (salary + SC eligible) are contextual to the active shop filter:
      const effectiveSalaries: Record<string, string> = { ...formSalaries };
      const effectiveEligibleAdd: Record<string, boolean> = { ...formEligible };
      const targetAddId = shopFilter && formLocIds.has(shopFilter) ? shopFilter : formPrimaryLoc || Array.from(formLocIds)[0];
      if (targetAddId) {
        if (form.base_salary_monthly) effectiveSalaries[targetAddId] = form.base_salary_monthly;
        if (typeof form.service_charge_eligible === "boolean") effectiveEligibleAdd[targetAddId] = form.service_charge_eligible;
      }
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: "",
          nationality: form.nationality || undefined,
          base_salary_monthly: form.base_salary_monthly ? parseFloat(form.base_salary_monthly) : undefined,
          has_thai_bank_account: form.has_thai_bank_account,
          bank_name: form.bank_name || undefined,
          bank_account_number: form.bank_account_number || undefined,
          bank_account_name: form.bank_account_name || undefined,
          service_charge_pct: form.service_charge_pct ? parseFloat(form.service_charge_pct) : undefined,
          service_charge_eligible: form.service_charge_eligible,
          location_ids: Array.from(formLocIds),
          primary_location_id: formPrimaryLoc || undefined,
          location_salaries: effectiveSalaries,
          location_service_charge_eligible: effectiveEligibleAdd,
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
      const effectiveEditSalaries: Record<string, string> = { ...editSalaries };
      const effectiveEditEligible: Record<string, boolean> = { ...editEligible };
      const targetEditId = shopFilter && editLocIds.has(shopFilter) ? shopFilter : editPrimaryLoc || Array.from(editLocIds)[0];
      if (targetEditId) {
        effectiveEditSalaries[targetEditId] = editForm.base_salary_monthly ?? "";
        if (typeof editForm.service_charge_eligible === "boolean") effectiveEditEligible[targetEditId] = editForm.service_charge_eligible;
      }
      const res = await fetch(`/api/admin/employees/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editForm.first_name,
          nationality: editForm.nationality || null,
          base_salary_monthly: editForm.base_salary_monthly ? parseFloat(editForm.base_salary_monthly) : null,
          has_thai_bank_account: editForm.has_thai_bank_account,
          bank_name: editForm.bank_name || null,
          bank_account_number: editForm.bank_account_number || null,
          bank_account_name: editForm.bank_account_name || null,
          service_charge_pct: editForm.service_charge_pct ? parseFloat(editForm.service_charge_pct) : null,
          service_charge_eligible: editForm.service_charge_eligible,
          location_ids: Array.from(editLocIds),
          primary_location_id: editPrimaryLoc || null,
          location_salaries: effectiveEditSalaries,
          location_service_charge_eligible: effectiveEditEligible,
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
          <Button size="sm" onClick={() => {
            const next = !showAdd;
            setShowAdd(next);
            setEditingId(null);
            if (next && shopFilter) {
              setFormLocIds(new Set([shopFilter]));
              setFormPrimaryLoc(shopFilter);
            }
          }}>
            <PlusIcon className="size-4" />
            Add employee
          </Button>
        }
      />

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <SearchIcon size={14} style={{ position: "absolute", left: 9, color: "var(--fg-4)", pointerEvents: "none" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee…"
            style={{
              height: 32, paddingLeft: 28, paddingRight: searchQuery ? 28 : 10,
              borderRadius: "var(--r-md)", border: "1px solid var(--line)",
              background: "var(--surface)", color: "var(--fg)", fontSize: 13,
              width: 220, outline: "none",
            }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 6, background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-4)", display: "flex", padding: 2 }}>
              <XIcon size={14} />
            </button>
          )}
        </div>
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
          locationEligible={formEligible}
          submitting={submitting}
          activeShopId={shopFilter}
          readOnlyShops={false}
          onChange={(key, val) => {
            setForm((prev) => ({ ...prev, [key]: val }));
            if (key === "base_salary_monthly" && shopFilter && formLocIds.has(shopFilter)) {
              setFormSalaries((prev) => ({ ...prev, [shopFilter]: val as string }));
            }
            if (key === "service_charge_eligible" && shopFilter && formLocIds.has(shopFilter)) {
              setFormEligible((prev) => ({ ...prev, [shopFilter]: val as boolean }));
            }
          }}
          onToggleLoc={(id) => toggleLoc(formLocIds, setFormLocIds, formPrimaryLoc, setFormPrimaryLoc, id)}
          onSetPrimary={setFormPrimaryLoc}
          onSalaryChange={(id, val) => setFormSalaries((prev) => ({ ...prev, [id]: val }))}
          onEligibleChange={(id, val) => setFormEligible((prev) => ({ ...prev, [id]: val }))}
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
                        locationEligible={editEligible}
                        submitting={submitting}
                        activeShopId={shopFilter}
                        readOnlyShops={false}
                        onChange={(key, val) => {
                          setEditForm((prev) => ({ ...prev, [key]: val }));
                          if (key === "base_salary_monthly") {
                            const target = shopFilter && editLocIds.has(shopFilter) ? shopFilter : editPrimaryLoc;
                            if (target) setEditSalaries((prev) => ({ ...prev, [target]: val as string }));
                          }
                          if (key === "service_charge_eligible") {
                            const target = shopFilter && editLocIds.has(shopFilter) ? shopFilter : editPrimaryLoc;
                            if (target) setEditEligible((prev) => ({ ...prev, [target]: val as boolean }));
                          }
                        }}
                        onToggleLoc={(id) => toggleLoc(editLocIds, setEditLocIds, editPrimaryLoc, setEditPrimaryLoc, id)}
                        onSetPrimary={setEditPrimaryLoc}
                        onSalaryChange={(id, val) => setEditSalaries((prev) => ({ ...prev, [id]: val }))}
                        onEligibleChange={(id, val) => setEditEligible((prev) => ({ ...prev, [id]: val }))}
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
          {employees.length > 0 && shopFiltered.length > 0 && sorted.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>No employees match “{searchQuery}”.</div>
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
        {emp.has_thai_bank_account ? (
          <span>
            Yes
            {((emp as unknown as { bank_name?: string | null }).bank_name || (emp as unknown as { bank_account_number?: string | null }).bank_account_number) && (
              <span style={{ display: "block", fontSize: 10, color: "var(--fg-4)" }}>
                {((emp as unknown as { bank_name?: string | null }).bank_name ?? "").trim()}
                {(emp as unknown as { bank_name?: string | null }).bank_name && (emp as unknown as { bank_account_number?: string | null }).bank_account_number ? " · " : ""}
                {((emp as unknown as { bank_account_number?: string | null }).bank_account_number ?? "").replace(/\d(?=\d{4})/g, "•")}
              </span>
            )}
            {((emp as unknown as { bank_account_name?: string | null }).bank_account_name) && (
              <span style={{ display: "block", fontSize: 10, color: "var(--fg-4)" }}>{(emp as unknown as { bank_account_name?: string | null }).bank_account_name}</span>
            )}
          </span>
        ) : "No"}
      </td>
      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
        {(() => {
          const pctLabel = emp.service_charge_pct != null ? `${emp.service_charge_pct}%` : "Shop default";
          if (emp.employee_locations && emp.employee_locations.length > 0) {
            const anyEligible = emp.employee_locations.some((el) => el.service_charge_eligible !== false);
            const allEligible = emp.employee_locations.every((el) => el.service_charge_eligible !== false);
            if (!anyEligible) return "Not eligible";
            if (!allEligible) {
              return (
                <span>
                  {pctLabel}
                  <span style={{ display: "block", fontSize: 10, color: "var(--fg-4)" }}>
                    {emp.employee_locations.filter((el) => el.service_charge_eligible === false).map((el) => `${el.location_name}: off`).join(", ")}
                  </span>
                </span>
              );
            }
          } else if (emp.service_charge_eligible === false) return "Not eligible";
          return pctLabel;
        })()}
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
