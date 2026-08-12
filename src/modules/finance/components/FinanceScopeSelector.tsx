"use client";

import { useEffect } from "react";
import { FINANCE_SCOPE_STORAGE_KEY, type FinanceScope } from "@/modules/finance/scope";

export type FinanceLocationOption = { id: string; name: string };

const style: React.CSSProperties = { height: 34, padding: "0 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", background: "var(--bg)", color: "var(--fg)", fontSize: 12 };

export function FinanceScopeSelector({ value, locations, onChange }: { value: FinanceScope; locations: FinanceLocationOption[]; onChange: (scope: FinanceScope) => void }) {
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(FINANCE_SCOPE_STORAGE_KEY) ?? "null") as FinanceScope | null;
      if (stored?.type === "group" || stored?.type === "location") onChange(stored);
    } catch { /* Ignore invalid legacy browser state. */ }
  // Hydrate once; onChange is intentionally not a dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(next: FinanceScope) {
    localStorage.setItem(FINANCE_SCOPE_STORAGE_KEY, JSON.stringify(next));
    onChange(next);
  }

  return <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
    <select aria-label="Finance scope" value={value.type} onChange={(event) => update({ type: event.target.value as FinanceScope["type"], locationId: event.target.value === "group" ? "" : value.locationId || locations[0]?.id || "" })} style={style}>
      <option value="group">Global</option>
      <option value="location">Par shop</option>
    </select>
    {value.type === "location" ? <select aria-label="Shop" value={value.locationId} onChange={(event) => update({ ...value, locationId: event.target.value })} style={{ ...style, minWidth: 170 }}>
      <option value="">Select a shop…</option>
      {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
    </select> : null}
  </div>;
}
