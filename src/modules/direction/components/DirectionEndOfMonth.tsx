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
  type EndOfMonthCategory,
  type EndOfMonthShopSafe,
  type EndOfMonthTotals,
} from "@/modules/direction/lib/endOfMonth";

interface EndOfMonthData {
  month: string;
  safes: EndOfMonthShopSafe[];
  categories: EndOfMonthCategory[];
  totals: EndOfMonthTotals;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px solid var(--line)",
  fontSize: 13,
};
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

  function toggleCategory(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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

          {/* Cash by shop — no total row: each shop is independent */}
          <Card style={{ gap: 4, padding: "var(--s-4) var(--s-5)" }}>
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)" }}>
              Espèces en coffre
            </h3>
            {data.safes.map((s, i) => (
              <div key={s.locationId} style={{ ...rowStyle, borderBottom: i === data.safes.length - 1 ? "none" : rowStyle.borderBottom }}>
                <span style={{ fontWeight: 500 }}>{shortShopName(s.name)}</span>
                {s.missing || s.amount == null ? (
                  <MissingBadge label="Montant manquant" />
                ) : (
                  <span style={amountStyle}>{formatMoney(s.amount)}</span>
                )}
              </div>
            ))}
          </Card>

          {/* Money to take out — expandable categories, collapsed by default */}
          <Card style={{ gap: 4, padding: "var(--s-4) var(--s-5)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)" }}>
                Sorties prévues
              </h3>
              <strong className="mono tabular-nums" style={{ fontSize: 18 }}>{formatMoney(totals.takeOut)}</strong>
            </div>
            {data.categories.map((c) => {
              const isOpen = expanded.has(c.key);
              return (
                <div key={c.key} style={{ borderBottom: "1px solid var(--line)" }}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(c.key)}
                    aria-expanded={isOpen}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "10px 0", border: "none", background: "none", cursor: "pointer",
                      fontSize: 13, color: "var(--fg)", textAlign: "left",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{c.label}</span>
                    {c.finalized && (
                      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
                        {c.paymentCount} versement{c.paymentCount > 1 ? "s" : ""}
                      </span>
                    )}
                    <span style={{ flex: 1 }} />
                    {!c.finalized || c.total == null ? (
                      <MissingBadge label="Non finalisé" />
                    ) : (
                      <span style={amountStyle}>{formatMoney(c.total)}</span>
                    )}
                    <ChevronDownIcon
                      size={14}
                      style={{ color: "var(--fg-4)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform var(--dur) var(--ease)" }}
                    />
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 0 12px 0" }}>
                      {!c.finalized && (
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--warn)" }}>
                          Montants prévisionnels — à faire valider avant de les compter dans les sorties.
                        </p>
                      )}
                      {c.lines.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 12, color: "var(--fg-4)" }}>Aucun détail pour ce mois</p>
                      ) : (
                        c.lines.map((l) => (
                          <div key={l.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "6px 0", fontSize: 12 }}>
                            <span style={{ color: "var(--fg-3)" }}>
                              {l.label}
                              {l.finalized === false && <span style={{ color: "var(--warn)", marginLeft: 6 }}>· non finalisé</span>}
                            </span>
                            <span style={{ ...amountStyle, color: "var(--fg-3)" }}>{formatMoney(l.amount)}</span>
                          </div>
                        ))
                      )}
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
            <div style={{ ...rowStyle }}>
              <span>Espèces en coffre</span>
              <span style={amountStyle}>{formatMoney(totals.cash)}</span>
            </div>
            <div style={{ ...rowStyle }}>
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
