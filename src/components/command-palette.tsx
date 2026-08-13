"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HomeIcon, StarIcon, CalendarDaysIcon, ClockIcon, BanknoteIcon,
  PawPrintIcon, FileTextIcon, CalculatorIcon, TrendingUpIcon,
  UsersIcon, BookOpenIcon, PaletteIcon, ShieldIcon, SearchIcon, PlugIcon, ReceiptTextIcon, SlidersHorizontalIcon,
} from "lucide-react";
import { hasModuleAccess } from "@/core/permissions/guards";
import type { UserPermissions } from "@/core/permissions/types";

const NAV_ITEMS = [
  { id: "overview",   label: "Overview",   href: "/home",       icon: HomeIcon,         module: null },
  { id: "reviews",    label: "Reviews",    href: "/reviews",    icon: StarIcon,         module: "reviews" },
  { id: "scheduling", label: "Scheduling", href: "/scheduling", icon: CalendarDaysIcon, module: "schedules" },
  { id: "attendance", label: "Attendance", href: "/attendance", icon: ClockIcon,        module: "attendance" },
  { id: "payments",   label: "Payments",   href: "/payments",   icon: BanknoteIcon,     module: "payments" },
  { id: "employees",  label: "Employees",  href: "/employees",  icon: UsersIcon,        module: "admin" },
  { id: "animals",    label: "Animals",    href: "/animals",    icon: PawPrintIcon,     module: "animals" },
  { id: "documents",  label: "Documents",  href: "/documents",  icon: FileTextIcon,     module: "documents" },
  { id: "accounting", label: "Accounting", href: "/accounting", icon: CalculatorIcon,   module: "accounting" },
  { id: "reports",    label: "Reports",    href: "/reports",    icon: TrendingUpIcon,   module: "reports" },
  { id: "daily-profit", label: "Daily P&L", href: "/finance/daily-profit", icon: TrendingUpIcon, module: "reports" },
  { id: "recurring-costs", label: "Recurring costs", href: "/finance/recurring-costs", icon: ReceiptTextIcon, module: "reports" },
  { id: "shop-settings", label: "Shop settings", href: "/finance/shop-settings", icon: SlidersHorizontalIcon, module: "reports" },
  { id: "contacts",   label: "Contacts",   href: "/contacts",   icon: UsersIcon,        module: "contacts" },
  { id: "wiki",       label: "Wiki",       href: "/wiki",       icon: BookOpenIcon,     module: "wiki" },
  { id: "brand",      label: "Brand",      href: "/brand",      icon: PaletteIcon,      module: "brand" },
  { id: "admin",      label: "Admin",      href: "/admin",      icon: ShieldIcon,       module: "admin" },
  { id: "loyverse-sandbox", label: "Loyverse (α)", href: "/loyverse-sandbox", icon: PlugIcon, module: null },
  { id: "customer-insights", label: "Customer Insights", href: "/customer-insights", icon: UsersIcon, module: null },
] as const;

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  permissions: UserPermissions;
}

export function CommandPalette({ open, onClose, permissions }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const items = useMemo(() => {
    const nav = NAV_ITEMS
      .filter((n) => {
        if (n.id === "admin" && permissions.global_role !== "owner") return false;
        if (n.id === "loyverse-sandbox" && permissions.global_role !== "owner") return false;
        if (n.id === "customer-insights" && permissions.global_role !== "owner") return false;
        return !n.module || hasModuleAccess(permissions, n.module as Parameters<typeof hasModuleAccess>[1]);
      })
      .map((n) => ({
      kind: "nav" as const,
      id: n.id,
      label: n.label,
      hint: "Go to module",
      icon: n.icon,
      href: n.href,
    }));
    if (!query) return nav;
    const lc = query.toLowerCase();
    return nav.filter(
      (x) =>
        x.label.toLowerCase().includes(lc) ||
        x.hint.toLowerCase().includes(lc),
    );
  }, [query, permissions]);

  const choose = useCallback(
    (item: (typeof items)[number] | undefined) => {
      if (!item) return;
      onClose();
      router.push(item.href);
    },
    [router, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(items.length - 1, s + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        choose(items[selected]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, selected, choose, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center"
      style={{
        background: "rgba(43,35,27,0.32)",
        backdropFilter: "blur(2px)",
        paddingTop: "16vh",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 540,
          maxWidth: "92vw",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-2)",
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <SearchIcon size={16} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder="Jump to module, employee, shop, document…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: "var(--fg)",
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--fg-4)",
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-sm)",
              padding: "1px 5px",
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: "auto", padding: 6 }}>
          {items.length === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--fg-4)",
                fontSize: 13,
              }}
            >
              Nothing matches &ldquo;{query}&rdquo;.
            </div>
          )}
          {items.map((item, i) => {
            const active = i === selected;
            const Icon = item.icon;
            return (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => choose(item)}
                onMouseEnter={() => setSelected(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: active ? "var(--row-active)" : "transparent",
                  cursor: "pointer",
                  color: "var(--fg)",
                  border: "none",
                  outline: "none",
                }}
              >
                <Icon size={16} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{item.hint}</span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        {items.length > 0 && (
          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid var(--line-2)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 11,
              color: "var(--fg-4)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 4px" }}>↑</kbd>
              <kbd style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 4px" }}>↓</kbd>
              to navigate
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 4px" }}>↵</kbd>
              to open
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
