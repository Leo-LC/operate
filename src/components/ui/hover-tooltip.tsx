"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight hover tooltip in the Operate design language.
 * CSS-only (group-hover + focus-within), no positioning engine:
 * the bubble appears above the trigger, centered. For edge cases
 * prefer `align="left" | "right"` to keep it inside the card.
 */
export function HoverTooltip({
  content,
  align = "center",
  children,
  className,
}: {
  content: React.ReactNode;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group/tip relative inline-flex min-w-0", className)}>
      <span className="inline-flex min-w-0 cursor-default" tabIndex={0}>
        {children}
      </span>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full z-40 mb-1.5 w-max max-w-[15rem] whitespace-normal rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-left text-xs leading-snug text-[var(--fg-2)] opacity-0 shadow-lg transition-opacity duration-100 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "left" && "left-0",
          align === "right" && "right-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
