"use client";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, ExternalLinkIcon, PencilIcon, TrashIcon, XIcon } from "lucide-react";
import {
  computeStatus,
  DOCUMENT_TYPE_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  type Document,
  type DocumentStatus,
  type DocumentType,
} from "@/modules/documents/types";
import type { AdminLocation } from "@/modules/admin/types";

const ALL_TYPES: DocumentType[] = [
  "permit", "license", "certificate", "contract", "insurance", "health", "legal", "hr", "other",
];
const STATUS_FILTERS: Array<{ value: "" | DocumentStatus; label: string }> = [
  { value: "", label: "All" },
  { value: "expired", label: "Expired" },
  { value: "expiring", label: "Expiring soon" },
  { value: "missing", label: "Missing" },
  { value: "to_review", label: "To review" },
  { value: "valid", label: "Valid" },
  { value: "archived", label: "Archived" },
  { value: "replaced", label: "Replaced" },
];

interface FormState {
  title: string;
  document_type: DocumentType;
  status: DocumentStatus;
  location_id: string;
  drive_url: string;
  issued_at: string;
  expires_at: string;
  responsible_person: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  document_type: "other",
  status: "valid",
  location_id: "",
  drive_url: "",
  issued_at: "",
  expires_at: "",
  responsible_person: "",
  notes: "",
};

interface DocumentsClientProps {
  initialDocuments: Document[];
  locations: AdminLocation[];
}

export function DocumentsClient({ initialDocuments, locations }: DocumentsClientProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [statusFilter, setStatusFilter] = useState<"" | DocumentStatus>("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const displayed = useMemo(() => {
    return documents.filter((d) => {
      const effectiveStatus = computeStatus(d);
      if (statusFilter && effectiveStatus !== statusFilter) return false;
      if (locationFilter && d.location_id !== locationFilter) return false;
      if (typeFilter && d.document_type !== typeFilter) return false;
      return true;
    });
  }, [documents, statusFilter, locationFilter, typeFilter]);

  const counts = useMemo(() => {
    const c = { expired: 0, expiring: 0, missing: 0 };
    for (const d of documents) {
      const s = computeStatus(d);
      if (s === "expired") c.expired++;
      else if (s === "expiring") c.expiring++;
      else if (s === "missing") c.missing++;
    }
    return c;
  }, [documents]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(doc: Document) {
    setEditingId(doc.id);
    setForm({
      title: doc.title,
      document_type: doc.document_type,
      status: doc.status,
      location_id: doc.location_id ?? "",
      drive_url: doc.drive_url ?? "",
      issued_at: doc.issued_at ?? "",
      expires_at: doc.expires_at ?? "",
      responsible_person: doc.responsible_person ?? "",
      notes: doc.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      title: form.title,
      document_type: form.document_type,
      status: form.status,
      location_id: form.location_id || null,
      drive_url: form.drive_url || null,
      issued_at: form.issued_at || null,
      expires_at: form.expires_at || null,
      responsible_person: form.responsible_person || null,
      notes: form.notes || null,
    };
    try {
      const url = editingId ? `/api/documents/${editingId}` : "/api/documents";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Save failed");
        return;
      }
      const saved = await res.json() as Document;
      const loc = locations.find((l) => l.id === saved.location_id);
      const withLoc: Document = { ...saved, location_name: loc?.name ?? null };
      if (editingId) {
        setDocuments((prev) => prev.map((d) => d.id === editingId ? withLoc : d));
        toast.success("Document updated");
      } else {
        setDocuments((prev) => [...prev, withLoc]);
        toast.success("Document added");
      }
      closeForm();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    toast.success("Document deleted");
  }

  async function handleMarkChecked(doc: Document) {
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ last_checked_at: new Date().toISOString() }),
    });
    if (!res.ok) { toast.error("Update failed"); return; }
    const updated = await res.json() as Document;
    setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...updated, location_name: doc.location_name } : d));
    toast.success("Marked as checked");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold">Documents</h1>
          {(counts.expired > 0 || counts.expiring > 0 || counts.missing > 0) && (
            <p className="text-xs text-muted-foreground">
              {counts.expired > 0 && <span className="text-[var(--destructive)] font-medium">{counts.expired} expired</span>}
              {counts.expired > 0 && (counts.expiring > 0 || counts.missing > 0) && <span className="mx-1">·</span>}
              {counts.expiring > 0 && <span className="text-amber-600 font-medium">{counts.expiring} expiring soon</span>}
              {counts.expiring > 0 && counts.missing > 0 && <span className="mx-1">·</span>}
              {counts.missing > 0 && <span className="text-muted-foreground">{counts.missing} missing</span>}
            </p>
          )}
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <PlusIcon className="size-4" />
          Add document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | DocumentStatus)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {STATUS_FILTERS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">All locations</option>
          <option value="__none">Org-wide (no location)</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">All types</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {displayed.length} document{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="rounded-lg border border-border py-12 text-center text-sm text-muted-foreground">
          No documents found. Add one to get started.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Expires</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Responsible</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map((doc) => {
                const effectiveStatus = computeStatus(doc);
                return (
                  <tr key={doc.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2.5 font-medium">
                      <div className="flex items-center gap-2">
                        {doc.title}
                        {doc.drive_url && (
                          <a
                            href={doc.drive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground/60 hover:text-foreground transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLinkIcon className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {DOCUMENT_TYPE_LABELS[doc.document_type]}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[effectiveStatus]}`}>
                        {STATUS_LABELS[effectiveStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {doc.location_name ?? <span className="text-muted-foreground/40">Org-wide</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {doc.expires_at
                        ? new Date(doc.expires_at).toLocaleDateString()
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {doc.responsible_person ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => void handleMarkChecked(doc)}
                          className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border/60 hover:bg-muted transition-colors"
                          title="Mark as checked today"
                        >
                          Checked
                        </button>
                        <button
                          onClick={() => openEdit(doc)}
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button
                          onClick={() => void handleDelete(doc.id)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">{editingId ? "Edit document" : "Add document"}</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Title *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    placeholder="e.g. Operating license — Samui"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select
                    value={form.document_type}
                    onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value as DocumentType }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {ALL_TYPES.map((t) => (
                      <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DocumentStatus }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {(["valid", "missing", "to_review", "replaced", "archived"] as DocumentStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Location</label>
                  <select
                    value={form.location_id}
                    onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Org-wide</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Responsible person</label>
                  <input
                    value={form.responsible_person}
                    onChange={(e) => setForm((f) => ({ ...f, responsible_person: e.target.value }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    placeholder="Name"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Issue date</label>
                  <input
                    type="date"
                    value={form.issued_at}
                    onChange={(e) => setForm((f) => ({ ...f, issued_at: e.target.value }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Expiry date</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Drive link</label>
                  <input
                    type="url"
                    value={form.drive_url}
                    onChange={(e) => setForm((f) => ({ ...f, drive_url: e.target.value }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm font-mono text-xs"
                    placeholder="https://drive.google.com/..."
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Saving…" : editingId ? "Save changes" : "Add document"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
