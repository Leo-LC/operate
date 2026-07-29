"use client";
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import type { TaxArticle, TaxAudience, TaxCadence } from "../types";
import { useWikiLang } from "./LanguageProvider";

type ImpactTag = "cashflow" | "legal-risk" | "payroll" | "tax-return" | "payment-required";

interface FilterState {
  cadence: Set<TaxCadence>;
  audience: Set<TaxAudience>;
  impact: Set<ImpactTag>;
}

interface FilterContextValue {
  state: FilterState;
  toggle: (kind: keyof FilterState, value: string) => void;
  clear: () => void;
  matches: (article: TaxArticle) => boolean;
  active: boolean;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const EMPTY_STATE: FilterState = { cadence: new Set(), audience: new Set(), impact: new Set() };

export function WikiFilterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FilterState>(EMPTY_STATE);

  const toggle = (kind: keyof FilterState, value: string) => {
    setState((prev) => {
      const next = new Set(prev[kind] as Set<string>);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [kind]: next } as FilterState;
    });
  };

  const clear = () => setState(EMPTY_STATE);

  const matches = useCallback((article: TaxArticle) => {
    if (state.cadence.size > 0 && !state.cadence.has(article.cadence)) return false;
    if (state.audience.size > 0 && !article.audience.some((a) => state.audience.has(a))) return false;
    if (state.impact.size > 0 && !article.tags.some((tag) => state.impact.has(tag as ImpactTag))) return false;
    return true;
  }, [state]);

  const active = state.cadence.size > 0 || state.audience.size > 0 || state.impact.size > 0;

  const value = useMemo(() => ({ state, toggle, clear, matches, active }), [state, active, matches]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useWikiFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    return { state: EMPTY_STATE, toggle: () => {}, clear: () => {}, matches: () => true, active: false };
  }
  return ctx;
}

const CADENCE_OPTIONS: { value: TaxCadence; label: Record<"fr" | "en", string> }[] = [
  { value: "monthly", label: { fr: "Mensuel", en: "Monthly" } },
  { value: "quarterly", label: { fr: "Trimestriel", en: "Quarterly" } },
  { value: "half-year", label: { fr: "Semestriel", en: "Half-year" } },
  { value: "annual", label: { fr: "Annuel", en: "Annual" } },
];

const AUDIENCE_OPTIONS: { value: TaxAudience; label: Record<"fr" | "en", string> }[] = [
  { value: "owner", label: { fr: "Pour les dirigeants", en: "For owners" } },
  { value: "accounting", label: { fr: "Pour la compta", en: "For accounting" } },
  { value: "manager", label: { fr: "Pour les managers", en: "For managers" } },
  { value: "hr", label: { fr: "RH", en: "HR" } },
];

const IMPACT_OPTIONS: { value: ImpactTag; label: Record<"fr" | "en", string> }[] = [
  { value: "cashflow", label: { fr: "Impact cashflow", en: "Cashflow impact" } },
  { value: "legal-risk", label: { fr: "Risque légal", en: "Legal risk" } },
];

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: "var(--r-pill)",
        border: `1px solid ${active ? "var(--bronze)" : "var(--line)"}`,
        background: active ? "var(--bronze-soft)" : "var(--surface)",
        color: active ? "var(--bronze)" : "var(--fg-3)",
        padding: "5px 10px",
        fontSize: 10.5,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function ArticleFilters() {
  const { t } = useWikiLang();
  const { state, toggle, clear, active } = useWikiFilters();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="eyebrow" style={{ color: "var(--bronze)" }}>{t({ fr: "Filtres rapides", en: "Quick filters" })}</p>
        {active && (
          <button type="button" onClick={clear} style={{ fontSize: 10, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer" }}>
            {t({ fr: "Réinitialiser", en: "Reset" })}
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CADENCE_OPTIONS.map((opt) => (
          <FilterChip key={opt.value} label={t(opt.label)} active={state.cadence.has(opt.value)} onClick={() => toggle("cadence", opt.value)} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {AUDIENCE_OPTIONS.map((opt) => (
          <FilterChip key={opt.value} label={t(opt.label)} active={state.audience.has(opt.value)} onClick={() => toggle("audience", opt.value)} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {IMPACT_OPTIONS.map((opt) => (
          <FilterChip key={opt.value} label={t(opt.label)} active={state.impact.has(opt.value)} onClick={() => toggle("impact", opt.value)} />
        ))}
      </div>
    </div>
  );
}
