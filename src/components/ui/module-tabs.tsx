"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ModuleTab {
  label: string;
  href: string;
}

/**
 * Single app-wide tab style (underline variant).
 * Matches the Direction module pattern: text tabs over a 1px line,
 * active tab marked with a 2px accent underline. No pill/box styling.
 */
export function ModuleTabs({ tabs, ariaLabel }: { tabs: readonly ModuleTab[]; ariaLabel?: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={ariaLabel}
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--line)",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            style={{
              padding: "8px 12px 10px",
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? "var(--fg)" : "var(--fg-4)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
              transition: "color 150ms, border-color 150ms",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = "var(--fg-2)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = "var(--fg-4)";
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
