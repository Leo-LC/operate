"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";
import type { Employee } from "@/modules/admin/types";
import type { AdminLocation } from "@/modules/admin/types";

interface Props {
  initialEmployees: Employee[];
  locations: AdminLocation[];
}

type FormState = {
  first_name: string;
  last_name: string;
  position: string;
  location_id: string;
  email: string;
  phone: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  position: "",
  location_id: "",
  email: "",
  phone: "",
  notes: "",
};

export function EmployeesListClient({ initialEmployees, locations }: Props) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

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
          location_id: form.location_id || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to add employee");
        return;
      }
      const created = await res.json() as Employee;
      const loc = locations.find((l) => l.id === created.location_id);
      setEmployees((prev) => [...prev, { ...created, location_name: loc?.name ?? null }]);
      setShowAdd(false);
      setForm(EMPTY_FORM);
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
          location_id: editForm.location_id || null,
          email: editForm.email || null,
          phone: editForm.phone || null,
          notes: editForm.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to update employee");
        return;
      }
      const updated = await res.json() as Employee;
      const loc = locations.find((l) => l.id === updated.location_id);
      setEmployees((prev) => prev.map((em) => em.id === editingId ? { ...updated, location_name: loc?.name ?? null } : em));
      setEditingId(null);
      toast.success("Employee updated");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(id: string, name: string) {
    if (!confirm(`Archive ${name}?`)) return;
    const res = await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to archive employee"); return; }
    setEmployees((prev) => prev.filter((em) => em.id !== id));
    toast.success("Employee archived");
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      position: emp.position ?? "",
      location_id: emp.location_id ?? "",
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      notes: emp.notes ?? "",
    });
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
          locations={locations}
          submitting={submitting}
          onChange={(key, val) => setForm((prev) => ({ ...prev, [key]: val }))}
          onSubmit={(e) => void handleAdd(e)}
          onCancel={() => { setShowAdd(false); setForm(EMPTY_FORM); }}
          submitLabel="Add"
        />
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Position</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Shop</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Email / Phone</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((emp) =>
              editingId === emp.id ? (
                <tr key={emp.id}>
                  <td colSpan={6} className="px-4 py-3">
                    <EmployeeForm
                      form={editForm}
                      locations={locations}
                      submitting={submitting}
                      onChange={(key, val) => setEditForm((prev) => ({ ...prev, [key]: val }))}
                      onSubmit={(e) => void handleEdit(e)}
                      onCancel={() => setEditingId(null)}
                      submitLabel="Save"
                    />
                  </td>
                </tr>
              ) : (
                <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{emp.first_name} {emp.last_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{emp.position ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{emp.location_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {emp.email && <div>{emp.email}</div>}
                    {emp.phone && <div>{emp.phone}</div>}
                    {!emp.email && !emp.phone && "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${emp.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {emp.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => startEdit(emp)}>
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => void handleArchive(emp.id, `${emp.first_name} ${emp.last_name}`)}>
                        <TrashIcon className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {employees.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No employees yet. Add your first employee above.</div>
        )}
      </div>
    </div>
  );
}

function EmployeeForm({
  form,
  locations,
  submitting,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: FormState;
  locations: AdminLocation[];
  submitting: boolean;
  onChange: (key: keyof FormState, val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-muted/20 p-4 flex flex-wrap gap-3 items-end">
      {(["first_name", "last_name"] as const).map((key) => (
        <div key={key} className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground capitalize">{key.replace("_", " ")}</label>
          <input
            type="text"
            required
            value={form[key]}
            onChange={(e) => onChange(key, e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            placeholder={key === "first_name" ? "First name" : "Last name"}
          />
        </div>
      ))}
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-xs font-medium text-muted-foreground">Position</label>
        <input
          type="text"
          value={form.position}
          onChange={(e) => onChange("position", e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          placeholder="e.g. Barista"
        />
      </div>
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">Shop</label>
        <select
          value={form.location_id}
          onChange={(e) => onChange("location_id", e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">— No shop assigned —</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1 min-w-[180px]">
        <label className="text-xs font-medium text-muted-foreground">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          placeholder="employee@example.com"
        />
      </div>
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-xs font-medium text-muted-foreground">Phone</label>
        <input
          type="text"
          value={form.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          placeholder="+66 xx xxx xxxx"
        />
      </div>
      <div className="flex gap-2 mt-0.5">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
