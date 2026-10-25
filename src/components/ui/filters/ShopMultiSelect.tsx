"use client";

import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";
import { toggleShopMulti } from "./dates";
import type { ShopOption } from "./types";

export function ShopMultiSelect({
  options,
  selected,
  onChange,
  allLabel = "All shops",
  getLabel,
  className,
  pillClassName,
}: {
  options: ShopOption[];
  /** `[]` = all shops (unified semantics). */
  selected: string[];
  onChange: (ids: string[]) => void;
  allLabel?: string;
  getLabel?: (option: ShopOption) => string;
  /** Optional class for the wrapping row (default layout unchanged). */
  className?: string;
  /** Optional class applied to every pill (default styling unchanged). */
  pillClassName?: string;
}) {
  const label = (o: ShopOption) => (getLabel ? getLabel(o) : o.name);
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <PillButton className={pillClassName} active={selected.length === 0} onClick={() => onChange([])}>
        {allLabel}
      </PillButton>
      {options.map((o) => (
        <PillButton
          key={o.id}
          className={pillClassName}
          active={selected.includes(o.id)}
          onClick={() => onChange(toggleShopMulti(selected, o.id))}
        >
          {label(o)}
        </PillButton>
      ))}
    </div>
  );
}
