"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangleIcon, ChevronLeftIcon, ChevronRightIcon, PencilLineIcon, SaveIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { toast } from "sonner";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

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

export function DirectionComparaison() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [focusMonth, setFocusMonth] = useState(() => new Date().getMonth() + 1);
  const [data, setData] = useState<RevenueComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hovered, setHovered] = useState<number | null>(null);

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

  useEffect(() => {
    void load(year, focusMonth);
  }, [load, year, focusMonth]);

  function startEditing() {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const input of data.inputs) next[`${input.location_id}:${input.month}`] = String(input.amount);
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Année</span>
        <div style={selectorStyle}>
          <button type="button" onClick={() => setYear((v) => v - 1)} disabled={editing} aria-label="Previous year" style={{ ...iconBtnStyle, opacity: editing ? 0.4 : 1 }}>
            <ChevronLeftIcon size={14} />
          </button>
          <strong className="mono" style={{ minWidth: 52, textAlign: "center" }}>{year}</strong>
          <button type="button" onClick={() => setYear((v) => v + 1)} disabled={editing} aria-label="Next year" style={{ ...iconBtnStyle, opacity: editing ? 0.4 : 1 }}>
            <ChevronRightIcon size={14} />
          </button>
        </div>
        <span style={{ fontSize: 11, color: "var(--fg-4)", marginLeft: 6 }}>Mois</span>
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
            <PencilLineIcon size={13} />Modifier {data.prevYear}
          </Button>
        )}
        {editing && (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              <XIcon size={13} />Annuler
            </Button>
            <Button size="sm" onClick={() => void saveEdits()} disabled={saving}>
              <SaveIcon size={13} />{saving ? "Enregistrement…" : `Enregistrer ${editTargetYear}`}
            </Button>
          </>
        )}
      </div>

      {loading && <Card style={{ alignItems: "center", padding: 64, color: "var(--fg-4)" }}>Chargement…</Card>}
      {!loading && error && (
        <Card style={{ borderColor: "var(--bad)", background: "var(--bad-soft)", gap: 8 }}>
          <strong style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangleIcon size={15} />Comparaison indisponible</strong>
          <span style={{ color: "var(--fg-3)" }}>{error}</span>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          {/* Top summary — 6 valeurs simples, revenue only */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--s-3)" }}>
            <Card style={{ gap: 6 }}>
              <Stat
                label={`Ce mois · ${MONTH_LONG[focusMonth - 1]} ${year}`}
                value={money(data.totals.currentMonth.current)}
                delta={deltaParts(data.totals.currentMonth.current, data.totals.currentMonth.prev).text}
                deltaDir={deltaParts(data.totals.currentMonth.current, data.totals.currentMonth.prev).dir}
                hint={`${data.prevYear} : ${money(data.totals.currentMonth.prev)} · Écart ${money(data.totals.currentMonth.delta)}`}
              />
            </Card>
            <Card style={{ gap: 6 }}>
              <Stat
                label={`Cumul à date · ${year}`}
                value={money(data.totals.ytd.current)}
                delta={deltaParts(data.totals.ytd.current, data.totals.ytd.prev).text}
                deltaDir={deltaParts(data.totals.ytd.current, data.totals.ytd.prev).dir}
                hint={`${data.prevYear} : ${money(data.totals.ytd.prev)} · Écart ${money(data.totals.ytd.delta)}`}
              />
            </Card>
            <Card style={{ gap: 6 }}>
              <Stat
                label={`Année complète · ${data.prevYear}`}
                value={money(data.totals.prevYearTotal)}
                hint={`${year} à date : ${money(data.totals.currentYearTotal)}`}
              />
            </Card>
          </div>

          {data.inputStatus.monthsWithPrevData.length < 12 && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--warn)", display: "flex", alignItems: "center", gap: 7 }}>
              <AlertTriangleIcon size={14} />
              Pas de données {data.prevYear} pour : {MONTHS.filter((_, i) => !data.inputStatus.monthsWithPrevData.includes(i + 1)).join(", ") || "—"}.
              {data.canEdit && <> — Utilisez “Modifier {data.prevYear}” pour saisir les chiffres.</>}
            </p>
          )}

          {!editing && (
            <>
              {/* Chart */}
              <Card style={{ gap: 12, padding: "var(--s-4) var(--s-5)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 13 }}>Chiffre d’affaires par mois — {year} vs {data.prevYear}</strong>
                  <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)" }} /> {year}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} /> {data.prevYear}</span>
                  </div>
                </div>
                {(() => {
                  const max = Math.max(...data.byMonth.map((p) => Math.max(p.current, p.prev)), 1);
                  return (
                    <div style={{ display: "flex", alignItems: "end", gap: 4, height: 150 }}>
                      {data.byMonth.map((p) => (
                        <div
                          key={p.month}
                          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}
                          onMouseEnter={() => setHovered(p.month)}
                          onMouseLeave={() => setHovered(null)}
                        >
                          <div style={{ display: "flex", alignItems: "end", justifyContent: "center", gap: 2, width: "100%", height: 110 }}>
                            <div style={{ flex: 1, borderRadius: "4px 4px 0 0", background: "var(--accent)", height: `${(p.current / max) * 100}%`, opacity: hovered === p.month ? 1 : p.current ? 0.95 : 0.12, transition: "opacity 0.2s" }} />
                            <div style={{ flex: 1, borderRadius: "4px 4px 0 0", background: "#f59e0b", height: `${(p.prev / max) * 100}%`, opacity: hovered === p.month ? 1 : 0.85, transition: "opacity 0.2s" }} />
                          </div>
                          <span style={{ fontSize: 10, color: "var(--fg-4)" }}>{MONTHS[p.month - 1]}</span>
                          {hovered === p.month && (
                            <div style={{ position: "absolute", bottom: 125, left: "50%", transform: "translateX(-50%)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none" }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{MONTH_LONG[p.month - 1]}</p>
                              <p className="mono" style={{ margin: 0, fontSize: 12 }}><span style={{ color: "var(--accent)" }}>● {year} :</span> {money(p.current)}</p>
                              <p className="mono" style={{ margin: 0, fontSize: 12 }}><span style={{ color: "#f59e0b" }}>● {data.prevYear} :</span> {money(p.prev)}</p>
                              {p.prev > 0 && <p style={{ margin: 0, fontSize: 11, color: DELTA_COLOR[deltaParts(p.current, p.prev).dir] }}>{deltaParts(p.current, p.prev).text} vs {data.prevYear}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Card>

              {/* Monthly table */}
              <Card flush>
                <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <strong>Mensuel · {year} vs {data.prevYear}</strong>
                  <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{MONTH_LONG[focusMonth - 1]} en surbrillance</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thLeft}>Mois</th>
                        <th style={thStyle}>{year}</th>
                        <th style={thStyle}>{data.prevYear}</th>
                        <th style={thStyle}>Écart</th>
                        <th style={thStyle}>Évol.</th>
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

              {/* By shop */}
              <Card flush>
                <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)" }}>
                  <strong>Par boutique · {MONTH_LONG[focusMonth - 1]} {year}</strong>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thLeft}>Boutique</th>
                        <th style={thStyle}>{year}</th>
                        <th style={thStyle}>{data.prevYear}</th>
                        <th style={thStyle}>Écart</th>
                        <th style={thStyle}>Évol.</th>
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
                <strong>Saisie mensuelle · {editTargetYear}</strong>
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Un montant par boutique et par mois</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thLeft}>Boutique</th>
                      {MONTHS.map((name) => (<th key={name} style={thStyle}>{name}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.locations.map((loc) => (
                      <tr key={loc.id} style={{ borderTop: "1px solid var(--line)" }}>
                        <td style={tdLeft}>{loc.name}</td>
                        {MONTHS.map((_, i) => {
                          const k = `${loc.id}:${i + 1}`;
                          return (
                            <td key={k} style={{ padding: "6px 8px" }}>
                              <input
                                type="number" min={0} step="0.01" inputMode="decimal" placeholder="—"
                                value={drafts[k] ?? ""}
                                onChange={(e) => setDrafts((prev) => ({ ...prev, [k]: e.target.value }))}
                                style={{ width: 90, height: 28, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--fg)", fontSize: 12, fontVariantNumeric: "tabular-nums", padding: "0 6px", textAlign: "right" }}
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
  width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r-sm)", border: "none", background: "transparent", color: "var(--fg-3)", cursor: "pointer",
};
