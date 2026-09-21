"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PillButton } from "@/components/ui/pill-button";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import type { PillTone } from "@/components/ui/pill";
import { Modal } from "@/components/ui/modal";
import {
  PlusIcon, ExternalLinkIcon, TrashIcon, PencilIcon,
  DownloadIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon,
} from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import {
  computeStatus, daysUntilExpiry,
  DOCUMENT_TYPE_LABELS, STATUS_LABELS,
  type Document, type DocumentStatus, type DocumentType,
} from "@/modules/documents/types";
import { ALL_CATEGORIES } from "@/modules/documents/masterList";
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

type SortKey = "title" | "category" | "location" | "status" | "expires_at";
type SortDir = "asc" | "desc";

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

const SORT_HEADER_STYLE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  background: "transparent", border: "none", padding: 0, cursor: "pointer",
  font: "inherit", letterSpacing: "inherit", textTransform: "inherit", color: "inherit",
};

export function DocumentsClient({ initialDocuments, locations }: DocumentsClientProps) {
  const searchParams = useSearchParams();

  const [documents, setDocuments] = useState(initialDocuments);
  const [statusFilter, setStatusFilter] = useState<"" | DocumentStatus>("");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [drawerMode, setDrawerMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Deep-link from the global search (⌘K): ?select=<id> opens the drawer.
  useEffect(() => {
    const selectId = searchParams.get("select");
    if (!selectId) return;
    const doc = documents.find((d) => d.id === selectId);
    if (doc) openEdit(doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortHeader({ label, sortKey: key }: { label: string; sortKey: SortKey }) {
    const active = sortKey === key;
    return (
      <button type="button" onClick={() => toggleSort(key)} style={SORT_HEADER_STYLE} title={`Sort by ${label}`}>
        {label}
        {active && (sortDir === "asc"
          ? <ArrowUpIcon style={{ width: 11, height: 11 }} />
          : <ArrowDownIcon style={{ width: 11, height: 11 }} />)}
      </button>
    );
  }

  // ── filtered + sorted view ─────────────────────────────────────────────
  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = documents.filter((d) => {
      const effectiveStatus = computeStatus(d);
      if (statusFilter && effectiveStatus !== statusFilter) return false;
      if (locationFilter && d.location_id !== locationFilter) return false;
      if (categoryFilter && d.category !== categoryFilter) return false;
      if (q) {
        const haystack = `${d.title} ${d.code ?? ""} ${d.thai_form_name ?? ""} ${d.location_name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    if (!sortKey) {
      // Default: most urgent first, then title.
      return [...filtered].sort((a, b) =>
        STATUS_SORT_PRIORITY[computeStatus(a)] - STATUS_SORT_PRIORITY[computeStatus(b)] ||
        a.title.localeCompare(b.title),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "title": return a.title.localeCompare(b.title) * dir;
        case "category": return (a.category ?? "").localeCompare(b.category ?? "") * dir;
        case "location": return (a.location_name ?? "").localeCompare(b.location_name ?? "") * dir;
        case "status": return (STATUS_SORT_PRIORITY[computeStatus(a)] - STATUS_SORT_PRIORITY[computeStatus(b)]) * dir;
        case "expires_at": {
          if (!a.expires_at && !b.expires_at) return 0;
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;
          return (a.expires_at < b.expires_at ? -1 : a.expires_at > b.expires_at ? 1 : 0) * dir;
        }
      }
    });
  }, [documents, statusFilter, locationFilter, categoryFilter, search, sortKey, sortDir]);

  // ── drawer helpers ─────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDrawerMode("add");
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
    setDrawerMode("edit");
  }

  function closeDrawer() {
    setDrawerMode(null);
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
      closeDrawer();
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

  const drawerFooter = (
    <div style={{ display: "flex", gap: "var(--s-2)", width: "100%" }}>
      <Button type="button" variant="secondary" size="sm" onClick={closeDrawer} disabled={submitting}>Cancel</Button>
      <Button type="submit" size="sm" form="document-form" disabled={submitting}>
        {submitting ? "Saving…" : drawerMode === "add" ? "Add document" : "Save changes"}
      </Button>
    </div>
  );

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      <PageHeader
        title="Documents"
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flexWrap: "wrap" }}>
            <a href="/api/documents/export" download style={{ textDecoration: "none" }}>
              <Button size="sm" variant="secondary">
                <DownloadIcon style={{ width: 13, height: 13 }} /> Export CSV
              </Button>
            </a>
            <Button size="sm" variant="primary" onClick={openAdd}>
              <PlusIcon style={{ width: 13, height: 13 }} /> Add document
            </Button>
          </div>
        }
      />

      {/* Search + filters (top of page) */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--s-2)" }}>
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <SearchIcon style={{ position: "absolute", left: 8, width: 13, height: 13, color: "var(--fg-4)", pointerEvents: "none" }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{ ...inputStyle, width: 220, paddingLeft: 28 }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | DocumentStatus)} style={{ ...inputStyle, width: "auto" }}>
          {STATUS_FILTERS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PillButton active={locationFilter === ""} onClick={() => setLocationFilter("")}>All shops</PillButton>
          {locations.map((l) => (
            <PillButton key={l.id} active={locationFilter === l.id} onClick={() => setLocationFilter(l.id)}>{l.name}</PillButton>
          ))}
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--fg-4)" }}>
          {displayed.length} document{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

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
                background: tone === "bad" && value > 0 ? "var(--bad-soft)" : tone === "warn" && value > 0 ? "var(--warn-soft)" : "transparent",
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

      {/* Single table */}
      {documents.length === 0 ? (
        <div
          style={{
            borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
            padding: "48px var(--s-5)", textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No documents yet</p>
          <p style={{ fontSize: 12, color: "var(--fg-4)", marginBottom: "var(--s-4)" }}>
            Add your first document to start tracking compliance.
          </p>
          <Button size="sm" variant="primary" onClick={openAdd}>
            <PlusIcon style={{ width: 13, height: 13 }} /> Add document
          </Button>
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", padding: "40px var(--s-5)", textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
          No documents match these filters.
        </div>
      ) : (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
              <thead>
                <tr style={{ background: "transparent", borderBottom: "1px solid var(--line)" }}>
                  {[
                    { label: "Document", sort: "title" as SortKey },
                    { label: "Category", sort: "category" as SortKey },
                    { label: "Location", sort: "location" as SortKey },
                    { label: "Has doc", sort: null },
                    { label: "Status", sort: "status" as SortKey },
                    { label: "Expiry / due", sort: "expires_at" as SortKey },
                    { label: "", sort: null },
                  ].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "8px var(--s-4)", textAlign: "left",
                        color: "var(--fg-3)", fontWeight: 500, fontSize: 11,
                        width: i === 6 ? 76 : undefined, whiteSpace: "nowrap",
                      }}
                    >
                      {h.sort ? <SortHeader label={h.label} sortKey={h.sort} /> : h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((doc, docIdx) => {
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
                      <td style={{ padding: "10px var(--s-4)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 180 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, lineHeight: 1.2 }}>
                            {doc.code && (
                              <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)", fontVariantNumeric: "tabular-nums" }}>
                                {doc.code}
                              </span>
                            )}
                            <span>{doc.title}</span>
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
                        {doc.category ?? <span style={{ color: "var(--fg-mute)" }}>—</span>}
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
                        <div style={{ display: "flex", gap: 2 }}>
                          <button
                            onClick={() => openEdit(doc)}
                            style={{ borderRadius: "var(--r-sm)", padding: 4, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", display: "flex" }}
                            title="Edit"
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
                          >
                            <PencilIcon style={{ width: 13, height: 13 }} />
                          </button>
                          <button
                            onClick={() => void handleDelete(doc.id)}
                            style={{ borderRadius: "var(--r-sm)", padding: 4, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", display: "flex" }}
                            title="Delete"
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bad)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
                          >
                            <TrashIcon style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={drawerMode !== null}
        onClose={closeDrawer}
        title={drawerMode === "add" ? "Add document" : "Edit document"}
        description={drawerMode === "edit" ? form.title : undefined}
        footer={drawerFooter}
      >
        <form id="document-form" onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
          {/* Relevance + has-doc toggles */}
          <div
            style={{
              borderRadius: "var(--r-md)", border: "1px solid var(--line)",
              background: "transparent", padding: "var(--s-4)",
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
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-3)" }}>Document info</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Document name <span style={{ color: "var(--bad)" }}>*</span></label>
                <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="e.g. Restaurant License" />
              </div>
              {[
                { field: "thai_form_name" as const, label: "Thai form name", placeholder: "e.g. ใบอนุญาต" },
                { field: "code" as const, label: "Document code", placeholder: "e.g. FOOD_LICENSE" },
                { field: "authority" as const, label: "Authority / issuer", placeholder: "e.g. District Office" },
                { field: "frequency" as const, label: "Frequency", placeholder: "e.g. Yearly, Monthly, Once" },
              ].map(({ field, label, placeholder }) => (
                <div key={field} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</label>
                  <input
                    value={form[field] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: field === "code" ? e.target.value.toUpperCase() : e.target.value }))}
                    style={field === "code" ? { ...inputStyle, fontFamily: "var(--font-mono)" } : inputStyle}
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Category</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle}>
                  <option value="">Select category</option>
                  {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Type</label>
                <select value={form.document_type} onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value as DocumentType }))} style={inputStyle}>
                  {ALL_TYPES.map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>)}
                </select>
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
        </form>
      </Modal>
    </div>
  );
}
