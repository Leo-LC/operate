"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  PlusIcon, ExternalLinkIcon, TrashIcon, XIcon,
  DownloadIcon, UploadIcon, ListIcon, CalendarIcon, RefreshCwIcon,
} from "lucide-react";
import { DocumentsCalendar } from "@/modules/documents/components/DocumentsCalendar";
import { DateInput } from "@/components/ui/date-input";
import {
  computeStatus, daysUntilExpiry,
  DOCUMENT_TYPE_LABELS, STATUS_CLASSES, STATUS_LABELS,
  type Document, type DocumentStatus, type DocumentType,
} from "@/modules/documents/types";
import { ALL_CATEGORIES, CATEGORY_ORDER } from "@/modules/documents/masterList";
import type { AdminLocation } from "@/modules/admin/types";

// ─── constants ────────────────────────────────────────────────────────────────

const ALL_TYPES: DocumentType[] = [
  "permit", "license", "certificate", "contract", "insurance", "health", "legal", "hr", "other",
];

const STATUS_FILTERS: Array<{ value: "" | DocumentStatus; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "expired", label: "Expired" },
  { value: "expiring", label: "Expiring soon" },
  { value: "missing", label: "Missing" },
  { value: "valid", label: "Valid" },
];

// ─── types ────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  thai_form_name: string;
  code: string;
  category: string;
  authority: string;
  frequency: string;
  document_type: DocumentType;
  location_id: string;
  is_relevant: boolean;
  has_document: boolean;
  issued_at: string;
  expires_at: string;
  reminder_days_override: string;
  drive_url: string;
  notes: string;
  shop_notes: string;
}

const EMPTY_FORM: FormState = {
  title: "", thai_form_name: "", code: "", category: "", authority: "",
  frequency: "", document_type: "other", location_id: "",
  is_relevant: true, has_document: false, issued_at: "", expires_at: "",
  reminder_days_override: "", drive_url: "", notes: "", shop_notes: "",
};

interface DocumentsClientProps {
  initialDocuments: Document[];
  locations: AdminLocation[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function ExpiryCell({ expires_at }: { expires_at: string | null }) {
  if (!expires_at) return <span className="text-muted-foreground/40">—</span>;
  const days = daysUntilExpiry(expires_at);
  if (days === null) return <span className="text-muted-foreground/40">—</span>;
  if (days < 0) {
    return <span className="text-[var(--destructive)] font-medium">{-days}d overdue</span>;
  }
  if (days === 0) return <span className="text-[var(--destructive)] font-medium">Today</span>;
  if (days <= 30) return <span className="text-amber-600 font-medium">In {days}d</span>;
  return <span className="text-muted-foreground">{new Date(expires_at).toLocaleDateString()}</span>;
}

function HasDocBadge({ has_document }: { has_document: boolean }) {
  if (has_document) {
    return <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-[color-mix(in_oklch,var(--success)_12%,transparent)] text-[var(--success)]">Yes</span>;
  }
  return <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">—</span>;
}

// ─── main component ───────────────────────────────────────────────────────────

export function DocumentsClient({ initialDocuments, locations }: DocumentsClientProps) {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "owner";

  const [documents, setDocuments] = useState(initialDocuments);
  const [view, setView] = useState<"table" | "calendar">("table");
  const [statusFilter, setStatusFilter] = useState<"" | DocumentStatus>("");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // ── derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let total = 0, missing = 0, expiring = 0, expired = 0, valid = 0, notRelevant = 0;
    for (const d of documents) {
      total++;
      if (!d.is_relevant) { notRelevant++; continue; }
      const s = computeStatus(d);
      if (s === "expired") expired++;
      else if (s === "expiring") expiring++;
      else if (s === "missing") missing++;
      else if (s === "valid") valid++;
    }
    return { total, missing, expiring, expired, valid, notRelevant };
  }, [documents]);

  // ── filtered view ────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter((d) => {
      const effectiveStatus = computeStatus(d);
      if (statusFilter && effectiveStatus !== statusFilter) return false;
      if (locationFilter && d.location_id !== locationFilter) return false;
      if (categoryFilter && d.category !== categoryFilter) return false;
      if (q) {
        const haystack = `${d.title} ${d.code ?? ""} ${d.thai_form_name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [documents, statusFilter, locationFilter, categoryFilter, search]);

  const groupedDisplayed = useMemo(() => {
    const groups: Record<string, typeof displayed> = {};
    for (const d of displayed) {
      const cat = d.category ?? "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    }
    return CATEGORY_ORDER.filter((c) => groups[c]).map((c) => ({ category: c, docs: groups[c] }));
  }, [displayed]);

  // ── form helpers ─────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(doc: Document) {
    setEditingId(doc.id);
    setForm({
      title: doc.title,
      thai_form_name: doc.thai_form_name ?? "",
      code: doc.code ?? "",
      category: doc.category ?? "",
      authority: doc.authority ?? "",
      frequency: doc.frequency ?? "",
      document_type: doc.document_type,
      location_id: doc.location_id ?? "",
      is_relevant: doc.is_relevant,
      has_document: doc.has_document,
      issued_at: doc.issued_at ?? "",
      expires_at: doc.expires_at ?? "",
      reminder_days_override: doc.reminder_days_override != null ? String(doc.reminder_days_override) : "",
      drive_url: doc.drive_url ?? "",
      notes: doc.notes ?? "",
      shop_notes: doc.shop_notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // ── submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      title: form.title,
      thai_form_name: form.thai_form_name || null,
      code: form.code || null,
      category: form.category || null,
      authority: form.authority || null,
      frequency: form.frequency || null,
      document_type: form.document_type,
      location_id: form.location_id || null,
      is_relevant: form.is_relevant,
      has_document: form.has_document,
      drive_url: form.drive_url || null,
      issued_at: form.issued_at || null,
      expires_at: form.expires_at || null,
      reminder_days_override: form.reminder_days_override ? Number(form.reminder_days_override) : null,
      notes: form.notes || null,
      shop_notes: form.shop_notes || null,
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

  useEffect(() => {
    if (!showForm) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeForm(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showForm]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/documents/sync", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Sync failed");
        return;
      }
      const result = await res.json() as { created: number; skipped: number };
      if (result.created === 0) {
        toast.success("Checklist up to date — no new rows needed");
      } else {
        toast.success(`Synced: ${result.created} new document rows created`);
        // Reload page data
        window.location.reload();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents/import", { method: "POST", body: fd });
      const result = await res.json() as { inserted?: number; skipped?: number; errors?: string[]; error?: string };
      if (!res.ok) {
        toast.error(result.error ?? "Import failed");
        return;
      }
      const { inserted = 0, skipped = 0, errors: rowErrors = [] } = result;
      if (rowErrors.length > 0) {
        toast.warning(`Imported ${inserted} rows. ${rowErrors.length} row(s) had errors — check console.`);
        console.warn("Import row errors:", rowErrors);
      } else {
        toast.success(`Imported ${inserted} row(s), skipped ${skipped} duplicate(s)`);
      }
      if (inserted > 0) window.location.reload();
    } finally {
      setImporting(false);
    }
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold">Documents</h1>
          <p className="text-xs text-muted-foreground">
            Track required documents, expiry dates, and compliance status by location.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs ${view === "table" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
            >
              <ListIcon className="size-3.5" /> Table
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-border ${view === "calendar" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
            >
              <CalendarIcon className="size-3.5" /> Calendar
            </button>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={() => void handleSync()}
            disabled={syncing}
            className="gap-1.5"
            title="Generate missing checklist rows for all active locations"
          >
            <RefreshCwIcon className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync checklist"}
          </Button>
          <a href="/api/documents/export" download>
            <Button size="sm" variant="outline" className="gap-1.5">
              <DownloadIcon className="size-4" />
              Export CSV
            </Button>
          </a>
          <a href="/api/documents/template" download>
            <Button size="sm" variant="outline" className="gap-1.5">
              <DownloadIcon className="size-4" />
              Import template
            </Button>
          </a>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => void handleImport(e)}
          />
          <Button
            size="sm" variant="outline" className="gap-1.5"
            disabled={importing}
            onClick={() => importInputRef.current?.click()}
          >
            <UploadIcon className="size-4" />
            {importing ? "Importing…" : "Import CSV"}
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <PlusIcon className="size-4" />
            Add document
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {documents.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Total tracked</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <div className={`rounded-lg border p-3 ${stats.missing > 0 ? "border-red-500/30 bg-red-500/5" : "border-border bg-muted/30"}`}>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Missing</p>
            <p className={`text-xl font-bold ${stats.missing > 0 ? "text-[var(--destructive)]" : ""}`}>{stats.missing}</p>
          </div>
          <div className={`rounded-lg border p-3 ${stats.expiring > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/30"}`}>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Expiring soon</p>
            <p className={`text-xl font-bold ${stats.expiring > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>{stats.expiring}</p>
          </div>
          <div className={`rounded-lg border p-3 ${stats.expired > 0 ? "border-red-500/30 bg-red-500/5" : "border-border bg-muted/30"}`}>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Expired</p>
            <p className={`text-xl font-bold ${stats.expired > 0 ? "text-[var(--destructive)]" : ""}`}>{stats.expired}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Valid</p>
            <p className="text-xl font-bold">{stats.valid}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Not relevant</p>
            <p className="text-xl font-bold text-muted-foreground">{stats.notRelevant}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs w-44"
        />
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
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {displayed.length} document{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <DocumentsCalendar documents={displayed} onEdit={openEdit} />
      )}

      {/* Table view */}
      {view === "table" && (
        documents.length === 0 ? (
          <div className="rounded-lg border border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground mb-1">No documents yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Start by syncing the master checklist to all locations.
            </p>
            <Button size="sm" variant="outline" onClick={() => void handleSync()} disabled={syncing} className="gap-1.5">
              <RefreshCwIcon className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync master checklist to all locations"}
            </Button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
            No documents match these filters.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedDisplayed.map(({ category, docs }) => {
              const attentionCount = docs.filter((d) => {
                if (!d.is_relevant) return false;
                const s = computeStatus(d);
                return s === "missing" || s === "expired" || s === "expiring";
              }).length;
              return (
                <div key={category} className="rounded-lg border border-border overflow-x-auto">
                  <div className="flex items-center gap-2 bg-muted/40 px-4 py-2 border-b border-border">
                    <span className="text-xs font-semibold text-foreground">{category}</span>
                    <span className="text-xs text-muted-foreground">{docs.length}</span>
                    {attentionCount > 0 && (
                      <span className="ml-auto inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {attentionCount} need attention
                      </span>
                    )}
                  </div>
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-muted-foreground">Code</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-muted-foreground">Document</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-muted-foreground">Location</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-muted-foreground">Has doc</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium text-muted-foreground">Expiry / due</th>
                        <th className="px-4 py-2 w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {docs.map((doc) => {
                        const effectiveStatus = computeStatus(doc);
                        const notRelevant = !doc.is_relevant;
                        const urgent = !notRelevant && (effectiveStatus === "missing" || effectiveStatus === "expired");
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => openEdit(doc)}
                            className={[
                              "hover:bg-muted/20 transition-colors group cursor-pointer",
                              urgent ? "bg-red-50/30 dark:bg-red-950/10" : "",
                              notRelevant ? "opacity-50" : "",
                            ].filter(Boolean).join(" ")}
                          >
                            {/* Code */}
                            <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                              {doc.code ?? <span className="text-muted-foreground/30">—</span>}
                            </td>
                            {/* Document + Thai form */}
                            <td className="px-4 py-2.5">
                              <div className="flex flex-col gap-0.5 min-w-[160px]">
                                <div className="flex items-center gap-1.5 font-medium text-sm leading-none">
                                  {doc.title}
                                  {doc.drive_url && (
                                    <a
                                      href={doc.drive_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground/60 hover:text-foreground shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Open in Drive"
                                    >
                                      <ExternalLinkIcon className="size-3" />
                                    </a>
                                  )}
                                </div>
                                {doc.thai_form_name && (
                                  <span className="text-[11px] text-muted-foreground/70 leading-none">{doc.thai_form_name}</span>
                                )}
                              </div>
                            </td>
                            {/* Location */}
                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                              {doc.location_name ?? <span className="text-muted-foreground/40">Org-wide</span>}
                            </td>
                            {/* Has document */}
                            <td className="px-4 py-2.5">
                              <HasDocBadge has_document={doc.has_document} />
                            </td>
                            {/* Status */}
                            <td className="px-4 py-2.5">
                              {notRelevant ? (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground/60">
                                  Not relevant
                                </span>
                              ) : (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[effectiveStatus]}`}>
                                  {STATUS_LABELS[effectiveStatus]}
                                </span>
                              )}
                            </td>
                            {/* Expiry */}
                            <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                              <ExpiryCell expires_at={doc.expires_at} />
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              );
            })}
          </div>
        )
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8 overflow-y-auto"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-border bg-background p-5 shadow-xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold">{editingId ? "Edit document" : "Add document"}</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">

              {/* Prominent relevance & has-document toggles */}
              <div className="rounded-lg bg-muted/30 border border-border/50 p-4 flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_relevant}
                    onChange={(e) => setForm((f) => ({ ...f, is_relevant: e.target.checked }))}
                    className="size-4 rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">Relevant to this location</p>
                    <p className="text-xs text-muted-foreground">Uncheck if this document doesn&apos;t apply to the selected shop</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.has_document}
                    onChange={(e) => setForm((f) => ({ ...f, has_document: e.target.checked }))}
                    className="size-4 rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">We have this document</p>
                    <p className="text-xs text-muted-foreground">Check when the physical or digital copy is in hand</p>
                  </div>
                </label>
              </div>

              {/* Section: Base document info (locked for non-owners) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Document info</p>
                  {!isOwner ? (
                    <span className="text-[10px] text-muted-foreground/60 italic">— managed centrally</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 italic">— name/code changes apply to all locations</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Document name {isOwner && <span className="text-destructive">*</span>}</label>
                    {isOwner ? (
                      <input
                        required
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        placeholder="e.g. Restaurant License"
                      />
                    ) : (
                      <p className="h-8 flex items-center px-2 text-sm text-foreground">{form.title}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Thai form name</label>
                    {isOwner ? (
                      <input
                        value={form.thai_form_name}
                        onChange={(e) => setForm((f) => ({ ...f, thai_form_name: e.target.value }))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        placeholder="e.g. ใบอนุญาต"
                      />
                    ) : (
                      <p className="h-8 flex items-center px-2 text-sm text-muted-foreground">{form.thai_form_name || "—"}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Document code</label>
                    {isOwner ? (
                      <input
                        value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm font-mono"
                        placeholder="e.g. FOOD_LICENSE"
                      />
                    ) : (
                      <p className="h-8 flex items-center px-2 text-sm font-mono text-muted-foreground">{form.code || "—"}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    {isOwner ? (
                      <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="h-8 rounded-md border border-input bg-background pl-2 pr-8 text-sm"
                      >
                        <option value="">Select category</option>
                        {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <p className="h-8 flex items-center px-2 text-sm text-muted-foreground">{form.category || "—"}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    {isOwner ? (
                      <select
                        value={form.document_type}
                        onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value as DocumentType }))}
                        className="h-8 rounded-md border border-input bg-background pl-2 pr-8 text-sm"
                      >
                        {ALL_TYPES.map((t) => (
                          <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="h-8 flex items-center px-2 text-sm text-muted-foreground">{DOCUMENT_TYPE_LABELS[form.document_type]}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Authority / issuer</label>
                    {isOwner ? (
                      <input
                        value={form.authority}
                        onChange={(e) => setForm((f) => ({ ...f, authority: e.target.value }))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        placeholder="e.g. District Office"
                      />
                    ) : (
                      <p className="h-8 flex items-center px-2 text-sm text-muted-foreground">{form.authority || "—"}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Frequency</label>
                    {isOwner ? (
                      <input
                        value={form.frequency}
                        onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        placeholder="e.g. Yearly, Monthly, Once"
                      />
                    ) : (
                      <p className="h-8 flex items-center px-2 text-sm text-muted-foreground">{form.frequency || "—"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section: Shop tracking */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Shop tracking</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Location</label>
                    <select
                      value={form.location_id}
                      onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
                      className="h-8 rounded-md border border-input bg-background pl-2 pr-8 text-sm"
                    >
                      <option value="">Org-wide</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Shop notes</label>
                    <textarea
                      value={form.shop_notes}
                      onChange={(e) => setForm((f) => ({ ...f, shop_notes: e.target.value }))}
                      rows={2}
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
                      placeholder="Location-specific notes"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Dates */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dates</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Issue date</label>
                    <DateInput
                      value={form.issued_at}
                      onChange={(e) => setForm((f) => ({ ...f, issued_at: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Expiry / next due</label>
                    <DateInput
                      value={form.expires_at}
                      onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Reminder days before</label>
                    <input
                      type="number"
                      min={1}
                      value={form.reminder_days_override}
                      onChange={(e) => setForm((f) => ({ ...f, reminder_days_override: e.target.value }))}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Storage */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Storage</p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Drive link</label>
                  <input
                    type="url"
                    value={form.drive_url}
                    onChange={(e) => setForm((f) => ({ ...f, drive_url: e.target.value }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                    placeholder="https://drive.google.com/…"
                  />
                </div>
              </div>

              {/* Section: Notes */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notes</p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">General notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
                    placeholder="Optional operational notes"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-border">
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
