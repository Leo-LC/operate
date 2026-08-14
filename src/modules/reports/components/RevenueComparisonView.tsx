"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilLineIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { toast } from "sonner";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface MonthComparison {
  month: number;
  current: number;
  prev: number;
  delta: number;
  deltaPct: number | null;
}

interface ShopComparison {
  locationId: string;
  locationName: string;
  current: number;
  prev: number;
  prevFromInput: boolean;
  delta: number;
  deltaPct: number | null;
}

interface RevenueComparisonData {
  year: number;
  prevYear: number;
  focusMonth: number;
  locations: { id: string; name: string }[];
  byMonth: MonthComparison[];
  byShopFocus: ShopComparison[];
  inputs: { location_id: string; month: number; amount: number }[];
  totals: {
    currentMonth: MonthComparison;
    ytd: { current: number; prev: number; delta: number; deltaPct: number | null };
    currentYearTotal: number;
    prevYearTotal: number;
  };
  inputStatus: { monthsWithPrevData: number[] };
  canEdit: boolean;
}

function money(value: number) {
  const absolute = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return value < 0 ? `(฿${absolute})` : `฿${absolute}`;
}

function deltaParts(current: number, prev: number): { text: string; dir: "up" | "down" | "neutral" } {
  if (prev <= 0) return { text: "—", dir: "neutral" };
  const pct = ((current - prev) / prev) * 100;
  const dir = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "neutral";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
  return { text: `${arrow} ${Math.abs(pct).toFixed(1)}%`, dir };
}

const DELTA_COLOR: Record<"up" | "down" | "neutral", string> = {
  up: "var(--good)",
  down: "var(--bad)",
  neutral: "var(--fg-4)",
};

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const thStyle: React.CSSProperties = { padding: "8px 12px", color: "var(--fg-4)", fontWeight: 500, textAlign: "right", background: "var(--bg-2)", whiteSpace: "nowrap" };
const thLeft: React.CSSProperties = { ...thStyle, textAlign: "left" };
const tdLeft: React.CSSProperties = { padding: "8px 12px", whiteSpace: "nowrap" };
const tdNumber: React.CSSProperties = { padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" };
const rowActive: React.CSSProperties = { background: "var(--row-active)" };

function deltaCell(current: number, prev: number) {
  const parts = deltaParts(current, prev);
  return <span style={{ color: DELTA_COLOR[parts.dir], fontVariantNumeric: "tabular-nums" }}>{parts.text}</span>;
}

export function RevenueComparisonView() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [focusMonth, setFocusMonth] = useState(() => new Date().getMonth() + 1);
  const [data, setData] = useState<RevenueComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/revenue-comparison?year=${y}&month=${m}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to load comparison");
      setData(json as RevenueComparisonData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load comparison");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(year, focusMonth); }, [load, year, focusMonth]);

  function startEditing() {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const input of data.inputs) {
      next[`${input.location_id}:${input.month}`] = String(input.amount);
    }
    setDrafts(next);
    setEditing(true);
  }

  async function saveEdits() {
    if (!data) return;
    setSaving(true);
    const rows: { location_id: string; month: number; amount: number }[] = [];
    for (const loc of data.locations) {
      for (let month = 1; month <= 12; month++) {
        const raw = drafts[`${loc.id}:${month}`] ?? "";
        const amount = parseFloat(raw);
        rows.push({ location_id: loc.id, month, amount: Number.isFinite(amount) ? amount : 0 });
      }
    }
    try {
      const response = await fetch("/api/reports/revenue-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: data.prevYear, rows }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Save failed");
      toast.success(`Saved ${result.saved} entries for ${data.prevYear}`);
      setEditing(false);
      await load(year, focusMonth);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const editTargetYear = data ? data.prevYear : year - 1;

  const selectorStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    height: 32,
    padding: "0 6px",
    borderRadius: "var(--r-sm)",
    border: "1px solid var(--line)",
    background: "var(--bg)",
    fontSize: 13,
    color: "var(--fg)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "var(--s-3)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", background: "var(--surface)" }}>
        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Year</span>
        <div style={selectorStyle}>
          <button type="button" onClick={() => setYear((v) => v - 1)} disabled={editing} aria-label="Previous year" style={{ ...iconBtnStyle, opacity: editing ? 0.4 : 1 }}>
            <ChevronLeftIcon size={14} />
          </button>
          <strong className="mono" style={{ minWidth: 52, textAlign: "center" }}>{year}</strong>
          <button type="button" onClick={() => setYear((v) => v + 1)} disabled={editing} aria-label="Next year" style={{ ...iconBtnStyle, opacity: editing ? 0.4 : 1 }}>
            <ChevronRightIcon size={14} />
          </button>
        </div>

        <span style={{ fontSize: 11, color: "var(--fg-4)", marginLeft: 6 }}>Month</span>
        <select
          value={focusMonth}
          disabled={editing}
          onChange={(e) => setFocusMonth(Number(e.target.value))}
          style={{ height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", fontSize: 13, color: "var(--fg)", padding: "0 8px" }}
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />
        {data?.canEdit && !editing && (
          <Button size="sm" variant="outline" onClick={startEditing}>
            <PencilLineIcon size={13} />Edit {data.prevYear} data
          </Button>
        )}
        {editing && (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              <XIcon size={13} />Cancel
            </Button>
            <Button size="sm" onClick={() => void saveEdits()} disabled={saving}>
              <SaveIcon size={13} />{saving ? "Saving…" : `Save ${editTargetYear}`}
            </Button>
          </>
        )}
      </div>

      {loading && <Card style={{ alignItems: "center", padding: 64, color: "var(--fg-4)" }}>Loading comparison…</Card>}
      {!loading && error && (
        <Card style={{ borderColor: "var(--bad)", background: "var(--bad-soft)", gap: 8 }}>
          <strong style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangleIcon size={15} />Comparison unavailable</strong>
          <span style={{ color: "var(--fg-3)" }}>{error}</span>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          {/* Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--s-3)" }}>
            <Card style={{ gap: 6 }}>
              <Stat
                label={`This month · ${MONTH_LONG[focusMonth - 1]} ${year}`}
                value={money(data.totals.currentMonth.current)}
                delta={deltaParts(data.totals.currentMonth.current, data.totals.currentMonth.prev).text}
                deltaDir={deltaParts(data.totals.currentMonth.current, data.totals.currentMonth.prev).dir}
                hint={`${data.prevYear} same month: ${money(data.totals.currentMonth.prev)}`}
              />
            </Card>
            <Card style={{ gap: 6 }}>
              <Stat
                label={`Year to date · ${year}`}
                value={money(data.totals.ytd.current)}
                delta={deltaParts(data.totals.ytd.current, data.totals.ytd.prev).text}
                deltaDir={deltaParts(data.totals.ytd.current, data.totals.ytd.prev).dir}
                hint={`${data.prevYear} YTD: ${money(data.totals.ytd.prev)}`}
              />
            </Card>
            <Card style={{ gap: 6 }}>
              <Stat
                label={`Full year · ${data.prevYear}`}
                value={money(data.totals.prevYearTotal)}
                hint={`${year} so far: ${money(data.totals.currentYearTotal)}`}
              />
            </Card>
          </div>

          {/* Missing prev-year data hint */}
          {data.inputStatus.monthsWithPrevData.length < 12 && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--warn)", display: "flex", alignItems: "center", gap: 7 }}>
              <AlertTriangleIcon size={14} />
              No {data.prevYear} revenue entered for: {MONTHS.filter((_, i) => !data.inputStatus.monthsWithPrevData.includes(i + 1)).join(", ") || "—"}.
              {data.canEdit && <> Use “Edit {data.prevYear} data” to add monthly figures.</>}
            </p>
          )}

          {!editing && (
            <>
              {/* Company-wide 12-month table */}
              <Card flush>
                <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <strong>Company-wide · {MONTHS[focusMonth - 1]} highlighted</strong>
                  <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{year} from accounting · {data.prevYear} as entered</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thLeft}>Month</th>
                        <th style={thStyle}>{year}</th>
                        <th style={thStyle}>{data.prevYear}</th>
                        <th style={thStyle}>Δ</th>
                        <th style={thStyle}>Δ%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byMonth.map((row) => {
                        const isFocus = row.month === focusMonth;
                        return (
                          <tr key={row.month} style={{ borderTop: "1px solid var(--line)", ...(isFocus ? rowActive : {}) }}>
                            <td style={{ ...tdLeft, fontWeight: isFocus ? 650 : 400 }}>{MONTHS[row.month - 1]}</td>
                            <td style={tdNumber}>{money(row.current)}</td>
                            <td style={{ ...tdNumber, color: row.prev > 0 ? "var(--fg)" : "var(--fg-4)" }}>{row.prev > 0 ? money(row.prev) : "—"}</td>
                            <td style={tdNumber}>{row.prev > 0 ? money(row.delta) : "—"}</td>
                            <td style={tdNumber}>{row.prev > 0 ? deltaCell(row.current, row.prev) : <span style={{ color: "var(--fg-4)" }}>—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Per-shop table for focus month */}
              <Card flush>
                <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <strong>By shop · {MONTH_LONG[focusMonth - 1]} {year}</strong>
                  <span style={{ fontSize: 11, color: "var(--fg-4)" }}>vs same month {data.prevYear}</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thLeft}>Shop</th>
                        <th style={thStyle}>{year}</th>
                        <th style={thStyle}>{data.prevYear}</th>
                        <th style={thStyle}>Δ</th>
                        <th style={thStyle}>Δ%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byShopFocus.map((shop) => {
                        const hasPrev = shop.prev > 0 || shop.prevFromInput;
                        return (
                          <tr key={shop.locationId} style={{ borderTop: "1px solid var(--line)" }}>
                            <td style={tdLeft}>{shop.locationName}</td>
                            <td style={tdNumber}>{money(shop.current)}</td>
                            <td style={{ ...tdNumber, color: hasPrev ? "var(--fg)" : "var(--fg-4)" }}>{hasPrev ? money(shop.prev) : "—"}</td>
                            <td style={tdNumber}>{hasPrev ? money(shop.delta) : "—"}</td>
                            <td style={tdNumber}>{hasPrev ? deltaCell(shop.current, shop.prev) : <span style={{ color: "var(--fg-4)" }}>—</span>}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 650 }}>
                        <td style={tdLeft}><strong>Total</strong></td>
                        <td style={{ ...tdNumber, fontWeight: 650 }}>{money(data.byShopFocus.reduce((s, shop) => s + shop.current, 0))}</td>
                        <td style={{ ...tdNumber, fontWeight: 650 }}>{money(data.byShopFocus.reduce((s, shop) => s + shop.prev, 0))}</td>
                        <td style={{ ...tdNumber, fontWeight: 650 }}>{money(data.byShopFocus.reduce((s, shop) => s + shop.delta, 0))}</td>
                        <td style={tdNumber}><strong>{deltaCell(data.byShopFocus.reduce((s, shop) => s + shop.current, 0), data.byShopFocus.reduce((s, shop) => s + shop.prev, 0))}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* Inline edit grid */}
          {editing && (
            <Card flush>
              <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <strong>Enter monthly revenue · {editTargetYear}</strong>
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>One number per shop per month. Leave empty for no data.</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thLeft}>Shop</th>
                      {MONTHS.map((name) => (
                        <th key={name} style={thStyle}>{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.locations.map((loc) => (
                      <tr key={loc.id} style={{ borderTop: "1px solid var(--line)" }}>
                        <td style={tdLeft}>{loc.name}</td>
                        {MONTHS.map((_, i) => {
                          const key = `${loc.id}:${i + 1}`;
                          return (
                            <td key={key} style={{ padding: "6px 8px" }}>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                placeholder="—"
                                value={drafts[key] ?? ""}
                                onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                                style={{
                                  width: 90,
                                  height: 28,
                                  borderRadius: "var(--r-sm)",
                                  border: "1px solid var(--line)",
                                  background: "var(--bg)",
                                  color: "var(--fg)",
                                  fontSize: 12,
                                  fontVariantNumeric: "tabular-nums",
                                  padding: "0 6px",
                                  textAlign: "right",
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--r-sm)",
  border: "none",
  background: "transparent",
  color: "var(--fg-3)",
  cursor: "pointer",
};
