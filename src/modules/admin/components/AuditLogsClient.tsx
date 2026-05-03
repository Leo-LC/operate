"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
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

export function AuditLogsClient({ logs }: { logs: AuditLogEntry[] }) {
  const [moduleFilter, setModuleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Audit Logs</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {logs.length} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search action, user, entity…"
            className="h-8 w-52 rounded-md border border-input bg-background px-2 text-xs"
          />
          <select
            value={moduleFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {MODULE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching entries.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Actor</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Module</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Action</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Entity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {log.user_email ?? <span className="text-muted-foreground/50">system</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      {log.module_key ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {log.entity_type ?? "—"}
                      {log.entity_id && (
                        <span className="ml-1 font-mono text-[10px]">
                          {log.entity_id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
                      {log.payload ? JSON.stringify(log.payload) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Page {safePage + 1} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                >
                  <ChevronLeftIcon className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                >
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
