"use client";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Pill } from "@/components/ui/pill";
import { PageHeader } from "@/components/ui/page-header";
import { PlusIcon, PencilIcon, Trash2Icon, SearchIcon } from "lucide-react";
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
  company_name_th: string;
  email: string;
  phone: string;
  address: string;
  address_th: string;
  tax_id: string;
  branch: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "", contact_type: "", company: "", company_name_th: "",
  email: "", phone: "", address: "", address_th: "",
  tax_id: "", branch: "", notes: "",
};

function contactToForm(c: Contact): FormState {
  return {
    name: c.name, contact_type: c.contact_type,
    company: c.company ?? "", company_name_th: c.company_name_th ?? "",
    email: c.email ?? "", phone: c.phone ?? "",
    address: c.address ?? "", address_th: c.address_th ?? "",
    tax_id: c.tax_id ?? "", branch: c.branch ?? "", notes: c.notes ?? "",
  };
}

type PillTone = "neutral" | "bronze" | "good" | "warn" | "bad" | "info" | "outline";
const TYPE_TONE: Record<ContactType, PillTone> = {
  employee:    "info",
  provider:    "bronze",
  bank:        "good",
  owner:       "warn",
  veterinarian:"neutral",
  other:       "neutral",
};

export function ContactsClient({ initialContacts, locations, canWrite }: Props) {
  const [contacts, setContacts] = useState(initialContacts);
  const [typeFilter, setTypeFilter] = useState<ContactType | "">("");
  const [search, setSearch] = useState("");
  const [drawerMode, setDrawerMode] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formLocIds, setFormLocIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!deleteTarget) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setDeleteTarget(null); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget]);

  const filtered = useMemo(() => {
    let result = contacts;
    if (typeFilter) result = result.filter((c) => c.contact_type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, typeFilter, search]);

  function openAdd() {
    setForm(EMPTY_FORM); setFormLocIds(new Set()); setEditingId(null); setDrawerMode("add");
  }
  function openEdit(c: Contact) {
    setForm(contactToForm(c));
    setFormLocIds(new Set((c.contact_locations ?? []).map((cl) => cl.location_id)));
    setEditingId(c.id); setDrawerMode("edit");
  }
  function closeDrawer() { setDrawerMode(null); setEditingId(null); }

  function toggleLoc(id: string) {
    setFormLocIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contact_type) { toast.error("Please select a contact type"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, contact_type: form.contact_type,
          company: form.company || undefined, company_name_th: form.company_name_th || undefined,
          email: form.email || undefined, phone: form.phone || undefined,
          address: form.address || undefined, address_th: form.address_th || undefined,
          tax_id: form.tax_id || undefined, branch: form.branch || undefined,
          notes: form.notes || undefined, location_ids: Array.from(formLocIds),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to add contact"); return;
      }
      const created = await res.json() as Contact;
      const contactLocs = Array.from(formLocIds).map((lid) => ({
        id: "", location_id: lid, location_name: locations.find((l) => l.id === lid)?.name ?? lid,
      }));
      setContacts((prev) => [...prev, { ...created, contact_type: form.contact_type as ContactType, contact_locations: contactLocs }].sort((a, b) => a.name.localeCompare(b.name)));
      closeDrawer(); toast.success("Contact added");
    } finally { setSubmitting(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contacts/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, contact_type: form.contact_type || undefined,
          company: form.company || null, company_name_th: form.company_name_th || null,
          email: form.email || null, phone: form.phone || null,
          address: form.address || null, address_th: form.address_th || null,
          tax_id: form.tax_id || null, branch: form.branch || null,
          notes: form.notes || null, location_ids: Array.from(formLocIds),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to update contact"); return;
      }
      const updated = await res.json() as Contact;
      const contactLocs = Array.from(formLocIds).map((lid) => ({
        id: "", location_id: lid, location_name: locations.find((l) => l.id === lid)?.name ?? lid,
      }));
      setContacts((prev) => prev.map((c) => c.id === editingId ? { ...updated, contact_locations: contactLocs } : c).sort((a, b) => a.name.localeCompare(b.name)));
      closeDrawer(); toast.success("Contact updated");
    } finally { setSubmitting(false); }
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete contact"); return; }
      setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null); toast.success("Contact deleted");
    } finally { setDeleting(false); }
  }

  const drawerFooter = (
    <div style={{ display: "flex", gap: "var(--s-2)", width: "100%" }}>
      <Button type="button" variant="secondary" size="sm" onClick={closeDrawer} disabled={submitting}>Cancel</Button>
      <Button type="submit" size="sm" form="contact-form" disabled={submitting}>
        {submitting ? "Saving…" : drawerMode === "add" ? "Add contact" : "Save changes"}
      </Button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <PageHeader
        title="Contacts"
        subtitle={`${filtered.length} of ${contacts.length} contacts`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            {/* Search */}
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <SearchIcon style={{ position: "absolute", left: 8, width: 13, height: 13, color: "var(--fg-4)", pointerEvents: "none" }} />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, company…"
                style={{
                  height: 34, paddingLeft: 28, paddingRight: "var(--s-3)",
                  borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                  background: "var(--surface)", color: "var(--fg)",
                  fontSize: 13, width: 220, outline: "none",
                }}
              />
            </div>
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ContactType | "")}
              style={{
                height: 34, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                background: "var(--surface)", color: "var(--fg)",
                padding: "0 var(--s-3)", fontSize: 13, outline: "none",
              }}
            >
              <option value="">All types</option>
              {CONTACT_TYPES.map((t) => <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>)}
            </select>
            {canWrite && (
              <Button size="sm" onClick={openAdd} style={{ gap: 6 }}>
                <PlusIcon size={13} />Add contact
              </Button>
            )}
          </div>
        }
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--fg-4)" }}>No contacts found.</p>
      ) : (
        <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--surface)" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
                {["Name", "Type", "Company", "Contact", "Locations", canWrite ? "" : null]
                  .filter(Boolean)
                  .map((h) => (
                    <th key={String(h)}
                      style={{
                        padding: "10px 16px", textAlign: "left", fontSize: 11,
                        fontWeight: 500, color: "var(--fg-4)",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid var(--line)", transition: "background var(--dur) var(--ease)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--fg)" }}>{c.name}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <Pill tone={TYPE_TONE[c.contact_type]} size="sm">{CONTACT_TYPE_LABELS[c.contact_type]}</Pill>
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }}>
                    {c.company && <div>{c.company}</div>}
                    {c.company_name_th && <div style={{ opacity: 0.7 }}>{c.company_name_th}</div>}
                    {c.tax_id && <div style={{ opacity: 0.6, fontSize: 11 }}>Tax: {c.tax_id}</div>}
                    {!c.company && !c.company_name_th && <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }}>
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                    {!c.email && !c.phone && <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }}>
                    {(c.contact_locations && c.contact_locations.length > 0)
                      ? c.contact_locations.map((cl) => cl.location_name).join(", ")
                      : <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </td>
                  {canWrite && (
                    <td style={{ padding: "10px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                        <button
                          style={{
                            width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
                            borderRadius: "var(--r-sm)", border: "none", background: "transparent",
                            color: "var(--fg-4)", cursor: "pointer",
                          }}
                          onClick={() => openEdit(c)} title="Edit"
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
                        >
                          <PencilIcon style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          style={{
                            width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
                            borderRadius: "var(--r-sm)", border: "none", background: "transparent",
                            color: "var(--fg-4)", cursor: "pointer",
                          }}
                          onClick={() => setDeleteTarget({ id: c.id, name: c.name })} title="Delete"
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bad)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
                        >
                          <Trash2Icon style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Drawer */}
      <Drawer
        open={drawerMode !== null}
        onClose={closeDrawer}
        title={drawerMode === "add" ? "Add contact" : "Edit contact"}
        description={drawerMode === "edit" ? form.name : undefined}
        footer={drawerFooter}
      >
        <ContactForm
          form={form}
          locIds={formLocIds}
          locations={locations}
          onChange={(key, val) => setForm((prev) => ({ ...prev, [key]: val }))}
          onToggleLoc={toggleLoc}
          onSubmit={(e) => void (drawerMode === "add" ? handleAdd(e) : handleEdit(e))}
        />
      </Drawer>

      {/* Delete modal */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--overlay-strong)", backdropFilter: "blur(2px)",
            padding: "var(--s-4)",
          }}
        >
          <div
            style={{
              width: "100%", maxWidth: 360,
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", padding: "var(--s-5)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)", marginBottom: 4 }}>Delete contact</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: "var(--s-5)" }}>
              Permanently delete <strong style={{ color: "var(--fg)" }}>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--s-2)" }}>
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => void executeDelete()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
  background: "var(--bg-2)", padding: "0 var(--s-3)",
  fontSize: 13, color: "var(--fg)", outline: "none", width: "100%",
};

function ContactForm({
  form, locIds, locations, onChange, onToggleLoc, onSubmit,
}: {
  form: FormState; locIds: Set<string>; locations: LocationOption[];
  onChange: (key: keyof FormState, val: string) => void;
  onToggleLoc: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  function Field({ label, field, type = "text", placeholder, required }: { label: string; field: keyof FormState; type?: string; placeholder?: string; required?: boolean }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label className="eyebrow" style={{ color: "var(--fg-4)" }}>
          {label}{required && <span style={{ color: "var(--bad)", marginLeft: 2 }}>*</span>}
        </label>
        <input type={type} required={required} value={String(form[field])} placeholder={placeholder}
          onChange={(e) => onChange(field, e.target.value)} style={inputStyle} />
      </div>
    );
  }

  return (
    <form id="contact-form" onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      {/* Identity */}
      <div>
        <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: "var(--s-3)" }}>Identity</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
          <Field label="Name" field="name" placeholder="Full name" required />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Type <span style={{ color: "var(--bad)" }}>*</span></label>
            <select required value={form.contact_type} onChange={(e) => onChange("contact_type", e.target.value)} style={inputStyle}>
              <option value="">— Select type —</option>
              {CONTACT_TYPES.map((t) => <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <Field label="Company (EN)" field="company" placeholder="Company name" />
        </div>
      </div>

      {/* Contact details */}
      <div>
        <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: "var(--s-3)" }}>Contact details</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
          <Field label="Email" field="email" type="email" placeholder="contact@example.com" />
          <Field label="Phone" field="phone" placeholder="+66 xx xxx xxxx" />
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Address" field="address" placeholder="Street address" />
          </div>
        </div>
      </div>

      {/* Business info */}
      <div>
        <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: "var(--s-3)" }}>Business info</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Company name (TH)" field="company_name_th" placeholder="บริษัท … จำกัด" />
          </div>
          <Field label="Tax ID" field="tax_id" placeholder="0000000000000" />
          <Field label="Branch" field="branch" placeholder="Head Office" />
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Address (TH)</label>
            <textarea
              value={form.address_th} rows={2}
              onChange={(e) => onChange("address_th", e.target.value)}
              placeholder="63/158 หมู่ที่ 5 ตำบล บ่อผุด…"
              style={{ ...inputStyle, height: "auto", padding: "var(--s-2) var(--s-3)", resize: "none", fontFamily: "var(--font-sans)" }}
            />
          </div>
        </div>
      </div>

      {/* Location tags */}
      {locations.length > 0 && (
        <div>
          <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: "var(--s-3)" }}>Linked locations</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
            {locations.map((loc) => {
              const active = locIds.has(loc.id);
              return (
                <label
                  key={loc.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    borderRadius: "var(--r-sm)",
                    border: `1px solid ${active ? "var(--bronze)" : "var(--line)"}`,
                    background: active ? "var(--bronze-soft)" : "var(--bg-2)",
                    padding: "4px 10px", fontSize: 13,
                    color: active ? "var(--bronze)" : "var(--fg-3)",
                    cursor: "pointer", fontWeight: active ? 500 : 400,
                    transition: "all var(--dur) var(--ease)",
                  }}
                >
                  <input type="checkbox" className="sr-only" checked={active} onChange={() => onToggleLoc(loc.id)} />
                  {loc.name}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Notes</label>
        <textarea
          value={form.notes} rows={2}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Internal notes…"
          style={{ ...inputStyle, height: "auto", padding: "var(--s-2) var(--s-3)", resize: "none", fontFamily: "var(--font-sans)" }}
        />
      </div>
    </form>
  );
}
