"use client";
import { useState, useEffect, useCallback } from "react";
import { CloudDownloadIcon, HistoryIcon, XIcon, RotateCcwIcon, CheckCircleIcon, AlertTriangleIcon, Loader2Icon, ZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AdminLocation } from "@/modules/admin/types";

interface ImportBatch {
  id: string;
  location_id: string;
  imported_at: string;
  row_count: number;
  reverted_at: string | null;
  locations: { name: string } | null;
}

interface ImportPreview {
  preview: true;
  would_insert: number;
  date_from: string;
  date_to: string;
  skipped_existing: number;
  skipped_empty: number;
  errors: string[];
}

interface ImportResult {
  preview: false;
  inserted: number;
  skipped_existing: number;
  skipped_empty: number;
  errors: string[];
  batch_id: string | null;
}

interface BulkLocationResult {
  location_id: string;
  location_name: string;
  inserted: number;
  skipped_existing: number;
  errors: string[];
  error?: string;
}

interface BulkResult {
  results: BulkLocationResult[];
  total_inserted: number;
  total_skipped: number;
  failed_count: number;
}

interface Props {
  location: AdminLocation;
  onClose: () => void;
  onImported: () => void;
}

type Tab = "import" | "all" | "history";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatDateOnly(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleString("en", { day: "numeric", month: "short", year: "numeric" });
}

export function SheetImportModal({ location, onClose, onImported }: Props) {
  const [tab, setTab] = useState<Tab>("import");
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/accounting/import-sheets?location_id=${location.id}`);
      if (res.ok) setBatches(await res.json());
    } finally {
      setLoadingHistory(false);
    }
  }, [location.id]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  async function handlePreview() {
    setImporting(true);
    setPreview(null);
    setResult(null);
    try {
      const res = await fetch("/api/accounting/import-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: location.id, preview: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to read sheet"); return; }
      if (data.preview === true) {
        setPreview(data as ImportPreview);
      } else {
        setResult(data as ImportResult);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setImporting(false);
    }
  }

  async function handleConfirmImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/accounting/import-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: location.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Import failed"); return; }
      setPreview(null);
      setResult(data as ImportResult);
      if ((data as ImportResult).inserted > 0) {
        toast.success(`Imported ${(data as ImportResult).inserted} rows`);
        onImported();
      }
    } catch {
      toast.error("Network error — import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleImportAll() {
    setImporting(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/accounting/import-sheets/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bulk import failed"); return; }
      setBulkResult(data as BulkResult);
      if ((data as BulkResult).total_inserted > 0) {
        toast.success(`Imported ${(data as BulkResult).total_inserted} rows across all shops`);
        onImported();
      } else {
        toast.info("All shops already up to date");
      }
    } catch {
      toast.error("Network error — bulk import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleRevert(batch: ImportBatch) {
    if (!confirm(`Revert this import? This will delete ${batch.row_count} rows imported on ${formatDate(batch.imported_at)}.`)) return;
    setRevertingId(batch.id);
    try {
      const res = await fetch(`/api/accounting/import-sheets/${batch.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Revert failed"); return; }
      toast.success(`Reverted — ${data.deleted} rows deleted`);
      onImported();
      await fetchHistory();
    } catch {
      toast.error("Network error — revert failed");
    } finally {
      setRevertingId(null);
    }
  }

  const hasSheetId = !!location.google_sheet_id;

  const TABS: Array<{ id: Tab; label: string; icon: typeof CloudDownloadIcon }> = [
    { id: "import", label: "This shop",    icon: CloudDownloadIcon },
    { id: "all",    label: "All shops",    icon: ZapIcon            },
    { id: "history", label: "History",     icon: HistoryIcon        },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--bg)", borderRadius: "var(--r-xl)", border: "1px solid var(--line)", width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", maxHeight: "80vh", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CloudDownloadIcon style={{ width: 18, height: 18, color: "var(--bronze)" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Import from Google Sheets</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}>
            <XIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)", padding: "0 20px" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{ padding: "10px 0", marginRight: 20, fontSize: 13, fontWeight: tab === id ? 600 : 400, color: tab === id ? "var(--bronze)" : "var(--fg-4)", background: "none", border: "none", borderBottom: tab === id ? "2px solid var(--bronze)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Icon style={{ width: 13, height: 13 }} />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>

          {/* ── This shop ── */}
          {tab === "import" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "var(--bg-2)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                <p style={{ fontSize: 12, color: "var(--fg-4)", marginBottom: 4 }}>Location</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>{location.name}</p>
              </div>

              {!hasSheetId ? (
                <div style={{ display: "flex", gap: 10, background: "var(--warn-soft, #fef3c7)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                  <AlertTriangleIcon style={{ width: 16, height: 16, color: "var(--warn, #d97706)", flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: "var(--fg-3)" }}>
                    No Google Sheet ID configured for this location. Go to <strong>Admin → Locations</strong> and paste the spreadsheet ID into the &quot;Accounting Sheet ID&quot; field.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.5 }}>
                    Pulls data from the <strong>DAILY_ENTRIES</strong> tab. Only rows with sales data not already in the database will be imported.
                  </p>

                  {!preview ? (
                    <Button onClick={handlePreview} disabled={importing} style={{ alignSelf: "flex-start" }}>
                      {importing ? <><Loader2Icon className="mr-2 size-3.5 animate-spin" />Checking sheet…</> : <><CloudDownloadIcon className="mr-2 size-3.5" />Preview import</>}
                    </Button>
                  ) : (
                    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
                      <div style={{ padding: "12px 14px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{preview.would_insert} row{preview.would_insert !== 1 ? "s" : ""} ready to import</p>
                        <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 3 }}>{formatDateOnly(preview.date_from)} → {formatDateOnly(preview.date_to)}</p>
                        {preview.skipped_existing > 0 && <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>{preview.skipped_existing} already filled in DB — will be skipped</p>}
                      </div>
                      <div style={{ padding: "10px 14px", display: "flex", gap: 8 }}>
                        <Button onClick={handleConfirmImport} disabled={importing}>
                          {importing ? <><Loader2Icon className="mr-2 size-3.5 animate-spin" />Importing…</> : "Confirm import"}
                        </Button>
                        <Button variant="ghost" onClick={() => setPreview(null)} disabled={importing}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {result && (
                <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: result.inserted > 0 ? "var(--good-soft, #d1fae5)" : "var(--bg-2)", borderBottom: result.errors.length > 0 ? "1px solid var(--line)" : undefined }}>
                    <CheckCircleIcon style={{ width: 15, height: 15, color: result.inserted > 0 ? "var(--good, #10b981)" : "var(--fg-4)" }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{result.inserted > 0 ? `${result.inserted} row${result.inserted !== 1 ? "s" : ""} imported` : "Nothing new to import"}</span>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {result.skipped_existing > 0 && <p style={{ fontSize: 12, color: "var(--fg-4)" }}>{result.skipped_existing} row{result.skipped_existing !== 1 ? "s" : ""} skipped — already in database</p>}
                    {result.skipped_empty > 0 && <p style={{ fontSize: 12, color: "var(--fg-4)" }}>{result.skipped_empty} empty row{result.skipped_empty !== 1 ? "s" : ""} skipped</p>}
                    {result.errors.map((e, i) => <p key={i} style={{ fontSize: 12, color: "var(--bad)" }}>{e}</p>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── All shops ── */}
          {tab === "all" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.5 }}>
                Imports all shops with a configured Sheet ID at once. Skips dates already filled in the database. Safe to run repeatedly.
              </p>

              {!bulkResult ? (
                <Button onClick={handleImportAll} disabled={importing} style={{ alignSelf: "flex-start" }}>
                  {importing
                    ? <><Loader2Icon className="mr-2 size-3.5 animate-spin" />Importing all shops…</>
                    : <><ZapIcon className="mr-2 size-3.5" />Import all shops</>}
                </Button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: bulkResult.total_inserted > 0 ? "var(--good-soft, #d1fae5)" : "var(--bg-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                    <CheckCircleIcon style={{ width: 15, height: 15, color: bulkResult.total_inserted > 0 ? "var(--good, #10b981)" : "var(--fg-4)" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
                      {bulkResult.total_inserted > 0 ? `${bulkResult.total_inserted} rows imported across ${bulkResult.results.filter(r => r.inserted > 0).length} shop${bulkResult.results.filter(r => r.inserted > 0).length !== 1 ? "s" : ""}` : "All shops already up to date"}
                    </span>
                  </div>
                  {bulkResult.results.map((r) => (
                    <div key={r.location_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: 13 }}>
                      <span style={{ fontWeight: 500, color: "var(--fg)" }}>{r.location_name}</span>
                      {r.error
                        ? <span style={{ fontSize: 12, color: "var(--bad)" }}>{r.error}</span>
                        : <span style={{ fontSize: 12, color: r.inserted > 0 ? "var(--good, #10b981)" : "var(--fg-4)" }}>
                            {r.inserted > 0 ? `+${r.inserted} rows` : "up to date"}
                          </span>
                      }
                    </div>
                  ))}
                  <Button variant="ghost" onClick={() => setBulkResult(null)} style={{ alignSelf: "flex-start", marginTop: 4 }}>Run again</Button>
                </div>
              )}
            </div>
          )}

          {/* ── History ── */}
          {tab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {loadingHistory ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                  <Loader2Icon style={{ width: 20, height: 20, color: "var(--fg-4)", animation: "spin 1s linear infinite" }} />
                </div>
              ) : batches.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--fg-4)", textAlign: "center", padding: "32px 0" }}>No imports yet for this location.</p>
              ) : (
                batches.map((batch) => (
                  <div key={batch.id} style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>
                        {batch.row_count} row{batch.row_count !== 1 ? "s" : ""}
                        {batch.reverted_at && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--fg-4)", fontWeight: 400, background: "var(--bg-2)", padding: "2px 6px", borderRadius: "var(--r-sm)" }}>Reverted</span>}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>{formatDate(batch.imported_at)}</p>
                      {batch.reverted_at && <p style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>Reverted {formatDate(batch.reverted_at)}</p>}
                    </div>
                    {!batch.reverted_at && (
                      <Button size="sm" variant="ghost" disabled={revertingId === batch.id} onClick={() => void handleRevert(batch)} style={{ color: "var(--bad)", flexShrink: 0 }}>
                        {revertingId === batch.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <><RotateCcwIcon className="mr-1.5 size-3.5" />Revert</>}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
