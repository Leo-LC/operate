"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ChevronLeftIcon, ChevronRightIcon, Trash2Icon } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { toast } from "sonner";
import type { AuditLogEntry } from "@/modules/admin/types";

const PAGE_SIZE = 25;

const MODULE_OPTIONS = [
  { value: "", label: "All modules" },
  { value: "reviews", label: "Reviews" },
  { value: "documents", label: "Documents" },
  { value: "animals", label: "Animals" },
  { value: "accounting", label: "Accounting" },
  { value: "schedules", label: "Schedules" },
  { value: "reports", label: "Reports" },
  { value: "admin", label: "Admin" },
];

const inputSm: React.CSSProperties = {
  height: 32,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line-strong)",
  background: "var(--bg)",
  color: "var(--fg)",
  padding: "0 8px",
  fontSize: 12,
  outline: "none",
};

export function AuditLogsClient({ logs: initialLogs }: { logs: AuditLogEntry[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [moduleFilter, setModuleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearBefore, setClearBefore] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [clearing, setClearing] = useState(false);

  const filtered = useMemo(() => {
    let result = logs;
    if (moduleFilter) result = result.filter((l) => l.module_key === moduleFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          (l.user_email ?? "").toLowerCase().includes(q) ||
          (l.entity_type ?? "").toLowerCase().includes(q) ||
          (l.entity_id ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [logs, moduleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function handleFilterChange(value: string) {
    setModuleFilter(value);
    setPage(0);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(0);
  }

  async function handleClear() {
    setClearing(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?before=${clearBefore}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to clear logs");
        return;
      }
      const { deleted } = await res.json() as { deleted: number };
      setLogs((prev) => prev.filter((l) => l.created_at >= new Date(clearBefore).toISOString()));
      setShowClearModal(false);
      toast.success(`${deleted} log${deleted !== 1 ? "s" : ""} cleared`);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Audit Logs"
        subtitle={`${filtered.length} of ${logs.length} entries · auto-deleted after 90 days`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search action, user, entity…"
              style={{ ...inputSm, width: 208 }}
            />
            <select
              value={moduleFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              style={{ ...inputSm, cursor: "pointer" }}
            >
              {MODULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button size="sm" variant="secondary" onClick={() => setShowClearModal(true)}>
              <Trash2Icon className="size-3.5" />
              Clear old logs
            </Button>
          </div>
        }
      />

      {visible.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--fg-4)" }}>No matching entries.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto", borderRadius: "var(--r-lg)", border: "1px solid var(--line)" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg-2)" }}>
                <tr>
                  {["Time", "Actor", "Module", "Action", "Entity", "Details"].map((h) => (
                    <th key={h} className="eyebrow" style={{ padding: "10px 16px", textAlign: "left", color: "var(--fg-4)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((log, i) => (
                  <AuditRow key={log.id} log={log} isLast={i === visible.length - 1} />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--fg-4)" }}>
              <span>Page {safePage + 1} of {totalPages}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>
                  <ChevronLeftIcon className="size-3.5" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Clear logs modal */}
      {showClearModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)", padding: "0 16px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowClearModal(false); }}
        >
          <div style={{ width: "100%", maxWidth: 400, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 24, boxShadow: "var(--shadow-2)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Clear audit logs</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
              Permanently delete all logs older than the selected date. This cannot be undone.
            </p>
            <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Delete logs before</label>
              <DateInput value={clearBefore} onChange={(e) => setClearBefore(e.target.value)} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setShowClearModal(false)} disabled={clearing}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => void handleClear()} disabled={clearing || !clearBefore}>
                {clearing ? "Clearing…" : "Clear logs"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditRow({ log }: { log: AuditLogEntry; isLast?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      style={{ background: hovered ? "var(--row-hover)" : "var(--surface)", borderTop: "1px solid var(--line)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="mono" style={{ padding: "10px 16px", fontSize: 11, color: "var(--fg-4)", whiteSpace: "nowrap" }}>
        {new Date(log.created_at).toLocaleString()}
      </td>
      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg)" }}>
        {log.user_email ?? <span style={{ color: "var(--fg-4)" }}>system</span>}
      </td>
      <td style={{ padding: "10px 16px", fontSize: 11, color: "var(--fg-3)" }}>
        {log.module_key ?? "—"}
      </td>
      <td className="mono" style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg)" }}>{log.action}</td>
      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)" }}>
        {log.entity_type ?? "—"}
        {log.entity_id && (
          <span className="mono" style={{ marginLeft: 4, fontSize: 10 }}>
            {log.entity_id.slice(0, 8)}…
          </span>
        )}
      </td>
      <td className="mono" style={{ maxWidth: 240, padding: "10px 16px", fontSize: 10, color: "var(--fg-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {log.payload ? JSON.stringify(log.payload) : "—"}
      </td>
    </tr>
  );
}
