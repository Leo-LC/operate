"use client";

import { useEffect } from "react";
import { PillButton } from "@/components/ui/pill-button";
import { ShopSingleSelect } from "@/components/ui/filters";
import { FINANCE_SCOPE_STORAGE_KEY, type FinanceScope } from "@/modules/finance/scope";

export type FinanceLocationOption = { id: string; name: string };

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
    <PillButton active={value.type === "group"} onClick={() => update({ type: "group", locationId: "" })}>Global</PillButton>
    <PillButton active={value.type === "location"} onClick={() => update({ type: "location", locationId: value.locationId || locations[0]?.id || "" })}>Par shop</PillButton>
    {value.type === "location" ? <ShopSingleSelect options={locations} value={value.locationId} onChange={(locationId) => update({ ...value, locationId })} /> : null}
  </div>;
}
