"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiVisibility, VisibilityEye } from "@/components/visibility";

export interface ModuleTab {
  label: string;
  href: string;
  icon?: React.ElementType;
  /** Extra control rendered next to the label (e.g. eye toggle). */
  extra?: React.ReactNode;
  /** Rendered muted (e.g. hidden for the target audience but visible to privileged users). */
  dimmed?: boolean;
  /**
   * Unified visibility key (`tab:<module>.<tab>`): masked tabs disappear for
   * member/reviewer/direction/staff and render dimmed with an eye for owner/admin.
   * Only the owner gets the eye toggle (via the shared visibility context).
   */
  visibilityKey?: string;
}

export interface ControlledTab {
  value: string;
  label: string;
  icon?: React.ElementType;
  /** Extra control rendered next to the label (e.g. eye toggle). */
  extra?: React.ReactNode;
  /** Rendered muted (e.g. hidden for the target audience but visible to privileged users). */
  dimmed?: boolean;
  /** Same unified visibility gating as ModuleTab.visibilityKey. */
  visibilityKey?: string;
}

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
      className="ui-tabnav-indicator"
      style={{ left, width, opacity: visible ? 1 : 0 }}
    />
  );
}

/**
 * Module navigation: real sibling routes as text tabs over a 1px line, with a
 * 2px accent underline that slides when switching tabs. Masked tabs
 * (owner eye) are hidden for everyone, dimmed for owner/admin.
 */
export function ModuleTabs({ tabs, ariaLabel }: { tabs: readonly ModuleTab[]; ariaLabel?: string }) {
  const { isVisible, canSeeHidden, canToggle, toggle } = useUiVisibility();
  const pathname = usePathname();
  const shown = tabs.filter((t) => !t.visibilityKey || canSeeHidden || isVisible(t.visibilityKey));
  const activeIndex = Math.max(
    0,
    shown.findIndex((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
  );
  const { containerRef, setTabRef, indicator } = useSlidingUnderline(activeIndex, shown.length);

  return (
    <nav aria-label={ariaLabel} className="ui-tabnav">
      <div ref={containerRef} style={{ display: "flex", gap: 0, position: "relative" }}>
        {shown.map((tab, i) => {
          const active = i === activeIndex;
          const Icon = tab.icon;
          const masked = !!tab.visibilityKey && !isVisible(tab.visibilityKey);
          return (
            <div
              key={tab.href}
              className="ui-tabnav-item"
              data-dimmed={tab.dimmed || masked ? "true" : undefined}
            >
              <Link
                ref={setTabRef(i) as React.Ref<HTMLAnchorElement>}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="ui-tabnav-link"
                data-active={active ? "true" : undefined}
              >
                {Icon ? <Icon size={14} /> : null}
                {tab.label}
              </Link>
              {tab.visibilityKey && canToggle ? (
                <VisibilityEye
                  visible={!masked}
                  label={tab.label}
                  onToggle={() => toggle(tab.visibilityKey!)}
                />
              ) : (
                tab.extra
              )}
            </div>
          );
        })}
        <Indicator {...indicator} />
      </div>
    </nav>
  );
}

/**
 * State-driven tab bars (no route change). `underline` matches ModuleTabs for
 * module-level views; `segmented` is the compact switch for small view
 * toggles (Table/Detail, Animals/Vaccines, Daily Entry/Fixed Costs…).
 * Masked tabs (owner eye) are hidden for everyone, dimmed for owner/admin.
 */
export function ControlledTabs({
  tabs,
  value,
  onChange,
  ariaLabel,
  variant = "underline",
}: {
  tabs: readonly ControlledTab[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  variant?: "underline" | "segmented";
}) {
  const { isVisible, canSeeHidden, canToggle, toggle } = useUiVisibility();
  // Masked tabs (owner eye): hidden for everyone, dimmed for owner/admin.
  const shown = tabs.filter((t) => !t.visibilityKey || canSeeHidden || isVisible(t.visibilityKey));
  const activeIndex = Math.max(
    0,
    shown.findIndex((t) => t.value === value)
  );
  // The underline indicator hook must run on every render, before the
  // segmented early return.
  const { containerRef, setTabRef, indicator } = useSlidingUnderline(activeIndex, shown.length);

  if (variant === "segmented") {
    return (
      <div aria-label={ariaLabel} role="tablist" className="ui-segmented">
        {shown.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = i === activeIndex;
          const masked = !!tab.visibilityKey && !isVisible(tab.visibilityKey);
          return (
            <div
              key={tab.value}
              className="ui-segmented-itemwrap"
              data-dimmed={tab.dimmed || masked ? "true" : undefined}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.value)}
                className="ui-segmented-item"
                data-active={isActive ? "true" : undefined}
                title={tab.label}
              >
                {Icon ? <Icon size={14} /> : null}
                {tab.label}
              </button>
              {tab.visibilityKey && canToggle ? (
                <VisibilityEye
                  visible={!masked}
                  label={tab.label}
                  onToggle={() => toggle(tab.visibilityKey!)}
                />
              ) : (
                tab.extra
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div aria-label={ariaLabel} role="tablist" className="ui-tabnav">
      <div ref={containerRef} style={{ display: "flex", gap: 0, position: "relative" }}>
        {shown.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = i === activeIndex;
          const masked = !!tab.visibilityKey && !isVisible(tab.visibilityKey);
          return (
            <div
              key={tab.value}
              className="ui-tabnav-item"
              data-dimmed={tab.dimmed || masked ? "true" : undefined}
            >
              <button
                ref={setTabRef(i) as React.Ref<HTMLButtonElement>}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.value)}
                className="ui-tabnav-link"
                data-active={isActive ? "true" : undefined}
                title={tab.label}
              >
                {Icon ? <Icon size={14} /> : null}
                {tab.label}
              </button>
              {tab.visibilityKey && canToggle ? (
                <VisibilityEye
                  visible={!masked}
                  label={tab.label}
                  onToggle={() => toggle(tab.visibilityKey!)}
                />
              ) : (
                tab.extra
              )}
            </div>
          );
        })}
        <Indicator {...indicator} />
      </div>
    </div>
  );
}
