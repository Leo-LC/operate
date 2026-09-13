"use client";
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Modal } from "@/components/ui/modal";
import {
  FileTextIcon,
  ImageIcon,
  DownloadIcon,
  Trash2Icon,
  EyeIcon,
  UploadIcon,
  Loader2Icon,
  XIcon,
  CheckIcon,
  PencilIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { EmployeeDocument } from "@/modules/admin/types";
import { MAX_DOCS_PER_EMPLOYEE } from "@/modules/admin/lib/employee-documents";

const DOC_TYPE_LABELS: Record<EmployeeDocument["doc_type"], string> = {
  id_card: "ID card",
  passport: "Passport",
  work_permit: "Work permit",
  contract: "Contract",
  other: "Other",
};

const DOC_TYPE_TONES: Record<EmployeeDocument["doc_type"], "neutral" | "bronze" | "good" | "warn" | "bad" | "info"> = {
  id_card: "bronze",
  passport: "info",
  work_permit: "good",
  contract: "neutral",
  other: "warn",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

interface EmployeeDocumentsSectionProps {
  employeeId: string;
  documents: EmployeeDocument[];
  onRefresh: () => void;
}

export function EmployeeDocumentsSection({ employeeId, documents, onRefresh }: EmployeeDocumentsSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [docType, setDocType] = useState<EmployeeDocument["doc_type"]>("id_card");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState<{ url: string; name: string; mime: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EmployeeDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState("");
  const [editDocType, setEditDocType] = useState<EmployeeDocument["doc_type"]>("id_card");

  const atMax = documents.length >= MAX_DOCS_PER_EMPLOYEE;

  async function handleFileUpload(file: File) {
    if (atMax) {
      toast.error(`Maximum ${MAX_DOCS_PER_EMPLOYEE} documents per employee`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      const res = await fetch(`/api/admin/employees/${employeeId}/documents`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((result as { error?: string }).error ?? "Upload failed");
        return;
      }
      toast.success(`${DOC_TYPE_LABELS[docType]} uploaded`);
      onRefresh();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) await handleFileUpload(droppedFile);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await handleFileUpload(file);
    e.target.value = "";
  }

  async function handlePreview(doc: EmployeeDocument) {
    try {
      const res = await fetch(`/api/admin/employees/${employeeId}/documents/${doc.id}/signed-url`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error);
      const d = data as { url: string; file_name: string; mime_type: string };
      setPreviewOpen({ url: d.url, name: d.file_name, mime: d.mime_type });
    } catch {
      toast.error("Failed to generate preview");
    }
  }

  async function handleDownload(doc: EmployeeDocument) {
    try {
      const res = await fetch(`/api/admin/employees/${employeeId}/documents/${doc.id}/signed-url`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error);
      const d = data as { url: string; file_name: string };
      const link = document.createElement("a");
      link.href = d.url;
      link.download = d.file_name;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Download failed");
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/employees/${employeeId}/documents/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((result as { error?: string }).error ?? "Delete failed");
        return;
      }
      toast.success("Document deleted");
      setDeleteConfirm(null);
      onRefresh();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function startRename(doc: EmployeeDocument) {
    setEditingDocId(doc.id);
    setEditFileName(doc.file_name);
    setEditDocType(doc.doc_type);
  }

  async function saveRename(doc: EmployeeDocument) {
    try {
      const res = await fetch(`/api/admin/employees/${employeeId}/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: editFileName, doc_type: editDocType }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((result as { error?: string }).error ?? "Update failed");
        return;
      }
      toast.success("Document updated");
      setEditingDocId(null);
      onRefresh();
    } catch {
      toast.error("Update failed");
    }
  }

  function cancelRename() {
    setEditingDocId(null);
    setEditFileName("");
  }

  const dropzoneStyle: React.CSSProperties = {
    border: `1.5px dashed ${dragOver || uploading ? "var(--accent)" : "var(--line-strong)"}`,
    borderRadius: "var(--r-lg)",
    padding: "var(--s-5)",
    background: dragOver || uploading ? "var(--accent-soft)" : "transparent",
    textAlign: "center",
    cursor: atMax || uploading ? "default" : "pointer",
    transition: "border-color 150ms, background 150ms",
  };

  const highlight = dragOver || uploading;

  const docRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-md)",
    background: "var(--surface)",
  };

  const isImage = (mime: string) => mime.startsWith("image/");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span className="eyebrow">Documents</span>
        <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading || atMax}>
          {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
          {uploading ? "Uploading…" : atMax ? "Max (3)" : "Add document"}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        style={{ display: "none" }}
        onChange={handleFileSelect}
        disabled={uploading || atMax}
      />

      {documents.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--fg-4)" }}>No documents yet.</p>
      )}
      {documents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {documents.map((doc) => (
            <div key={doc.id} style={docRowStyle}>
              <span style={{ color: "var(--fg-3)", display: "flex", flexShrink: 0 }}>
                {isImage(doc.mime_type) ? <ImageIcon className="size-5" /> : <FileTextIcon className="size-5" />}
              </span>
              {editingDocId === doc.id ? (
                <div style={{ display: "flex", flex: 1, gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    value={editFileName}
                    onChange={(e) => setEditFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveRename(doc);
                      if (e.key === "Escape") cancelRename();
                    }}
                    autoFocus
                    aria-label="File name"
                    style={{ flex: 1, minWidth: 140, height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)", background: "var(--bg)", color: "var(--fg)", padding: "0 8px", fontSize: 13 }}
                  />
                  <select
                    value={editDocType}
                    onChange={(e) => setEditDocType(e.target.value as EmployeeDocument["doc_type"])}
                    aria-label="Document type"
                    style={{ height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)", background: "var(--bg)", color: "var(--fg)", padding: "0 8px", fontSize: 13 }}
                  >
                    {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => void saveRename(doc)} title="Save">
                    <CheckIcon className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelRename} title="Cancel (Esc)">
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 500, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.file_name}</span>
                      <Pill tone={DOC_TYPE_TONES[doc.doc_type]} size="sm">{DOC_TYPE_LABELS[doc.doc_type]}</Pill>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 2, fontSize: 11, color: "var(--fg-4)" }}>
                      <span>{formatBytes(doc.size_bytes)}</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <Button size="sm" variant="ghost" onClick={() => void handlePreview(doc)} title="Preview">
                      <EyeIcon className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void handleDownload(doc)} title="Download">
                      <DownloadIcon className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startRename(doc)} title="Rename / change type">
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" style={{ color: "var(--bad)" }} onClick={() => setDeleteConfirm(doc)} title="Delete">
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!atMax && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload document: drag a file here or press Enter to browse"
          onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !uploading) fileInputRef.current?.click(); }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={dropzoneStyle}
        >
          {uploading ? (
            <Loader2Icon className="size-8 mx-auto mb-2 animate-spin" style={{ color: "var(--accent)" }} />
          ) : (
            <UploadIcon className="size-8 mx-auto mb-2" style={{ color: highlight ? "var(--accent)" : "var(--fg-4)" }} />
          )}
          <p style={{ fontSize: 13, fontWeight: uploading ? 600 : 400, color: highlight ? "var(--accent)" : "var(--fg-3)" }}>
            {uploading ? "Uploading…" : dragOver ? "Drop file here" : "Drag & drop or click to browse"}
          </p>
          <p style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>
            PDF, JPG, PNG, WebP · max 8MB · images auto-compressed
          </p>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} style={{ marginTop: 8 }}>
            <label style={{ fontSize: 11, color: "var(--fg-4)", marginRight: 6 }} htmlFor={`doctype-${employeeId}`}>Type</label>
            <select
              id={`doctype-${employeeId}`}
              value={docType}
              onChange={(e) => setDocType(e.target.value as EmployeeDocument["doc_type"])}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--fg)", fontSize: 12 }}
            >
              {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {atMax && (
        <p style={{ fontSize: 11, color: "var(--fg-4)", textAlign: "center" }}>
          Maximum {MAX_DOCS_PER_EMPLOYEE} documents per employee. Delete one to add more.
        </p>
      )}

      {previewOpen && (
        <Modal open onClose={() => setPreviewOpen(null)} title={previewOpen.name} width={isImage(previewOpen.mime) ? 800 : 600}>
          {isImage(previewOpen.mime) ? (
            // Signed private URL — next/image optimizer can't help here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewOpen.url} alt={previewOpen.name} style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "var(--r-md)" }} />
          ) : (
            <iframe src={previewOpen.url} style={{ width: "100%", height: "70vh", border: "none", borderRadius: "var(--r-md)" }} title={previewOpen.name} />
          )}
        </Modal>
      )}

      {deleteConfirm && (
        <Modal open onClose={() => setDeleteConfirm(null)} title="Delete document" description={`Delete “${deleteConfirm.file_name}”? The file is removed from storage too.`}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
