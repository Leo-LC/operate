"use client";
import { useState, useEffect, useCallback } from "react";
import { CloudDownloadIcon, HistoryIcon, XIcon, RotateCcwIcon, CheckCircleIcon, AlertTriangleIcon, Loader2Icon } from "lucide-react";
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

interface ImportResult {
  inserted: number;
  skipped_existing: number;
  skipped_empty: number;
  errors: string[];
  batch_id: string | null;
}

interface Props {
  location: AdminLocation;
  onClose: () => void;
  onImported: () => void;
}

type Tab = "import" | "history";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SheetImportModal({ location, onClose, onImported }: Props) {
  const [tab, setTab] = useState<Tab>("import");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
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

  async function handleImport() {
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/accounting/import-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: location.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }
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

  async function handleRevert(batch: ImportBatch) {
    if (!confirm(`Revert this import? This will delete ${batch.row_count} rows imported on ${formatDate(batch.imported_at)}.`)) return;
    setRevertingId(batch.id);
    try {
      const res = await fetch(`/api/accounting/import-sheets/${batch.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Revert failed");
        return;
      }
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

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--bg)",
        borderRadius: "var(--r-xl)",
        border: "1px solid var(--line)",
        width: "100%",
        maxWidth: 520,
        display: "flex",
        flexDirection: "column",
        maxHeight: "80vh",
        overflow: "hidden",
      }}>
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
          {(["import", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "10px 0",
                marginRight: 20,
                fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? "var(--bronze)" : "var(--fg-4)",
                background: "none",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--bronze)" : "2px solid transparent",
                cursor: "pointer",
                textTransform: "capitalize",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t === "import" ? <CloudDownloadIcon style={{ width: 13, height: 13 }} /> : <HistoryIcon style={{ width: 13, height: 13 }} />}
              {t === "import" ? "Import" : "History"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
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
                    No Google Sheet ID configured for this location. Go to <strong>Admin → Locations</strong> and paste the spreadsheet ID into the "Accounting Sheet ID" field.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.5 }}>
                    Pulls data from the <strong>DAILY_ENTRIES</strong> tab of this shop&apos;s spreadsheet. Only rows with dates not already in the database will be imported.
                  </p>
                  <Button onClick={handleImport} disabled={importing} style={{ alignSelf: "flex-start" }}>
                    {importing ? (
                      <><Loader2Icon className="mr-2 size-3.5 animate-spin" />Importing…</>
                    ) : (
                      <><CloudDownloadIcon className="mr-2 size-3.5" />Import now</>
                    )}
                  </Button>
                </div>
              )}

              {result && (
                <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: result.inserted > 0 ? "var(--good-soft, #d1fae5)" : "var(--bg-2)", borderBottom: result.errors.length > 0 ? "1px solid var(--line)" : undefined }}>
                    <CheckCircleIcon style={{ width: 15, height: 15, color: result.inserted > 0 ? "var(--good, #10b981)" : "var(--fg-4)" }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>
                      {result.inserted > 0 ? `${result.inserted} row${result.inserted !== 1 ? "s" : ""} imported` : "Nothing new to import"}
                    </span>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {result.skipped_existing > 0 && (
                      <p style={{ fontSize: 12, color: "var(--fg-4)" }}>{result.skipped_existing} row{result.skipped_existing !== 1 ? "s" : ""} skipped — already in database</p>
                    )}
                    {result.skipped_empty > 0 && (
                      <p style={{ fontSize: 12, color: "var(--fg-4)" }}>{result.skipped_empty} empty row{result.skipped_empty !== 1 ? "s" : ""} skipped</p>
                    )}
                    {result.errors.map((e, i) => (
                      <p key={i} style={{ fontSize: 12, color: "var(--bad)" }}>{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                      {batch.reverted_at && (
                        <p style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>Reverted {formatDate(batch.reverted_at)}</p>
                      )}
                    </div>
                    {!batch.reverted_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={revertingId === batch.id}
                        onClick={() => void handleRevert(batch)}
                        style={{ color: "var(--bad)", flexShrink: 0 }}
                      >
                        {revertingId === batch.id ? (
                          <Loader2Icon className="size-3.5 animate-spin" />
                        ) : (
                          <><RotateCcwIcon className="mr-1.5 size-3.5" />Revert</>
                        )}
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
