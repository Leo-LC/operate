"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ReceiptTextIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import {
  MONTH_LONG,
  formatMoney,
  formatMonthLabel,
  shortShopName,
  shopRemaining,
  type EndOfMonthShop,
  type EndOfMonthTotals,
} from "@/modules/direction/lib/endOfMonth";

interface EndOfMonthData {
  month: string;
  shops: EndOfMonthShop[];
  totals: EndOfMonthTotals;
}

const amountStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};
function MissingBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        color: "var(--warn)",
        background: "var(--warn-soft)",
        border: "1px solid var(--warn)",
        borderRadius: "var(--r-pill)",
        padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      <AlertTriangleIcon size={11} />
      {label}
    </span>
  );
}

const COST_ROWS = [
  { key: "loyers", label: "Loyers" },
  { key: "marketing", label: "Marketing" },
  { key: "fournisseurs", label: "Fournisseurs" },
  { key: "autres", label: "Autres" },
] as const;

export function DirectionEndOfMonth() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [focusMonth, setFocusMonth] = useState(() => new Date().getMonth() + 1);
  const [data, setData] = useState<EndOfMonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const mm = String(m).padStart(2, "0");
      const res = await fetch(`/api/direction/end-of-month?month=${y}-${mm}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Chargement impossible");
      setData(json as EndOfMonthData);
      setExpanded(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year, focusMonth);
  }, [load, year, focusMonth]);

  function toggleShop(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
  const iconBtnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "var(--fg-3)",
    borderRadius: "var(--r-sm)",
  };

  const totals = data?.totals;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      {/* Header — title + month navigation (same pattern as Comparaison) */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Fin de mois</h2>
        <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{formatMonthLabel(year, focusMonth)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Année</span>
        <div style={selectorStyle}>
          <button type="button" onClick={() => setYear((v) => v - 1)} aria-label="Année précédente" style={iconBtnStyle}>
            <ChevronLeftIcon size={14} />
          </button>
          <strong className="mono" style={{ minWidth: 52, textAlign: "center" }}>{year}</strong>
          <button type="button" onClick={() => setYear((v) => v + 1)} aria-label="Année suivante" style={iconBtnStyle}>
            <ChevronRightIcon size={14} />
          </button>
        </div>
        <span style={{ fontSize: 11, color: "var(--fg-4)", marginLeft: 6 }}>Mois</span>
        <select
          value={focusMonth}
          onChange={(e) => setFocusMonth(Number(e.target.value))}
          style={{ height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", fontSize: 13, color: "var(--fg)", padding: "0 8px" }}
        >
          {MONTH_LONG.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>
      </div>

      {loading && <Card style={{ alignItems: "center", padding: 64, color: "var(--fg-4)" }}>Chargement…</Card>}
      {!loading && error && (
        <Card style={{ borderColor: "var(--bad)", background: "var(--bad-soft)", gap: 8 }}>
          <strong style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangleIcon size={15} />Fin de mois indisponible</strong>
          <span style={{ color: "var(--fg-3)" }}>{error}</span>
        </Card>
      )}

      {!loading && !error && data && totals && (
        <>
          {/* 3 summary cards — stack vertically on mobile via auto-fit */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--s-3)" }}>
            <Card style={{ gap: 6 }}>
              <Stat
                label="Espèces en coffre"
                value={formatMoney(totals.cash)}
                hint={totals.missingSafeShops.length > 0 ? `${totals.missingSafeShops.length} coffre(s) manquant(s)` : "Tous les magasins"}
              />
            </Card>
            <Card style={{ gap: 6 }}>
              <Stat
                label="Sorties prévues"
                value={formatMoney(totals.takeOut)}
                hint={totals.unfinalizedCategories.length > 0 ? `Non finalisé : ${totals.unfinalizedCategories.join(", ")}` : "Salaires, loyers, marketing et autres paiements"}
              />
            </Card>
            <Card style={{ gap: 6, border: "1.5px solid var(--accent)", background: "var(--accent-soft)" }}>
              <Stat
                label="Reste en coffre"
                value={totals.remaining != null ? formatMoney(totals.remaining) : "—"}
                hint={totals.complete ? "Après les sorties prévues" : "Calcul impossible — données manquantes"}
              />
            </Card>
          </div>

          {!totals.complete && (
            <Card style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", gap: 6 }}>
              <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <AlertTriangleIcon size={15} />Données incomplètes pour {formatMonthLabel(year, focusMonth)}
              </strong>
              <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
                {totals.missingSafeShops.length > 0 && <>Coffre manquant : {totals.missingSafeShops.join(", ")}. </>}
                {totals.unfinalizedCategories.length > 0 && <>{totals.unfinalizedCategories.join(", ")} : non finalisé. </>}
                Le reste en coffre ne peut pas être calculé pour l’instant.
              </span>
            </Card>
          )}

          {/* Par boutique : coffre + sorties prévues + toggle détail */}
          <Card style={{ gap: 0, padding: "var(--s-4) var(--s-5)" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)" }}>
              Par boutique
            </h3>
            {data.shops.map((shop, i) => {
              const isOpen = expanded.has(shop.locationId);
              const remaining = shopRemaining(shop);
              return (
                <div key={shop.locationId} style={{ borderBottom: i === data.shops.length - 1 ? "none" : "1px solid var(--line)", padding: "12px 0" }}>
                  {/* Coffre */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{shortShopName(shop.name)}</span>
                    {shop.missing || shop.safe == null ? (
                      <MissingBadge label="Montant manquant" />
                    ) : (
                      <span style={{ ...amountStyle, fontSize: 15, fontWeight: 700 }}>{formatMoney(shop.safe)}</span>
                    )}
                  </div>
                  {/* Sorties prévues + toggle */}
                  <button
                    type="button"
                    onClick={() => toggleShop(shop.locationId)}
                    aria-expanded={isOpen}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "8px 0 0", border: "none", background: "none", cursor: "pointer",
                      fontSize: 13, color: "var(--fg-3)", textAlign: "left",
                    }}
                  >
                    <span>Sorties prévues</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ ...amountStyle, color: "var(--fg)" }}>{formatMoney(shop.takeOut)}</span>
                    <ChevronDownIcon
                      size={14}
                      style={{ color: "var(--fg-4)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform var(--dur) var(--ease)" }}
                    />
                  </button>
                  {isOpen && (
                    <div style={{ paddingTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "6px 0", fontSize: 12 }}>
                        <span style={{ color: "var(--fg-3)" }}>
                          Salaires
                          <span style={{ color: "var(--fg-4)", marginLeft: 6 }}>
                            {shop.salaries.headcount} personne{shop.salaries.headcount > 1 ? "s" : ""}
                          </span>
                        </span>
                        <span style={{ ...amountStyle, color: "var(--fg-3)" }}>{formatMoney(shop.salaries.total)}</span>
                      </div>
                      {(shop.salaries.base > 0 || shop.salaries.serviceCharge > 0 || shop.salaries.adjustments !== 0) && (
                        <div style={{ fontSize: 11, color: "var(--fg-4)", paddingBottom: 2 }}>
                          base {formatMoney(shop.salaries.base)} + service charge {formatMoney(shop.salaries.serviceCharge)}
                          {shop.salaries.adjustments !== 0 && (
                            <> {shop.salaries.adjustments > 0 ? "+" : "−"} ajust. {formatMoney(shop.salaries.adjustments)}</>
                          )}
                        </div>
                      )}
                      {COST_ROWS.map((c) => (
                        <div key={c.key} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "6px 0", fontSize: 12 }}>
                          <span style={{ color: "var(--fg-3)" }}>{c.label}</span>
                          <span style={{ ...amountStyle, color: "var(--fg-3)" }}>{formatMoney(shop.costs[c.key])}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingTop: 8, marginTop: 4, borderTop: "1px solid var(--line)", fontSize: 12 }}>
                        <strong>Reste dans le coffre</strong>
                        {remaining != null ? (
                          <strong style={{ ...amountStyle }}>{formatMoney(remaining)}</strong>
                        ) : (
                          <MissingBadge label="Calcul impossible" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          {/* Final reconciliation — simple receipt */}
          <Card style={{ gap: 4, padding: "var(--s-4) var(--s-5)" }}>
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 6 }}>
              <ReceiptTextIcon size={13} />Résumé fin de mois
            </h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span>Espèces en coffre</span>
              <span style={amountStyle}>{formatMoney(totals.cash)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span>Sorties prévues</span>
              <span style={amountStyle}>−{formatMoney(totals.takeOut)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 12 }}>
              <strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em" }}>Reste en coffre</strong>
              {totals.remaining != null ? (
                <strong className="mono tabular-nums" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{formatMoney(totals.remaining)}</strong>
              ) : (
                <MissingBadge label="Calcul impossible" />
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
