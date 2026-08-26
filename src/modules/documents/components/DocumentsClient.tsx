"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import type { PillTone } from "@/components/ui/pill";
import {
  PlusIcon, ExternalLinkIcon, TrashIcon, XIcon,
  DownloadIcon, UploadIcon, ListIcon, CalendarIcon, RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import { DocumentsCalendar } from "@/modules/documents/components/DocumentsCalendar";
import { DateInput } from "@/components/ui/date-input";
import {
  computeStatus, daysUntilExpiry,
  DOCUMENT_TYPE_LABELS, STATUS_LABELS,
  type Document, type DocumentStatus, type DocumentType,
} from "@/modules/documents/types";
import { ALL_CATEGORIES, CATEGORY_ORDER } from "@/modules/documents/masterList";
import type { AdminLocation } from "@/modules/admin/types";

const STATUS_TONES: Record<DocumentStatus, PillTone> = {
  valid: "good",
  expiring: "warn",
  expired: "bad",
  missing: "bad",
  not_relevant: "neutral",
};

const STATUS_SORT_PRIORITY: Record<DocumentStatus, number> = {
  expired: 0,
  missing: 1,
  expiring: 2,
  valid: 3,
  not_relevant: 4,
};

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
  if (!expires_at) return <span style={{ color: "var(--fg-mute)" }}>—</span>;
  const days = daysUntilExpiry(expires_at);
  if (days === null) return <span style={{ color: "var(--fg-mute)" }}>—</span>;
  if (days < 0) return <span className="mono" style={{ color: "var(--bad)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{-days}d overdue</span>;
  if (days === 0) return <span style={{ color: "var(--bad)", fontWeight: 500 }}>Today</span>;
  if (days <= 30) return <span className="mono" style={{ color: "var(--warn)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>In {days}d</span>;
  return <span className="mono" style={{ color: "var(--fg-3)", fontVariantNumeric: "tabular-nums" }}>{new Date(expires_at).toLocaleDateString()}</span>;
}

function HasDocBadge({ has_document }: { has_document: boolean }) {
  return <Pill tone={has_document ? "good" : "neutral"} size="sm">{has_document ? "Yes" : "—"}</Pill>;
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
    // Sort docs within each category: expired → missing → expiring → valid → not_relevant
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => STATUS_SORT_PRIORITY[computeStatus(a)] - STATUS_SORT_PRIORITY[computeStatus(b)]);
    }
    // Sort categories so those with urgent docs appear first
    const urgencyScore = (cat: string) => {
      let score = 0;
      for (const d of groups[cat]) {
        const s = computeStatus(d);
        if (s === "expired") score += 100;
        else if (s === "missing") score += 10;
        else if (s === "expiring") score += 1;
      }
      return score;
    };
    return CATEGORY_ORDER.filter((c) => groups[c])
      .sort((a, b) => urgencyScore(b) - urgencyScore(a))
      .map((c) => ({ category: c, docs: groups[c] }));
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

  const inputStyle: React.CSSProperties = {
    height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
    background: "var(--bg)", padding: "0 var(--s-3)", fontSize: 13,
    color: "var(--fg)", outline: "none", width: "100%",
  };
  const textareaStyle: React.CSSProperties = {
    borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
    background: "var(--bg)", padding: "var(--s-2) var(--s-3)", fontSize: 13,
    color: "var(--fg)", outline: "none", width: "100%", resize: "none",
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <PageHeader
        eyebrow="Compliance"
        title="Documents"
        subtitle="Track required documents, expiry dates, and compliance status by location."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flexWrap: "wrap" }}>
            {/* View toggle */}
            <div style={{ display: "flex", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", overflow: "hidden" }}>
              {(["table", "calendar"] as const).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "0 var(--s-3)", height: 32, fontSize: 12, cursor: "pointer", border: "none",
                    borderLeft: i > 0 ? "1px solid var(--line)" : "none",
                    background: view === v ? "var(--row-active)" : "var(--bg)",
                    color: view === v ? "var(--fg)" : "var(--fg-4)",
                    transition: "background var(--dur) var(--ease)",
                  }}
                >
                  {v === "table" ? <ListIcon style={{ width: 13, height: 13 }} /> : <CalendarIcon style={{ width: 13, height: 13 }} />}
                  {v === "table" ? "Table" : "Calendar"}
                </button>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={() => void handleSync()} disabled={syncing} title="Generate missing checklist rows">
              <RefreshCwIcon style={{ width: 13, height: 13 }} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync checklist"}
            </Button>
            <a href="/api/documents/export" download style={{ textDecoration: "none" }}>
              <Button size="sm" variant="secondary">
                <DownloadIcon style={{ width: 13, height: 13 }} /> Export CSV
              </Button>
            </a>
            <input ref={importInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => void handleImport(e)} />
            <Button size="sm" variant="secondary" disabled={importing} onClick={() => importInputRef.current?.click()}>
              <UploadIcon style={{ width: 13, height: 13 }} />
              {importing ? "Importing…" : "Import CSV"}
            </Button>
            <Button size="sm" variant="primary" onClick={openAdd}>
              <PlusIcon style={{ width: 13, height: 13 }} /> Add document
            </Button>
          </div>
        }
      />

      {/* Summary stat cards */}
      {documents.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          {[
            { label: "Total tracked", value: stats.total, tone: "neutral" as const },
            { label: "Missing", value: stats.missing, tone: stats.missing > 0 ? "bad" as const : "neutral" as const },
            { label: "Expiring soon", value: stats.expiring, tone: stats.expiring > 0 ? "warn" as const : "neutral" as const },
            { label: "Expired", value: stats.expired, tone: stats.expired > 0 ? "bad" as const : "neutral" as const },
            { label: "Valid", value: stats.valid, tone: stats.valid > 0 ? "good" as const : "neutral" as const },
            { label: "Not relevant", value: stats.notRelevant, tone: "neutral" as const },
          ].map(({ label, value, tone }) => (
            <div
              key={label}
              style={{
                borderRadius: "var(--r-lg)",
                border: `1px solid ${tone === "bad" && value > 0 ? "var(--bad)" : tone === "warn" && value > 0 ? "var(--warn)" : "var(--line)"}`,
                background: tone === "bad" && value > 0 ? "var(--bad-soft)" : tone === "warn" && value > 0 ? "var(--warn-soft)" : "var(--surface)",
                padding: "var(--s-3) var(--s-4)",
              }}
            >
              <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 4 }}>{label}</p>
              <p className="mono" style={{
                fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                color: tone === "bad" && value > 0 ? "var(--bad)" : tone === "warn" && value > 0 ? "var(--warn)" : tone === "good" && value > 0 ? "var(--good)" : "var(--fg)",
              }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--s-2)" }}>
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <SearchIcon style={{ position: "absolute", left: 8, width: 13, height: 13, color: "var(--fg-4)", pointerEvents: "none" }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{ ...inputStyle, width: 180, paddingLeft: 28 }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | DocumentStatus)} style={{ ...inputStyle, width: "auto" }}>
          {STATUS_FILTERS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--fg-4)" }}>
          {displayed.length} document{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Calendar view */}
      {view === "calendar" && <DocumentsCalendar documents={displayed} onEdit={openEdit} />}

      {/* Table view */}
      {view === "table" && (
        documents.length === 0 ? (
          <div
            style={{
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              padding: "48px var(--s-5)", textAlign: "center",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No documents yet</p>
            <p style={{ fontSize: 12, color: "var(--fg-4)", marginBottom: "var(--s-4)" }}>
              Start by syncing the master checklist to all locations.
            </p>
            <Button size="sm" variant="secondary" onClick={() => void handleSync()} disabled={syncing}>
              <RefreshCwIcon style={{ width: 13, height: 13 }} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync master checklist to all locations"}
            </Button>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", padding: "40px var(--s-5)", textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
            No documents match these filters.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
            {groupedDisplayed.map(({ category, docs }) => {
              const attentionCount = docs.filter((d) => {
                if (!d.is_relevant) return false;
                const s = computeStatus(d);
                return s === "missing" || s === "expired" || s === "expiring";
              }).length;
              return (
                <div
                  key={category}
                  style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}
                >
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "var(--bg-2)", padding: "8px var(--s-5)",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{category}</span>
                    <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{docs.length}</span>
                    {attentionCount > 0 && (
                      <Pill tone="bad" size="sm" style={{ marginLeft: "auto" }}>
                        {attentionCount} need attention
                      </Pill>
                    )}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
                      <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                        <tr style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
                          {["Code", "Document", "Location", "Has doc", "Status", "Expiry / due", ""].map((h, i) => (
                            <th
                              key={i}
                              style={{
                                padding: "8px var(--s-4)", textAlign: "left",
                                color: "var(--fg-3)", fontWeight: 500, fontSize: 11,
                                width: i === 6 ? 48 : undefined,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((doc, docIdx) => {
                          const effectiveStatus = computeStatus(doc);
                          const notRelevant = !doc.is_relevant;
                          const urgent = !notRelevant && (effectiveStatus === "missing" || effectiveStatus === "expired");
                          return (
                            <tr
                              key={doc.id}
                              style={{
                                borderTop: docIdx > 0 ? "1px solid var(--line)" : undefined,
                                cursor: "pointer",
                                background: urgent ? "var(--bad-soft)" : "",
                                opacity: notRelevant ? 0.5 : 1,
                              }}
                              onClick={() => openEdit(doc)}
                              onMouseEnter={(e) => { if (!urgent) (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = urgent ? "var(--bad-soft)" : ""; }}
                            >
                              <td className="mono" style={{ padding: "10px var(--s-4)", fontSize: 11, color: "var(--fg-3)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                                {doc.code ?? <span style={{ color: "var(--fg-mute)" }}>—</span>}
                              </td>
                              <td style={{ padding: "10px var(--s-4)" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 160 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, lineHeight: 1 }}>
                                    {doc.title}
                                    {doc.drive_url && (
                                      <a
                                        href={doc.drive_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "var(--fg-4)", flexShrink: 0 }}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Open in Drive"
                                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
                                      >
                                        <ExternalLinkIcon style={{ width: 11, height: 11 }} />
                                      </a>
                                    )}
                                  </div>
                                  {doc.thai_form_name && (
                                    <span style={{ fontSize: 11, color: "var(--fg-4)", lineHeight: 1 }}>{doc.thai_form_name}</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: "10px var(--s-4)", fontSize: 12, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
                                {doc.location_name ?? <span style={{ color: "var(--fg-mute)" }}>Org-wide</span>}
                              </td>
                              <td style={{ padding: "10px var(--s-4)" }}>
                                <HasDocBadge has_document={doc.has_document} />
                              </td>
                              <td style={{ padding: "10px var(--s-4)" }}>
                                <Pill tone={notRelevant ? "neutral" : STATUS_TONES[effectiveStatus]} size="sm">
                                  {notRelevant ? "Not relevant" : STATUS_LABELS[effectiveStatus]}
                                </Pill>
                              </td>
                              <td style={{ padding: "10px var(--s-4)", whiteSpace: "nowrap" }}>
                                <ExpiryCell expires_at={doc.expires_at} />
                              </td>
                              <td style={{ padding: "10px var(--s-4)" }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => void handleDelete(doc.id)}
                                  style={{ borderRadius: "var(--r-sm)", padding: 4, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", display: "flex", opacity: 0 }}
                                  title="Delete"
                                  onMouseEnter={(e) => { (e.currentTarget.style.color = "var(--bad)"); (e.currentTarget.style.opacity = "1"); }}
                                  onMouseLeave={(e) => { (e.currentTarget.style.color = "var(--fg-4)"); (e.currentTarget.style.opacity = "0"); }}
                                  className="group-hover/row:opacity-100"
                                >
                                  <TrashIcon style={{ width: 13, height: 13 }} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--overlay-strong)", backdropFilter: "blur(2px)",
            padding: "var(--s-4)", overflowY: "auto",
          }}
          onClick={closeForm}
        >
          <div
            style={{
              width: "100%", maxWidth: 640, margin: "auto",
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", padding: "var(--s-5)",
              boxShadow: "var(--shadow-drawer)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s-5)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                {editingId ? "Edit document" : "Add document"}
              </h2>
              <button
                onClick={closeForm}
                style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
              >
                <XIcon style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>

              {/* Relevance + has-doc toggles */}
              <div
                style={{
                  borderRadius: "var(--r-md)", border: "1px solid var(--line)",
                  background: "var(--bg-2)", padding: "var(--s-4)",
                  display: "flex", flexDirection: "column", gap: "var(--s-3)",
                }}
              >
                {[
                  { field: "is_relevant" as const, label: "Relevant to this location", sub: "Uncheck if this document doesn't apply to the selected shop" },
                  { field: "has_document" as const, label: "We have this document", sub: "Check when the physical or digital copy is in hand" },
                ].map(({ field, label, sub }) => (
                  <label key={field} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.checked }))}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 11, color: "var(--fg-4)", margin: 0 }}>{sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Document info */}
              <div>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-3)" }}>
                  Document info{" "}
                  <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10, color: "var(--fg-4)", opacity: 0.7 }}>
                    {!isOwner ? "— managed centrally" : "— name/code changes apply to all locations"}
                  </span>
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
                  <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Document name {isOwner && <span style={{ color: "var(--bad)" }}>*</span>}</label>
                    {isOwner ? (
                      <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="e.g. Restaurant License" />
                    ) : (
                      <p style={{ height: 32, display: "flex", alignItems: "center", fontSize: 13, margin: 0 }}>{form.title}</p>
                    )}
                  </div>
                  {[
                    { field: "thai_form_name" as const, label: "Thai form name", placeholder: "e.g. ใบอนุญาต" },
                    { field: "code" as const, label: "Document code", placeholder: "e.g. FOOD_LICENSE" },
                    { field: "authority" as const, label: "Authority / issuer", placeholder: "e.g. District Office" },
                    { field: "frequency" as const, label: "Frequency", placeholder: "e.g. Yearly, Monthly, Once" },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</label>
                      {isOwner ? (
                        <input
                          value={form[field] as string}
                          onChange={(e) => setForm((f) => ({ ...f, [field]: field === "code" ? e.target.value.toUpperCase() : e.target.value }))}
                          style={field === "code" ? { ...inputStyle, fontFamily: "var(--font-mono)" } : inputStyle}
                          placeholder={placeholder}
                        />
                      ) : (
                        <p style={{ height: 32, display: "flex", alignItems: "center", fontSize: 13, color: "var(--fg-3)", margin: 0 }}>
                          {(form[field] as string) || "—"}
                        </p>
                      )}
                    </div>
                  ))}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Category</label>
                    {isOwner ? (
                      <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle}>
                        <option value="">Select category</option>
                        {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <p style={{ height: 32, display: "flex", alignItems: "center", fontSize: 13, color: "var(--fg-3)", margin: 0 }}>{form.category || "—"}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Type</label>
                    {isOwner ? (
                      <select value={form.document_type} onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value as DocumentType }))} style={inputStyle}>
                        {ALL_TYPES.map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>)}
                      </select>
                    ) : (
                      <p style={{ height: 32, display: "flex", alignItems: "center", fontSize: 13, color: "var(--fg-3)", margin: 0 }}>{DOCUMENT_TYPE_LABELS[form.document_type]}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shop tracking */}
              <div>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-3)" }}>Shop tracking</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Location</label>
                    <select value={form.location_id} onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))} style={inputStyle}>
                      <option value="">Org-wide</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Shop notes</label>
                    <textarea value={form.shop_notes} onChange={(e) => setForm((f) => ({ ...f, shop_notes: e.target.value }))} rows={2} style={textareaStyle} placeholder="Location-specific notes" />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-3)" }}>Dates</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--s-3)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Issue date</label>
                    <DateInput value={form.issued_at} onChange={(e) => setForm((f) => ({ ...f, issued_at: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Expiry / next due</label>
                    <DateInput value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Reminder days before</label>
                    <input type="number" min={1} value={form.reminder_days_override} onChange={(e) => setForm((f) => ({ ...f, reminder_days_override: e.target.value }))} style={inputStyle} placeholder="e.g. 30" />
                  </div>
                </div>
              </div>

              {/* Storage */}
              <div>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-3)" }}>Storage</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Drive link</label>
                  <input type="url" value={form.drive_url} onChange={(e) => setForm((f) => ({ ...f, drive_url: e.target.value }))} style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: 11 }} placeholder="https://drive.google.com/…" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-3)" }}>Notes</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="eyebrow" style={{ color: "var(--fg-4)" }}>General notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} style={textareaStyle} placeholder="Optional operational notes" />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--s-2)", paddingTop: "var(--s-3)", borderTop: "1px solid var(--line)" }}>
                <Button type="button" size="sm" variant="secondary" onClick={closeForm}>Cancel</Button>
                <Button type="submit" size="sm" variant="primary" disabled={submitting}>
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
