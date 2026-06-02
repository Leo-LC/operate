"use client";
import { LOCATION_NAMES } from "@/lib/constants";

interface LocationFilterProps {
  value: string; // location_id or "all"
  onChange: (value: string) => void;
}

const LOCATIONS = Object.entries(LOCATION_NAMES).map(([id, name]) => ({ id, name }));

export function LocationFilter({ value, onChange }: LocationFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2 pr-7 text-sm text-[var(--fg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--bronze)] focus:ring-offset-0 hover:border-[var(--fg-4)]"
    >
      <option value="all">All locations</option>
      {LOCATIONS.map(({ id, name }) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
}
