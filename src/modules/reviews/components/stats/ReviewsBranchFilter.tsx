"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { ShopMultiSelect } from "@/components/ui/filters/ShopMultiSelect";
import { toggleShopMulti } from "@/components/ui/filters/dates";
import type { ShopOption } from "@/components/ui/filters/types";

const PANEL_ID = "rs-branch-panel";
const TRIGGER_ID = "rs-branch-trigger";

interface Props {
  options: ShopOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  allLabel: string;
}

/**
 * Branch filter for the pilot. Desktop keeps the existing pill multiselect;
 * below 1280px it collapses to one control ("All branches" / "3 selected")
 * that opens the same pills in a small panel, so eight branches no longer
 * disappear off the edge of a phone or tablet.
 */
export function ReviewsBranchFilter({ options, selected, onChange, allLabel }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const panel = document.getElementById(PANEL_ID);
      const trigger = document.getElementById(TRIGGER_ID);
      if (panel?.contains(target) || trigger?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      document.getElementById(TRIGGER_ID)?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = selected.length === 0 ? allLabel : `${selected.length} selected`;

  return (
    <>
      <div className="rs-branch-desktop">
        <ShopMultiSelect
          options={options}
          selected={selected}
          onChange={onChange}
          allLabel={allLabel}
          className="rs-branch-pills"
          pillClassName="rs-pill"
        />
      </div>

      <div className="rs-branch-compact">
        <button
          id={TRIGGER_ID}
          type="button"
          className="rs-pill rs-branch-trigger"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={() => setOpen((value) => !value)}
        >
          <span>{label}</span>
          <ChevronDownIcon size={13} aria-hidden className="rs-branch-chevron" />
        </button>

        {open && (
          <div className="rs-branch-panel" id={PANEL_ID}>
            <div className="rs-branch-panel-list">
              <button
                type="button"
                className="rs-pill"
                aria-pressed={selected.length === 0}
                onClick={() => onChange([])}
              >
                {allLabel}
              </button>
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="rs-pill"
                  aria-pressed={selected.includes(option.id)}
                  onClick={() => onChange(toggleShopMulti(selected, option.id))}
                >
                  {option.name}
                </button>
              ))}
            </div>
            <button type="button" className="rs-branch-done" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}
