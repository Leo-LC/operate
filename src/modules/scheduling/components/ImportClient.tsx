"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSheetGrid, matchNames, type ParsedCell } from "@/modules/scheduling/lib/sheet-parse";

interface Props {
  locations: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; name: string; location_id: string | null }>;
}

export function ImportClient({ locations, employees }: Props) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [week, setWeek] = useState("");
  const [tsv, setTsv] = useState("");
  const [cells, setCells] = useState<ParsedCell[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [ambiguous, setAmbiguous] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const branchEmps = employees.filter(
    (e) => e.location_id === locationId || true, // show all for mapping; filter applied at save
  );

  function preview() {
    if (!week) {
      toast.error("Pick the week Monday first");
      return;
    }
    const year = Number(week.slice(0, 4));
    const r = parseSheetGrid(tsv, year, week);
    setCells(r.cells);
    setWarnings(r.warnings);
    setNames(r.names);
    const m = matchNames(r.names, branchEmps);
    setMatched(m.matched);
    setUnmatched(m.unmatched);
    setAmbiguous(m.ambiguous);
    if (r.cells.length === 0) toast.error("No shifts detected — check the pasted range");
    else toast.success(`${r.cells.length} shifts detected for ${r.names.length} people`);
  }

  async function confirmImport() {
    const rows = cells.filter((c) => matched[c.employeeName]);
    if (rows.length === 0) {
      toast.error("No matched employees to import");
      return;
    }
    setImporting(true);
    try {
      const r = await fetch("/api/scheduling/range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          shifts: rows.map((c) => ({
            employee_id: matched[c.employeeName],
            shift_date: c.date,
            start_time: c.start || null,
            end_time: c.end || null,
            is_off: c.isOff,
          })),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.details?.[0] ?? j.error ?? "Import failed");
      toast.success(`Imported ${j.saved} shifts across ${j.weeks} week(s) — verify in Annual editor`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1 · Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2" aria-label="Branch">
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <label className="flex items-center gap-2">
              Week Monday
              <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2" />
            </label>
            <Button onClick={preview}>Preview</Button>
          </div>
          <textarea
            value={tsv}
            onChange={(e) => setTsv(e.target.value)}
            rows={10}
            placeholder="Copy a week tab from Google Sheets (header row + employee START/FINISH rows) and paste here as TSV…"
            className="mt-3 w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Layout handled: header with dates (e.g. “Tue 13 October”), per-person START/FINISH rows, merged OFF,
            trailing TOTAL column and grey Total rows are skipped (totals recomputed). Empty = unscheduled.
          </p>
        </CardContent>
      </Card>

      {(names.length > 0 || warnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>2 · Review ({cells.length} shifts)</CardTitle>
          </CardHeader>
          <CardContent>
            {warnings.length > 0 && (
              <ul className="mb-3 list-disc pl-5 text-xs text-muted-foreground">
                {warnings.slice(0, 20).map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="p-2">Sheet name</th>
                  <th className="p-2">Matched employee</th>
                  <th className="p-2">Cells</th>
                </tr>
              </thead>
              <tbody>
                {names.map((n) => (
                  <tr key={n} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="p-2 font-medium">{n}</td>
                    <td className="p-2">
                      <select
                        value={matched[n] ?? ""}
                        onChange={(e) => setMatched((prev) => ({ ...prev, [n]: e.target.value }))}
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                      >
                        <option value="">— skip —</option>
                        {branchEmps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                      {(unmatched.includes(n) || n.toUpperCase() === "STAFF") && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {n.toUpperCase() === "STAFF" ? "placeholder row — assign or skip" : "no match — assign manually or skip"}
                        </span>
                      )}
                      {ambiguous.includes(n) && <span className="ml-2 text-xs" style={{ color: "var(--warn)" }}>multiple matches — pick one</span>}
                    </td>
                    <td className="p-2 font-mono text-xs">{cells.filter((c) => c.employeeName === n).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <Button onClick={confirmImport} disabled={importing || cells.length === 0}>
                {importing ? "Importing…" : `Import ${cells.filter((c) => matched[c.employeeName]).length} matched shifts`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
