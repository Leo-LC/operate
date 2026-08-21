"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateInput } from "@/components/ui/date-input";
import { toast } from "sonner";
import type {
  CatalogEndpoint,
  DailySummaryResult,
  DemoReportResult,
  EndpointNote,
  EndpointNoteStatus,
} from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatusResponse {
  configured: boolean;
  connected: boolean;
  message?: string;
  store_count?: number;
  stores?: { id: string; name: string }[];
}

interface MappingResponse {
  loyverse_stores: { id: string; name: string }[];
  nexus_locations: { id: string; name: string; slug: string }[];
  mappings: {
    store_id: string;
    store_name: string | null;
    location_id: string;
    location_name: string | null;
    location_slug: string | null;
  }[];
  unmapped_stores: { id: string; name: string }[];
  config_file: string;
}

const NOTE_STORAGE_KEY = "loyverse-sandbox-endpoint-notes";

function thb(n: number | null | undefined): string {
  if (n == null) return "—";
  return "฿" + n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function relevanceColor(r: CatalogEndpoint["relevance"]): string {
  if (r === "high") return "var(--good)";
  if (r === "medium") return "var(--warn)";
  return "var(--fg-mute)";
}

// ── Connection card ───────────────────────────────────────────────────────────

function ConnectionCard({ status, loading }: { status: StatusResponse | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--fg-mute)]">
        Checking Loyverse connection…
      </div>
    );
  }
  if (!status) return null;

  const ok = status.configured && status.connected;
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: ok ? "var(--good)" : "var(--bad)",
        background: ok ? "color-mix(in srgb, var(--good) 8%, var(--surface))" : "color-mix(in srgb, var(--bad) 8%, var(--surface))",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: ok ? "var(--good)" : "var(--bad)" }}>
            {ok ? "Connected to Loyverse" : status.configured ? "Connection failed" : "Not configured"}
          </div>
          <div className="mt-1 text-xs text-[var(--fg-mute)]">
            {status.message ??
              (ok
                ? `${status.store_count ?? 0} store(s) found`
                : "Add LOYVERSE_ACCESS_TOKEN to .env.local")}
          </div>
        </div>
        {ok && status.stores && (
          <div className="text-right text-xs text-[var(--fg-mute)]">
            {status.stores.map((s) => (
              <div key={s.id}>{s.name}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── API Explorer tab ──────────────────────────────────────────────────────────

function ApiExplorerTab({
  catalog,
  status,
}: {
  catalog: CatalogEndpoint[];
  status: StatusResponse | null;
}) {
  const [resource, setResource] = useState("stores");
  const [storeId, setStoreId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState("25");
  const [fetchAll, setFetchAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [notes, setNotes] = useState<EndpointNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState<EndpointNoteStatus>("unset");

  const endpoint = catalog.find((e) => e.id === resource);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTE_STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const saveNotes = useCallback((next: EndpointNote[]) => {
    setNotes(next);
    localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const currentNote = notes.find((n) => n.endpointId === resource);

  useEffect(() => {
    if (currentNote) {
      setNoteText(currentNote.note);
      setNoteStatus(currentNote.status);
    } else {
      setNoteText("");
      setNoteStatus("unset");
    }
  }, [resource, currentNote]);

  const grouped = useMemo(() => {
    const groups: Record<string, CatalogEndpoint[]> = { high: [], medium: [], low: [] };
    for (const e of catalog) groups[e.relevance].push(e);
    return groups;
  }, [catalog]);

  async function runProbe() {
    if (!endpoint) return;
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({ resource });
      if (limit) params.set("limit", limit);
      if (storeId && endpoint.supportsStoreFilter) params.set("store_id", storeId);
      if (dateFrom && endpoint.supportsDateFilter) params.set("created_at_min", `${dateFrom}T00:00:00.000Z`);
      if (dateTo && endpoint.supportsDateFilter) params.set("created_at_max", `${dateTo}T23:59:59.999Z`);
      if (fetchAll) params.set("fetch_all", "true");

      const res = await fetch(`/api/loyverse-sandbox/probe?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Probe failed");
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Probe failed");
    } finally {
      setLoading(false);
    }
  }

  function saveEndpointNote() {
    const next = notes.filter((n) => n.endpointId !== resource);
    if (noteStatus !== "unset" || noteText.trim()) {
      next.push({ endpointId: resource, status: noteStatus, note: noteText.trim() });
    }
    saveNotes(next);
    toast.success("Note saved");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-[var(--fg-mute)]">Endpoint</label>
          <select
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            {(["high", "medium", "low"] as const).map((rel) =>
              grouped[rel].length > 0 ? (
                <optgroup key={rel} label={`${rel.charAt(0).toUpperCase() + rel.slice(1)} relevance`}>
                  {grouped[rel].map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </optgroup>
              ) : null,
            )}
          </select>
          {endpoint && (
            <p className="text-xs text-[var(--fg-mute)]">
              <span style={{ color: relevanceColor(endpoint.relevance) }}>●</span>{" "}
              {endpoint.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {endpoint?.supportsStoreFilter && (
            <div>
              <label className="text-xs font-medium text-[var(--fg-mute)]">Store ID</label>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <option value="">All stores</option>
                {(status?.stores ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {endpoint?.supportsDateFilter && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-[var(--fg-mute)]">From</label>
                <DateInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--fg-mute)]">To</label>
                <DateInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-[var(--fg-mute)]">Limit</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-xs">
              <input type="checkbox" checked={fetchAll} onChange={(e) => setFetchAll(e.target.checked)} />
              Fetch all pages
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={runProbe} disabled={loading || !status?.connected}>
          {loading ? "Running…" : "Run probe"}
        </Button>
        {result !== null && (
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(result, null, 2));
              toast.success("Copied JSON");
            }}
          >
            Copy JSON
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
        <div className="mb-2 text-xs font-medium text-[var(--fg-mute)]">Endpoint notes (saved locally)</div>
        <div className="flex flex-wrap gap-2">
          {(["useful", "needs_mapping", "useless", "unset"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setNoteStatus(s)}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                background: noteStatus === s ? "var(--accent)" : "var(--muted)",
                color: noteStatus === s ? "var(--accent-fg)" : "var(--fg-mute)",
              }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Notes while exploring…"
          className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
          rows={2}
        />
        <Button size="sm" variant="outline" className="mt-2" onClick={saveEndpointNote}>
          Save note
        </Button>
      </div>

      {result !== null && (
        <pre
          className="max-h-[480px] overflow-auto rounded-lg border border-[var(--line)] bg-[var(--bg)] p-4 text-xs"
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Mapping preview tab ───────────────────────────────────────────────────────

function MappingPreviewTab({ stores }: { stores: { id: string; name: string }[] }) {
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DailySummaryResult | null>(null);

  useEffect(() => {
    if (!storeId && stores[0]) setStoreId(stores[0].id);
  }, [stores, storeId]);

  async function loadSummary() {
    if (!storeId || !date) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ store_id: storeId, date });
      const res = await fetch(`/api/loyverse-sandbox/summary?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load summary");
      setSummary(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Summary failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-[var(--fg-mute)]">Store</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="mt-1 block rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--fg-mute)]">Date</label>
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <Button onClick={loadSummary} disabled={loading || !storeId}>
          {loading ? "Loading…" : "Compare"}
        </Button>
      </div>

      {summary && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-[var(--line)] p-3">
              <div className="text-xs text-[var(--fg-mute)]">Auto-fillable fields</div>
              <div className="text-2xl font-semibold">{summary.coverage.percent}%</div>
              <div className="text-xs text-[var(--fg-mute)]">
                {summary.coverage.auto_fillable_count} of {summary.coverage.total_trackable} daily entry fields
              </div>
            </div>
            <div className="rounded-lg border border-[var(--line)] p-3">
              <div className="text-xs text-[var(--fg-mute)]">Receipts</div>
              <div className="text-2xl font-semibold">{summary.meta.receipt_count}</div>
              <div className="text-xs text-[var(--fg-mute)]">
                {summary.meta.sale_count} sales, {summary.meta.refund_count} refunds
              </div>
            </div>
            <div className="rounded-lg border border-[var(--line)] p-3">
              <div className="text-xs text-[var(--fg-mute)]">Challenges</div>
              <div className="text-sm">
                entry_count: <strong>{summary.challenges.entry_count}</strong>
              </div>
              <div className="text-sm">
                snacks_sold: <strong>{summary.challenges.snacks_sold}</strong>
              </div>
            </div>
          </div>

          {!summary.location_id && (
            <div className="rounded-lg border border-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_10%,var(--surface))] p-3 text-sm">
              No store → location mapping yet. Add entries in{" "}
              <code className="text-xs">store-mapping.ts</code> to compare with existing accounting data.
            </div>
          )}

          {(summary.meta.unmapped_line_items > 0 || summary.meta.unmapped_payments > 0) && (
            <div className="rounded-lg border border-[var(--warn)] p-3 text-sm text-[var(--fg-mute)]">
              Unmapped: {summary.meta.unmapped_line_items} line items, {summary.meta.unmapped_payments} payments —
              refine <code className="text-xs">mapping-config.ts</code>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--muted)] text-left text-xs text-[var(--fg-mute)]">
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Loyverse</th>
                  <th className="px-3 py-2">Accounting</th>
                  <th className="px-3 py-2">Delta</th>
                </tr>
              </thead>
              <tbody>
                {summary.field_diffs.map((row) => (
                  <tr key={row.field} className="border-b border-[var(--line)]">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2 font-mono text-xs">{thb(row.proposed)}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.existing === null ? "—" : thb(row.existing)}
                    </td>
                    <td
                      className="px-3 py-2 font-mono text-xs"
                      style={{
                        color:
                          row.delta === null
                            ? "var(--fg-mute)"
                            : Math.abs(row.delta) < 1
                              ? "var(--good)"
                              : "var(--warn)",
                      }}
                    >
                      {row.delta === null ? "—" : thb(row.delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-[var(--fg-mute)]">
            Manual fields (not from Loyverse): {summary.coverage.manual_fields.join(", ")}
          </div>
        </>
      )}
    </div>
  );
}

// ── Store mapping tab ─────────────────────────────────────────────────────────

function StoreMappingTab() {
  const [data, setData] = useState<MappingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/loyverse-sandbox/mapping")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("Failed to load mappings"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-[var(--fg-mute)]">Loading mappings…</div>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--fg-mute)]">
        Edit <code className="text-xs">{data.config_file}</code> to link Loyverse stores to Nexus locations.
      </p>

      {data.mappings.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--muted)] text-left text-xs text-[var(--fg-mute)]">
                <th className="px-3 py-2">Loyverse store</th>
                <th className="px-3 py-2">Nexus location</th>
              </tr>
            </thead>
            <tbody>
              {data.mappings.map((m) => (
                <tr key={m.store_id} className="border-b border-[var(--line)]">
                  <td className="px-3 py-2">
                    {m.store_name ?? m.store_id}
                    <div className="font-mono text-xs text-[var(--fg-mute)]">{m.store_id}</div>
                  </td>
                  <td className="px-3 py-2">
                    {m.location_name ?? m.location_id}
                    <div className="font-mono text-xs text-[var(--fg-mute)]">{m.location_id}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--line)] p-4 text-sm text-[var(--fg-mute)]">
          No mappings configured yet.
        </div>
      )}

      {data.unmapped_stores.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium text-[var(--fg-mute)]">Unmapped Loyverse stores</div>
          <div className="flex flex-col gap-1">
            {data.unmapped_stores.map((s) => (
              <div key={s.id} className="rounded-md border border-[var(--line)] px-3 py-2 text-sm">
                {s.name}
                <span className="ml-2 font-mono text-xs text-[var(--fg-mute)]">{s.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-medium text-[var(--fg-mute)]">Nexus locations (for reference)</div>
        <div className="grid gap-1 sm:grid-cols-2">
          {data.nexus_locations.map((l) => (
            <div key={l.id} className="rounded-md border border-[var(--line)] px-3 py-2 text-sm">
              {l.name}
              <span className="ml-2 font-mono text-xs text-[var(--fg-mute)]">{l.id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Demo report tab ───────────────────────────────────────────────────────────

function DemoReportTab({ stores }: { stores: { id: string; name: string }[] }) {
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [days, setDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DemoReportResult | null>(null);

  useEffect(() => {
    if (!storeId && stores[0]) setStoreId(stores[0].id);
  }, [stores, storeId]);

  async function loadReport() {
    if (!storeId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ store_id: storeId, days });
      const res = await fetch(`/api/loyverse-sandbox/demo?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo report failed");
      setReport(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo report failed");
    } finally {
      setLoading(false);
    }
  }

  function exportJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loyverse-demo-${report.store_id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--fg-mute)]">
        Read-only coverage report for your boss — shows what Loyverse can auto-fill vs what stays manual.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-[var(--fg-mute)]">Store</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="mt-1 block rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--fg-mute)]">Days</label>
          <input
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="mt-1 block w-20 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </div>
        <Button onClick={loadReport} disabled={loading || !storeId}>
          {loading ? "Generating…" : "Generate report"}
        </Button>
        {report && (
          <Button variant="outline" onClick={exportJson}>
            Export JSON
          </Button>
        )}
      </div>

      {report && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--line)] p-4">
              <div className="text-xs text-[var(--fg-mute)]">Average field coverage</div>
              <div className="text-3xl font-semibold">{report.average_coverage_percent}%</div>
              <div className="mt-1 text-xs text-[var(--fg-mute)]">
                Target: 85% — sales + payments + VAT from Loyverse; expenses/HR/cash stay manual
              </div>
            </div>
            <div className="rounded-lg border border-[var(--line)] p-4">
              <div className="text-xs text-[var(--fg-mute)]">Challenges automated</div>
              <ul className="mt-2 list-inside list-disc text-sm">
                {report.challenges_automated.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--muted)] text-left text-xs text-[var(--fg-mute)]">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Receipts</th>
                  <th className="px-3 py-2">Coverage</th>
                  <th className="px-3 py-2">Accounting row exists</th>
                </tr>
              </thead>
              <tbody>
                {report.days.map((d) => (
                  <tr key={d.date} className="border-b border-[var(--line)]">
                    <td className="px-3 py-2">{d.date}</td>
                    <td className="px-3 py-2">{d.receipt_count}</td>
                    <td className="px-3 py-2">{d.coverage_percent}%</td>
                    <td className="px-3 py-2">{d.has_existing_entry ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main client ───────────────────────────────────────────────────────────────

export function LoyverseSandboxClient() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [catalog, setCatalog] = useState<CatalogEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/loyverse-sandbox/status").then((r) => r.json()),
      fetch("/api/loyverse-sandbox/catalog").then((r) => r.json()),
    ])
      .then(([statusData, catalogData]) => {
        setStatus(statusData);
        setCatalog(catalogData.endpoints ?? []);
      })
      .catch(() => toast.error("Failed to load sandbox"))
      .finally(() => setLoading(false));
  }, []);

  const stores = status?.stores ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader
        eyebrow="Alpha · Owner only"
        title="Loyverse Sandbox"
        subtitle="Explore the Loyverse API, map data to accounting & challenges, and build a demo for subscription approval."
      />

      <div className="mb-6">
        <ConnectionCard status={status} loading={loading} />
      </div>

      <Tabs defaultValue="explorer">
        <TabsList>
          <TabsTrigger value="explorer">API Explorer</TabsTrigger>
          <TabsTrigger value="mapping">Mapping Preview</TabsTrigger>
          <TabsTrigger value="stores">Store Mapping</TabsTrigger>
          <TabsTrigger value="demo">Demo Report</TabsTrigger>
        </TabsList>

        <TabsContent value="explorer" className="mt-4">
          <ApiExplorerTab catalog={catalog} status={status} />
        </TabsContent>
        <TabsContent value="mapping" className="mt-4">
          <MappingPreviewTab stores={stores} />
        </TabsContent>
        <TabsContent value="stores" className="mt-4">
          <StoreMappingTab />
        </TabsContent>
        <TabsContent value="demo" className="mt-4">
          <DemoReportTab stores={stores} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
