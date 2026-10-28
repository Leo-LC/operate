"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PillButton } from "@/components/ui/pill-button";
import { ChevronDownIcon } from "lucide-react";
import type { ShopOption } from "./types";

/**
 * Single-shop filter as pills (unchanged desktop behaviour).
 *
 * `compactMobile` opt-in: below 768px the pills collapse behind one
 * accessible disclosure button (current selection + aria-expanded), mirroring
 * the same control shape as Customer Insights' shared pattern, so every
 * module uses one component instead of per-module variants.
 */
export function ShopSingleSelect({
  options,
  value,
  onChange,
  allowAll = false,
  allLabel = "All shops",
  getLabel,
  compactMobile = false,
}: {
  options: ShopOption[];
  value: string;
  onChange: (id: string) => void;
  /** When true, an "All shops" pill selects `""`. */
  allowAll?: boolean;
  allLabel?: string;
  getLabel?: (option: ShopOption) => string;
  /** Collapse to a disclosure below 768px (opt-in per consumer). */
  compactMobile?: boolean;
}) {
  const label = (o: ShopOption) => (getLabel ? getLabel(o) : o.name);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the collapsed panel's pills mounted for keyboard flow while the
  // disclosure stays one tab stop when closed (hidden pills not focusable).
  const [hydrated, setHydrated] = useState(false);
  useLayoutEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!compactMobile) {
      setCompact(false);
      return;
    }
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [compactMobile]);

  const pills = (
    <>
      {allowAll && (
        <PillButton active={value === ""} onClick={() => { onChange(""); setOpen(false); }}>
          {allLabel}
        </PillButton>
      )}
      {options.map((o) => {
        const active = o.id === value;
        return (
          <PillButton key={o.id} active={active} onClick={() => { onChange(o.id); setOpen(false); }}>
            {label(o)}
          </PillButton>
        );
      })}
    </>
  );

  if (!compactMobile || !compact || !hydrated) {
    return (
      <div ref={rootRef} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {pills}
      </div>
    );
  }

  const current = value === ""
    ? allLabel
    : label(options.find((o) => o.id === value) ?? { id: value, name: value });

  return (
    <div ref={rootRef} className="shop-compact">
      <button
        type="button"
        className="shop-compact-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="shop-compact-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{current}</span>
        <ChevronDownIcon size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 140ms" }} />
      </button>
      {open && (
        <div id="shop-compact-panel" role="group" aria-label="Shop filter" className="shop-compact-panel">
          {pills}
        </div>
      )}
    </div>
  );
}
