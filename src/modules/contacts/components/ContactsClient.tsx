"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { PlusIcon, PencilIcon, Trash2Icon, SearchIcon, ChevronDownIcon } from "lucide-react";
import type { Contact, ContactType } from "@/modules/contacts/types";
import { CONTACT_TYPES, CONTACT_TYPE_LABELS } from "@/modules/contacts/types";
import { CONTACT_TYPE_FIELDS } from "@/modules/contacts/contact-type-fields";
import { CopyButton } from "@/modules/directory/components/CopyButton";

interface LocationOption { id: string; name: string }

interface Props {
  initialContacts: Contact[];
  locations: LocationOption[];
  canWrite: boolean;
  initialExpandId?: string | null;
  /** Supplier dossier (products + price history) rendered inside a provider row */
  renderDossier?: (contactId: string) => React.ReactNode;
}

type FormState = {
  name: string;
  contact_type: ContactType | "";
  company: string;
  company_name_th: string;
  email: string;
  phone: string;
  line_id: string;
  preferred_channel: string;
  payment_terms: string;
  lead_time_days: string;
  address: string;
  address_th: string;
  tax_id: string;
  branch: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "", contact_type: "", company: "", company_name_th: "",
  email: "", phone: "", line_id: "", preferred_channel: "", payment_terms: "", lead_time_days: "",
  address: "", address_th: "",
  tax_id: "", branch: "", notes: "",
};

function contactToForm(c: Contact): FormState {
  return {
    name: c.name, contact_type: c.contact_type,
    company: c.company ?? "", company_name_th: c.company_name_th ?? "",
    email: c.email ?? "", phone: c.phone ?? "",
    line_id: c.line_id ?? "", preferred_channel: c.preferred_channel ?? "",
    payment_terms: c.payment_terms ?? "",
    lead_time_days: c.lead_time_days !== null && c.lead_time_days !== undefined ? String(c.lead_time_days) : "",
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

/* Same expand/collapse system as the employees table */
function useExpandable() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mountedId, setMountedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }, []);

  function expand(id: string) {
    if (collapseTimer.current) { clearTimeout(collapseTimer.current); collapseTimer.current = null; }
    const alreadyExpanded = expandedId === id;
    setMountedId(id);
    setExpandedId(id);
    if (!alreadyExpanded || !panelOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setPanelOpen(true)));
    }
  }

  function collapse() {
    setPanelOpen(false);
    setExpandedId(null);
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => { setMountedId(null); collapseTimer.current = null; }, 260);
  }

  function toggle(id: string) {
    if (expandedId === id) collapse();
    else expand(id);
  }

  return { expandedId, mountedId, panelOpen, expand, collapse, toggle };
}

function ViewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 120 }}>
      <span className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--fg)" }}>{children}</span>
    </div>
  );
}

export function ContactsClient({ initialContacts, locations, canWrite, initialExpandId, renderDossier }: Props) {
  const [contacts, setContacts] = useState(initialContacts);
  const [typeFilter, setTypeFilter] = useState<ContactType | "">("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formLocIds, setFormLocIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { expandedId, mountedId, panelOpen, expand, collapse } = useExpandable();
  const rowRefs = useRef(new Map<string, HTMLTableRowElement | null>());

  useEffect(() => {
    if (!deleteTarget) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setDeleteTarget(null); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget]);

  /* Deep link (command palette): open the matching row */
  useEffect(() => {
    if (initialExpandId && contacts.some((c) => c.id === initialExpandId)) {
      expand(initialExpandId);
      window.setTimeout(() => {
        rowRefs.current.get(initialExpandId)?.scrollIntoView({ block: "start" });
      }, 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let result = contacts;
    if (typeFilter) result = result.filter((c) => c.contact_type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.line_id ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, typeFilter, search]);

  function openAdd() {
    setForm(EMPTY_FORM); setFormLocIds(new Set()); setShowAdd(true);
  }
  function startEdit(c: Contact) {
    setForm(contactToForm(c));
    setFormLocIds(new Set((c.contact_locations ?? []).map((cl) => cl.location_id)));
    setEditingId(c.id);
  }
  function toggleRow(c: Contact) {
    if (expandedId === c.id) {
      collapse();
      setEditingId(null);
    } else {
      expand(c.id);
      setEditingId(null);
      window.setTimeout(() => {
        rowRefs.current.get(c.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }

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
          line_id: form.line_id || undefined, preferred_channel: form.preferred_channel || undefined,
          payment_terms: form.payment_terms || undefined,
          lead_time_days: form.lead_time_days.trim() ? Number(form.lead_time_days) : undefined,
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
      setShowAdd(false); toast.success("Contact added");
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
          line_id: form.line_id || null, preferred_channel: form.preferred_channel || null,
          payment_terms: form.payment_terms || null,
          lead_time_days: form.lead_time_days.trim() ? Number(form.lead_time_days) : null,
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
      setEditingId(null); toast.success("Contact updated");
    } finally { setSubmitting(false); }
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete contact"); return; }
      setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (expandedId === deleteTarget.id) { collapse(); setEditingId(null); }
      setDeleteTarget(null); toast.success("Contact deleted");
    } finally { setDeleting(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Toolbar (no page header — lives inside the Directory tab) */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--fg-4)", marginRight: "auto" }}>
          {filtered.length} of {contacts.length} contacts
        </span>
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

      {/* Inline add form (same system as employees) */}
      {showAdd && (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--accent-soft)", padding: 16 }}>
          <ContactForm
            form={form}
            locIds={formLocIds}
            locations={locations}
            onChange={(key, val) => setForm((prev) => ({ ...prev, [key]: val }))}
            onToggleLoc={toggleLoc}
            onSubmit={(e) => void handleAdd(e)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowAdd(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" size="sm" form="contact-form" disabled={submitting}>{submitting ? "Saving…" : "Add contact"}</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--fg-4)" }}>No contacts found.</p>
      ) : (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "transparent" }}>
              <tr>
                {["Name", "Type", "Company", "Contact", "Locations", ""].map((h, i) => (
                  <th key={i} className="eyebrow" style={{ padding: "10px 16px", textAlign: i === 5 ? "right" : "left", color: "var(--fg-4)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isExpanded = expandedId === c.id;
                const isMounted = mountedId === c.id;
                const isEditing = editingId === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr
                      ref={(el) => { rowRefs.current.set(c.id, el); }}
                      onClick={() => toggleRow(c)}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "var(--row-hover)"; }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                      title={isExpanded ? "Click to collapse" : "Click to view"}
                      style={{
                        background: isExpanded ? "var(--accent-soft)" : "transparent",
                        borderTop: "1px solid var(--line)",
                        cursor: "pointer",
                        transition: "background 150ms",
                        scrollMarginTop: "calc(var(--topbar-h) + 12px)",
                      }}
                    >
                      <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--fg)" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <ChevronDownIcon size={13} style={{ color: "var(--fg-4)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 150ms", flexShrink: 0 }} />
                          {c.name}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <Pill tone={TYPE_TONE[c.contact_type]} size="sm">{CONTACT_TYPE_LABELS[c.contact_type]}</Pill>
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }}>
                        {c.company && <div>{c.company}</div>}
                        {c.tax_id && <div style={{ opacity: 0.6, fontSize: 11 }}>Tax: {c.tax_id}</div>}
                        {!c.company && <span style={{ color: "var(--fg-4)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }}>
                        {c.email && <div>{c.email}</div>}
                        {c.phone && <div>{c.phone}</div>}
                        {c.line_id && <div>Line: {c.line_id}</div>}
                        {!c.email && !c.phone && !c.line_id && <span style={{ color: "var(--fg-4)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }}>
                        {(c.contact_locations && c.contact_locations.length > 0)
                          ? c.contact_locations.map((cl) => cl.location_name).join(", ")
                          : <span style={{ color: "var(--fg-4)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                          {canWrite && (
                            <button
                              style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r-sm)", border: "none", background: "transparent", color: "var(--fg-4)", cursor: "pointer" }}
                              onClick={() => { expand(c.id); startEdit(c); }} title="Edit"
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
                            >
                              <PencilIcon style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r-sm)", border: "none", background: "transparent", color: "var(--fg-4)", cursor: "pointer" }}
                              onClick={() => setDeleteTarget({ id: c.id, name: c.name })} title="Delete"
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bad)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
                            >
                              <Trash2Icon style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isMounted && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, border: 0 }}>
                          <div className="emp-accordion" data-open={isExpanded && panelOpen ? "true" : "false"}>
                            <div className="emp-accordion-inner">
                              <div style={{ padding: "0 16px 12px", background: "var(--accent-soft)" }}>
                                {isEditing ? (
                                  <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 16 }}>
                                    <ContactForm
                                      form={form}
                                      locIds={formLocIds}
                                      locations={locations}
                                      onChange={(key, val) => setForm((prev) => ({ ...prev, [key]: val }))}
                                      onToggleLoc={toggleLoc}
                                      onSubmit={(e) => void handleEdit(e)}
                                    />
                                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                      <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)} disabled={submitting}>Cancel</Button>
                                      <Button type="submit" size="sm" form="contact-form" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <ContactViewPanel
                                    contact={c}
                                    canWrite={canWrite}
                                    dossier={c.contact_type === "provider" && renderDossier ? renderDossier(c.id) : null}
                                    onEdit={() => startEdit(c)}
                                    onCollapse={() => { collapse(); setEditingId(null); }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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

function ContactViewPanel({
  contact: c, canWrite, dossier, onEdit, onCollapse,
}: {
  contact: Contact;
  canWrite: boolean;
  dossier: React.ReactNode;
  onEdit: () => void;
  onCollapse: () => void;
}) {
  const sectionStyle: React.CSSProperties = { borderBottom: "1px solid var(--line)", paddingBottom: 12 };
  return (
    <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={sectionStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <ViewField label="Name">{c.name}</ViewField>
          {c.company && <ViewField label="Company">{c.company}</ViewField>}
          <ViewField label="Type">{CONTACT_TYPE_LABELS[c.contact_type]}</ViewField>
        </div>
      </div>

      <div style={sectionStyle}>
        <span className="eyebrow">Contact</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: "var(--s-2)" }}>
          {c.phone && <ViewField label="Phone"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{c.phone}<CopyButton value={c.phone} label="Phone" /></span></ViewField>}
          {c.line_id && <ViewField label="Line"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{c.line_id}<CopyButton value={c.line_id} label="Line ID" /></span></ViewField>}
          {c.email && <ViewField label="Email"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{c.email}<CopyButton value={c.email} label="Email" /></span></ViewField>}
          {c.preferred_channel && <ViewField label="Preferred"> {c.preferred_channel}</ViewField>}
          {c.address && <ViewField label="Address">{c.address}</ViewField>}
        </div>
      </div>

      {(c.company_name_th || c.tax_id || c.branch || c.payment_terms || c.lead_time_days !== null) && (
        <div style={sectionStyle}>
          <span className="eyebrow">Business</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: "var(--s-2)" }}>
            {c.company_name_th && <ViewField label="Company (TH)">{c.company_name_th}</ViewField>}
            {c.tax_id && <ViewField label="Tax ID"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{c.tax_id}<CopyButton value={c.tax_id} label="Tax ID" /></span></ViewField>}
            {c.branch && <ViewField label="Branch">{c.branch}</ViewField>}
            {c.payment_terms && <ViewField label="Payment">{c.payment_terms}</ViewField>}
            {c.lead_time_days !== null && c.lead_time_days !== undefined && <ViewField label="Lead time">{c.lead_time_days} day(s)</ViewField>}
            {c.address_th && <ViewField label="Address (TH)">{c.address_th}</ViewField>}
          </div>
        </div>
      )}

      {dossier && (
        <div style={sectionStyle}>
          <span className="eyebrow">Supplier dossier</span>
          <div style={{ marginTop: "var(--s-2)" }}>{dossier}</div>
        </div>
      )}

      {c.notes && (
        <div style={sectionStyle}>
          <span className="eyebrow">Notes</span>
          <p style={{ fontSize: 13, color: "var(--fg-3)", margin: "var(--s-2) 0 0", whiteSpace: "pre-wrap" }}>{c.notes}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, paddingTop: "var(--s-3)", borderTop: "1px solid var(--line)" }}>
        {canWrite && (
          <Button size="sm" onClick={onEdit}>
            <PencilIcon className="size-3.5" />
            Edit
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onCollapse}>Close</Button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
  background: "var(--bg-2)", padding: "0 var(--s-3)",
  fontSize: 13, color: "var(--fg)", outline: "none", width: "100%",
};

function ContactField({
  label, value, type = "text", placeholder, required, onChange,
}: {
  label: string; value: string; type?: string; placeholder?: string; required?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label className="eyebrow" style={{ color: "var(--fg-4)" }}>
        {label}{required && <span style={{ color: "var(--bad)", marginLeft: 2 }}>*</span>}
      </label>
      <input type={type} required={required} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function ContactForm({
  form, locIds, locations, onChange, onToggleLoc, onSubmit,
}: {
  form: FormState; locIds: Set<string>; locations: LocationOption[];
  onChange: (key: keyof FormState, val: string) => void;
  onToggleLoc: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  // Fields adapt to the contact type: a bank doesn't need purchasing info, etc.
  const cfg = CONTACT_TYPE_FIELDS[form.contact_type || "other"];
  const set = (field: keyof FormState) => (v: string) => onChange(field, v);

  return (
    <form id="contact-form" onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>{cfg.hint}</p>
      {/* Identity */}
      <div>
        <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: "var(--s-3)" }}>Identity</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
          <ContactField label="Name" value={form.name} placeholder="Full name" required onChange={set("name")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Type <span style={{ color: "var(--bad)" }}>*</span></label>
            <select required value={form.contact_type} onChange={(e) => onChange("contact_type", e.target.value)} style={inputStyle}>
              <option value="">— Select type —</option>
              {CONTACT_TYPES.map((t) => <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <ContactField label="Company (EN)" value={form.company} placeholder="Company name" onChange={set("company")} />
        </div>
      </div>

      {/* Contact details */}
      <div>
        <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: "var(--s-3)" }}>Contact details</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
          <ContactField label="Email" value={form.email} type="email" placeholder="contact@example.com" onChange={set("email")} />
          <ContactField label="Phone" value={form.phone} placeholder="+66 xx xxx xxxx" onChange={set("phone")} />
          {cfg.directChannel && (
            <>
              <ContactField label="Line ID" value={form.line_id} placeholder="@supplier…" onChange={set("line_id")} />
              <ContactField label="Preferred channel" value={form.preferred_channel} placeholder="Line / Phone / Email" onChange={set("preferred_channel")} />
            </>
          )}
          <div style={{ gridColumn: "span 2" }}>
            <ContactField label="Address" value={form.address} placeholder="Street address" onChange={set("address")} />
          </div>
        </div>
      </div>

      {/* Business info */}
      {cfg.business && (
      <div>
        <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: "var(--s-3)" }}>Business info</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
          <div style={{ gridColumn: "span 2" }}>
            <ContactField label="Company name (TH)" value={form.company_name_th} placeholder="บริษัท … จำกัด" onChange={set("company_name_th")} />
          </div>
          <ContactField label="Tax ID" value={form.tax_id} placeholder="0000000000000" onChange={set("tax_id")} />
          <ContactField label="Branch" value={form.branch} placeholder="Head Office" onChange={set("branch")} />
          {cfg.purchasing && (
            <>
              <ContactField label="Payment terms" value={form.payment_terms} placeholder="Cash / 30 days…" onChange={set("payment_terms")} />
              <ContactField label="Lead time (days)" value={form.lead_time_days} placeholder="3" onChange={set("lead_time_days")} />
            </>
          )}
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
      )}

      {/* Location tags */}
      {cfg.locations && locations.length > 0 && (
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
