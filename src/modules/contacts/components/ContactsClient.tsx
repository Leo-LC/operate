"use client";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import type { Contact, ContactType } from "@/modules/contacts/types";
import { CONTACT_TYPES, CONTACT_TYPE_LABELS } from "@/modules/contacts/types";

interface LocationOption { id: string; name: string }

interface Props {
  initialContacts: Contact[];
  locations: LocationOption[];
  canWrite: boolean;
}

type FormState = {
  name: string;
  contact_type: ContactType | "";
  company: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  contact_type: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

function contactToForm(c: Contact): FormState {
  return {
    name: c.name,
    contact_type: c.contact_type,
    company: c.company ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    notes: c.notes ?? "",
  };
}

const TYPE_BADGE: Record<ContactType, string> = {
  employee: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  provider: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  bank: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  veterinarian: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  other: "bg-muted text-muted-foreground",
};

export function ContactsClient({ initialContacts, locations, canWrite }: Props) {
  const [contacts, setContacts] = useState(initialContacts);
  const [typeFilter, setTypeFilter] = useState<ContactType | "">("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formLocIds, setFormLocIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editLocIds, setEditLocIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    let result = contacts;
    if (typeFilter) result = result.filter((c) => c.contact_type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [contacts, typeFilter, search]);

  function resetAdd() {
    setForm(EMPTY_FORM);
    setFormLocIds(new Set());
    setShowForm(false);
  }

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setEditForm(contactToForm(c));
    setEditLocIds(new Set((c.contact_locations ?? []).map((cl) => cl.location_id)));
  }

  function toggleLoc(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contact_type) { toast.error("Please select a contact type"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contact_type: form.contact_type,
          company: form.company || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          notes: form.notes || undefined,
          location_ids: Array.from(formLocIds),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to add contact");
        return;
      }
      const created = await res.json() as Contact;
      const contactLocs = Array.from(formLocIds).map((lid) => ({
        id: "",
        location_id: lid,
        location_name: locations.find((l) => l.id === lid)?.name ?? lid,
      }));
      setContacts((prev) => [...prev, {
        ...created,
        contact_type: form.contact_type as ContactType,
        contact_locations: contactLocs,
      }].sort((a, b) => a.name.localeCompare(b.name)));
      resetAdd();
      toast.success("Contact added");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contacts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          contact_type: editForm.contact_type || undefined,
          company: editForm.company || null,
          email: editForm.email || null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          notes: editForm.notes || null,
          location_ids: Array.from(editLocIds),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to update contact");
        return;
      }
      const updated = await res.json() as Contact;
      const contactLocs = Array.from(editLocIds).map((lid) => ({
        id: "",
        location_id: lid,
        location_name: locations.find((l) => l.id === lid)?.name ?? lid,
      }));
      setContacts((prev) =>
        prev.map((c) => c.id === editingId ? { ...updated, contact_locations: contactLocs } : c)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      toast.success("Contact updated");
    } finally {
      setSubmitting(false);
    }
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete contact"); return; }
      setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Contact deleted");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Contacts</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} of {contacts.length} contacts</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            placeholder="Search name, company, email…"
            className="h-8 w-52 rounded-md border border-input bg-background px-2 text-xs"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContactType | "")}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">All types</option>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>
            ))}
          </select>
          {canWrite && (
            <Button size="sm" onClick={() => { setShowForm((v) => !v); setEditingId(null); }} className="gap-1.5">
              <PlusIcon className="size-4" />
              Add contact
            </Button>
          )}
        </div>
      </div>

      {showForm && canWrite && (
        <ContactForm
          form={form}
          locIds={formLocIds}
          locations={locations}
          submitting={submitting}
          onChange={(key, val) => setForm((prev) => ({ ...prev, [key]: val }))}
          onToggleLoc={(id) => toggleLoc(formLocIds, setFormLocIds, id)}
          onSubmit={(e) => void handleAdd(e)}
          onCancel={resetAdd}
          submitLabel="Add contact"
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts found.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Locations</th>
                {canWrite && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={canWrite ? 6 : 5} className="px-4 py-3">
                      <ContactForm
                        form={editForm}
                        locIds={editLocIds}
                        locations={locations}
                        submitting={submitting}
                        onChange={(key, val) => setEditForm((prev) => ({ ...prev, [key]: val }))}
                        onToggleLoc={(id) => toggleLoc(editLocIds, setEditLocIds, id)}
                        onSubmit={(e) => void handleEdit(e)}
                        onCancel={() => setEditingId(null)}
                        submitLabel="Save"
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{c.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[c.contact_type]}`}>
                        {CONTACT_TYPE_LABELS[c.contact_type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.company ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {c.email && <div>{c.email}</div>}
                      {c.phone && <div>{c.phone}</div>}
                      {!c.email && !c.phone && "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {(c.contact_locations && c.contact_locations.length > 0)
                        ? c.contact_locations.map((cl) => cl.location_name).join(", ")
                        : <span className="text-muted-foreground/50">—</span>
                      }
                    </td>
                    {canWrite && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => startEdit(c)} title="Edit">
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="size-7 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="text-base font-semibold mb-1">Delete contact</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Permanently delete <span className="font-medium text-foreground">{deleteTarget.name}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => void executeDelete()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactForm({
  form,
  locIds,
  locations,
  submitting,
  onChange,
  onToggleLoc,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: FormState;
  locIds: Set<string>;
  locations: LocationOption[];
  submitting: boolean;
  onChange: (key: keyof FormState, val: string) => void;
  onToggleLoc: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-muted/20 p-5 flex flex-col gap-5">
      {/* Identity */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Identity</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground">Name <span className="text-destructive">*</span></label>
            <input
              type="text" required value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Full name"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground">Type <span className="text-destructive">*</span></label>
            <select
              required value={form.contact_type}
              onChange={(e) => onChange("contact_type", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">— Select type —</option>
              {CONTACT_TYPES.map((t) => (
                <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground">Company / Organisation</label>
            <input
              type="text" value={form.company}
              onChange={(e) => onChange("company", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Company name"
            />
          </div>
        </div>
      </div>

      {/* Contact details */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact details</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1 min-w-[190px]">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email" value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="contact@example.com"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <input
              type="text" value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="+66 xx xxx xxxx"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="text-xs font-medium text-muted-foreground">Address</label>
            <input
              type="text" value={form.address}
              onChange={(e) => onChange("address", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Street address"
            />
          </div>
        </div>
      </div>

      {/* Location tags */}
      {locations.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Linked locations</p>
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => (
              <label
                key={loc.id}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  locIds.has(loc.id)
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-border/80"
                }`}
              >
                <input
                  type="checkbox" className="sr-only"
                  checked={locIds.has(loc.id)}
                  onChange={() => onToggleLoc(loc.id)}
                />
                {loc.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
          placeholder="Internal notes…"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
