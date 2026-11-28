"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { ShopSingleSelect } from "@/components/ui/filters";

interface ShopFilterProps {
  options: string[];
  /** Canonical shop name, or `"all"`. */
  value: string;
  onChange: (shop: string) => void;
}

/**
 * Shop scope for Customer Insights. Desktop keeps the full pill row; below
 * 768px it collapses to one trigger ("All shops" / "Phangan") that opens the
 * same pills, matching the Reviews Stats branch control. Selection behaviour is
 * unchanged — both paths write through the same `onChange`.
 */
export function ShopFilter({ options, value, onChange }: ShopFilterProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        document.getElementById(panelId)?.contains(target) ||
        document.getElementById(triggerId)?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      document.getElementById(triggerId)?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, panelId, triggerId]);

  const label = value === "all" ? "All shops" : value;

  const pills = (
    <ShopSingleSelect
      options={options.map((name) => ({ id: name, name }))}
      value={value === "all" ? "" : value}
      onChange={(id) => onChange(id === "" ? "all" : id)}
      allowAll
    />
  );

  return (
    <>
      <div className="ci-shop-pills">{pills}</div>

      <div className="ci-shop-compact">
        <button
          id={triggerId}
          type="button"
          className="ci-shop-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="ci-shop-trigger-label">{label}</span>
          <ChevronDownIcon size={14} aria-hidden className="ci-shop-chevron" />
        </button>

        {open && (
          <div className="ci-shop-panel" id={panelId} role="group" aria-label="Shop">
            <div className="ci-pill-row">{pills}</div>
            <button type="button" className="ci-shop-done" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}
