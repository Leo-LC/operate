"use client";

import { PillButton } from "@/components/ui/pill-button";
import { toggleShopMulti } from "./dates";
import type { ShopOption } from "./types";

export function ShopMultiSelect({
  options,
  selected,
  onChange,
  allLabel = "All shops",
  getLabel,
}: {
  options: ShopOption[];
  /** `[]` = all shops (unified semantics). */
  selected: string[];
  onChange: (ids: string[]) => void;
  allLabel?: string;
  getLabel?: (option: ShopOption) => string;
}) {
  const label = (o: ShopOption) => (getLabel ? getLabel(o) : o.name);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <PillButton active={selected.length === 0} onClick={() => onChange([])}>
        {allLabel}
      </PillButton>
      {options.map((o) => (
        <PillButton key={o.id} active={selected.includes(o.id)} onClick={() => onChange(toggleShopMulti(selected, o.id))}>
          {label(o)}
        </PillButton>
      ))}
    </div>
  );
}
