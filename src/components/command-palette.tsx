"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HomeIcon, StarIcon, CalendarDaysIcon, ClockIcon, BanknoteIcon,
  PawPrintIcon, FileTextIcon, CalculatorIcon, TrendingUpIcon,
  UsersIcon, BookOpenIcon, PaletteIcon, ShieldIcon, SearchIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "overview",   label: "Overview",   href: "/dashboard/home",       icon: HomeIcon },
  { id: "reviews",    label: "Reviews",    href: "/dashboard/reviews",    icon: StarIcon },
  { id: "scheduling", label: "Scheduling", href: "/dashboard/scheduling", icon: CalendarDaysIcon },
  { id: "attendance", label: "Attendance", href: "/dashboard/attendance", icon: ClockIcon },
  { id: "payments",   label: "Payments",   href: "/dashboard/payments",   icon: BanknoteIcon },
  { id: "animals",    label: "Animals",    href: "/dashboard/animals",    icon: PawPrintIcon },
  { id: "documents",  label: "Documents",  href: "/dashboard/documents",  icon: FileTextIcon },
  { id: "accounting", label: "Accounting", href: "/dashboard/accounting", icon: CalculatorIcon },
  { id: "reports",    label: "Reports",    href: "/dashboard/reports",    icon: TrendingUpIcon },
  { id: "contacts",   label: "Contacts",   href: "/dashboard/contacts",   icon: UsersIcon },
  { id: "wiki",       label: "Wiki",       href: "/dashboard/wiki",       icon: BookOpenIcon },
  { id: "brand",      label: "Brand",      href: "/brand-guidelines",     icon: PaletteIcon },
  { id: "admin",      label: "Admin",      href: "/dashboard/admin",      icon: ShieldIcon },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
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
    const nav = NAV_ITEMS.map((n) => ({
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
  }, [query]);

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
