"use client";

import { PillButton } from "@/components/ui/pill-button";
import type { ShopOption } from "./types";

export function ShopSingleSelect({
  options,
  value,
  onChange,
  allowAll = false,
  allLabel = "All shops",
  getLabel,
}: {
  options: ShopOption[];
  value: string;
  onChange: (id: string) => void;
  /** When true, an "All shops" pill selects `""`. */
  allowAll?: boolean;
  allLabel?: string;
  getLabel?: (option: ShopOption) => string;
}) {
  const label = (o: ShopOption) => (getLabel ? getLabel(o) : o.name);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {allowAll && (
        <PillButton active={value === ""} onClick={() => onChange("")}>
          {allLabel}
        </PillButton>
      )}
      {options.map((o) => (
        <PillButton key={o.id} active={value === o.id} onClick={() => onChange(o.id)}>
          {label(o)}
        </PillButton>
      ))}
    </div>
  );
}
