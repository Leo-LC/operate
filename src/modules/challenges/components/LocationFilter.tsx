"use client";

import { ShopSingleSelect } from "@/components/ui/filters";
import { LOCATION_NAMES } from "@/lib/constants";

interface LocationFilterProps {
  value: string; // location_id or "all"
  onChange: (value: string) => void;
}

const OPTIONS = Object.entries(LOCATION_NAMES).map(([id, name]) => ({ id, name }));

export function LocationFilter({ value, onChange }: LocationFilterProps) {
  return (
    <ShopSingleSelect
      options={OPTIONS}
      value={value === "all" ? "" : value}
      onChange={(id) => onChange(id === "" ? "all" : id)}
      allowAll
      allLabel="All locations"
    />
  );
}
