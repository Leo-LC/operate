"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ModuleTab {
  label: string;
  href: string;
  icon?: React.ElementType;
}

export interface ControlledTab {
  value: string;
  label: string;
  icon?: React.ElementType;
  /** Extra control rendered next to the label (e.g. eye toggle). */
  extra?: React.ReactNode;
  /** Rendered muted (e.g. hidden for the target audience but visible to privileged users). */
  dimmed?: boolean;
}

const BAR_STYLE: React.CSSProperties = {
  position: "relative",
  display: "flex",
  gap: 0,
  borderBottom: "1px solid var(--line)",
  overflowX: "auto",
  scrollbarWidth: "none",
};

const TAB_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "0 var(--s-3)",
  height: 36,
  fontSize: 13,
  fontWeight: 500,
  border: "none",
  background: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  textDecoration: "none",
};

function useSlidingUnderline(activeIndex: number, tabCount: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });

  const measure = useCallback(() => {
    const el = tabRefs.current[activeIndex];
    if (!el) {
      setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }
    const left = el.offsetLeft;
    const width = el.offsetWidth;
    setIndicator((prev) =>
      prev.left === left && prev.width === width && prev.visible
        ? prev
        : { left, width, visible: true }
    );
  }, [activeIndex]);

  useLayoutEffect(() => {
    measure();
  }, [measure, tabCount]);

  useLayoutEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const setTabRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      tabRefs.current[index] = el;
    },
    []
  );

  return { containerRef, setTabRef, indicator };
}

function Indicator({ left, width, visible }: { left: number; width: number; visible: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        bottom: -1,
        left,
        width,
        height: 2,
        background: "var(--accent)",
        borderRadius: 2,
        opacity: visible ? 1 : 0,
        transition: "left 240ms var(--ease), width 240ms var(--ease), opacity 200ms var(--ease)",
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * Single app-wide tab style (underline variant).
 * Matches the Direction module pattern: text tabs over a 1px line,
 * active tab marked with a 2px accent underline that slides when switching tabs.
 */
export function ModuleTabs({ tabs, ariaLabel }: { tabs: readonly ModuleTab[]; ariaLabel?: string }) {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
  );
  const { containerRef, setTabRef, indicator } = useSlidingUnderline(activeIndex, tabs.length);

  return (
    <nav aria-label={ariaLabel} style={BAR_STYLE}>
      <div ref={containerRef} style={{ display: "flex", gap: 0, position: "relative" }}>
        {tabs.map((tab, i) => {
          const active = i === activeIndex;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              ref={setTabRef(i) as React.Ref<HTMLAnchorElement>}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              style={{
                ...TAB_STYLE,
                fontWeight: active ? 600 : 500,
                color: active ? "var(--fg)" : "var(--fg-4)",
                transition: "color 150ms",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = "var(--fg-2)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = "var(--fg-4)";
              }}
            >
              {Icon ? <Icon size={14} /> : null}
              {tab.label}
            </Link>
          );
        })}
        <Indicator {...indicator} />
      </div>
    </nav>
  );
}

/**
 * Same underline style for state-driven tab bars (no route change).
 * Used by Direction, Reports, Shift & Sales, Directory, …
 */
export function ControlledTabs({
  tabs,
  value,
  onChange,
  ariaLabel,
}: {
  tabs: readonly ControlledTab[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.value === value)
  );
  const { containerRef, setTabRef, indicator } = useSlidingUnderline(activeIndex, tabs.length);

  return (
    <div aria-label={ariaLabel} role="tablist" style={BAR_STYLE}>
      <div ref={containerRef} style={{ display: "flex", gap: 0, position: "relative" }}>
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = i === activeIndex;
          return (
            <div
              key={tab.value}
              style={{
                display: "inline-flex",
                alignItems: "center",
                opacity: tab.dimmed ? 0.55 : 1,
              }}
            >
              <button
                ref={setTabRef(i) as React.Ref<HTMLButtonElement>}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.value)}
                style={{
                  ...TAB_STYLE,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--fg)" : "var(--fg-4)",
                  transition: "color 150ms",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "var(--fg-2)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "var(--fg-4)";
                }}
                title={tab.label}
              >
                {Icon ? <Icon size={14} /> : null}
                {tab.label}
              </button>
              {tab.extra}
            </div>
          );
        })}
        <Indicator {...indicator} />
      </div>
    </div>
  );
}
