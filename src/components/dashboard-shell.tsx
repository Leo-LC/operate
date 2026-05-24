"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  HomeIcon, StarIcon, CalendarDaysIcon, ClockIcon, BanknoteIcon,
  PawPrintIcon, FileTextIcon, CalculatorIcon, TrendingUpIcon,
  UsersIcon, BookOpenIcon, PaletteIcon, ShieldIcon, SearchIcon,
  SunIcon, MoonIcon, LogOutIcon,
} from "lucide-react";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { CommandPalette } from "@/components/command-palette";
import { ShortcutsOverlay } from "@/components/shortcuts-overlay";

interface DashboardShellProps {
  email: string;
  role?: "owner" | "staff";
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { id: "overview",   label: "Overview",   href: "/dashboard/home",       icon: HomeIcon,         module: null },
  { id: "reviews",    label: "Reviews",    href: "/dashboard/reviews",    icon: StarIcon,         module: "reviews" },
  { id: "scheduling", label: "Scheduling", href: "/dashboard/scheduling", icon: CalendarDaysIcon, module: "schedules" },
  { id: "attendance", label: "Attendance", href: "/dashboard/attendance", icon: ClockIcon,        module: "attendance" },
  { id: "payments",   label: "Payments",   href: "/dashboard/payments",   icon: BanknoteIcon,     module: "payments" },
  { id: "animals",    label: "Animals",    href: "/dashboard/animals",    icon: PawPrintIcon,     module: "animals" },
  { id: "documents",  label: "Documents",  href: "/dashboard/documents",  icon: FileTextIcon,     module: "documents" },
  { id: "accounting", label: "Accounting", href: "/dashboard/accounting", icon: CalculatorIcon,   module: "accounting" },
  { id: "reports",    label: "Reports",    href: "/dashboard/reports",    icon: TrendingUpIcon,   module: "reports" },
  { id: "contacts",   label: "Contacts",   href: "/dashboard/contacts",   icon: UsersIcon,        module: "contacts" },
  { id: "wiki",       label: "Wiki",       href: "/dashboard/wiki",       icon: BookOpenIcon,     module: "wiki" },
  { id: "brand",      label: "Brand",      href: "/brand-guidelines",     icon: PaletteIcon,      module: null },
  { id: "admin",      label: "Admin",      href: "/dashboard/admin",      icon: ShieldIcon,       module: "admin" },
] as const;

/* Deterministic avatar colour from initials */
const AVATAR_HUES = [24, 38, 185, 145, 260, 310];
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return `hsl(${AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length]}, 55%, 52%)`;
}

function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function DashboardShell({ email, role, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const permissions = derivePermissionsFromRole(role);

  const [cmdOpen, setCmdOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── Global keyboard shortcuts ── */
  const gKeyRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      /* ⌘K / Ctrl+K */
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
        return;
      }

      if (inInput) return;

      /* ? → shortcuts overlay */
      if (e.key === "?" && !e.shiftKey) {
        setShortcutsOpen((v) => !v);
        return;
      }

      /* T → toggle theme */
      if (e.key === "t" || e.key === "T") {
        setTheme(theme === "dark" ? "light" : "dark");
        return;
      }

      /* g+letter navigation */
      if (e.key === "g") {
        gKeyRef.current = true;
        setTimeout(() => { gKeyRef.current = false; }, 1000);
        return;
      }

      if (gKeyRef.current) {
        const map: Record<string, string> = {
          o: "/dashboard/home",
          r: "/dashboard/reviews",
          s: "/dashboard/scheduling",
          a: "/dashboard/attendance",
          p: "/dashboard/payments",
          n: "/dashboard/animals",
          d: "/dashboard/documents",
          c: "/dashboard/accounting",
          e: "/dashboard/reports",
          t: "/dashboard/contacts",
          w: "/dashboard/wiki",
          b: "/brand-guidelines",
          m: "/dashboard/admin",
        };
        const dest = map[e.key.toLowerCase()];
        if (dest) {
          gKeyRef.current = false;
          router.push(dest);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [theme, setTheme, router]);

  function isActive(href: string): boolean {
    if (href === "/dashboard/home") return pathname === "/dashboard/home" || pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const displayName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--fg)",
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: "var(--sidebar-w)",
          flexShrink: 0,
          borderRight: "1px solid var(--line)",
          background: "var(--surface-2)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 40,
        }}
      >
        {/* Brand header — same height as topbar so they align */}
        <div
          style={{
            height: "var(--topbar-h)",
            display: "flex",
            alignItems: "center",
            padding: "0 var(--s-5)",
            borderBottom: "1px solid var(--line)",
            flexShrink: 0,
          }}
        >
          <Link
            href="/dashboard/home"
            style={{ display: "flex", alignItems: "baseline", gap: 6, textDecoration: "none" }}
          >
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--fg)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Operate
            </span>
            <span style={{ fontSize: 11, color: "var(--fg-4)" }}>v2.6</span>
          </Link>
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: "var(--s-3)",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            overflowY: "auto",
          }}
        >
          {NAV_ITEMS.map((item) => {
            if (item.module && !hasModuleAccess(permissions, item.module as Parameters<typeof hasModuleAccess>[1])) {
              return null;
            }
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--fg)" : "var(--fg-3)",
                  background: active ? "var(--surface)" : "transparent",
                  border: `1px solid ${active ? "var(--line)" : "transparent"}`,
                  textDecoration: "none",
                  transition: "background var(--dur) var(--ease)",
                }}
                className="hover:!bg-[var(--row-hover)] hover:!text-[var(--fg-2)] active:!bg-[var(--row-active)]"
              >
                <Icon
                  size={16}
                  style={{
                    color: active ? "var(--bronze)" : "var(--fg-3)",
                    flexShrink: 0,
                    strokeWidth: 1.5,
                  }}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div
          style={{
            padding: "var(--s-3) var(--s-4)",
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--r-pill)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: "#fff",
              background: avatarColor(email),
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            {initials(displayName || email)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--fg)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </span>
            <span style={{ fontSize: 11, color: "var(--fg-4)", textTransform: "capitalize" }}>
              {role ?? "Staff"}
            </span>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--r-sm)",
              color: "var(--fg-4)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color var(--dur) var(--ease), background var(--dur) var(--ease)",
              flexShrink: 0,
            }}
            className="hover:!bg-[var(--row-hover)] hover:!text-[var(--fg-2)]"
          >
            <LogOutIcon size={15} strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      {/* ── Right column ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <header
          style={{
            height: "var(--topbar-h)",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg)",
            padding: "0 var(--s-5)",
            display: "flex",
            alignItems: "center",
            gap: "var(--s-3)",
            position: "sticky",
            top: 0,
            zIndex: 30,
            flexShrink: 0,
          }}
        >
          {/* ⌘K search trigger */}
          <button
            onClick={() => setCmdOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 34,
              padding: "0 12px",
              minWidth: 260,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              fontSize: 13,
              color: "var(--fg-4)",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color var(--dur) var(--ease)",
            }}
            className="hover:!border-[var(--line-strong)]"
          >
            <SearchIcon size={15} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Jump to module, employee, document…</span>
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
              ⌘K
            </kbd>
          </button>

          <div style={{ flex: 1 }} />

          {/* Shortcuts hint */}
          <button
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts"
            style={{
              width: 34,
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--r-md)",
              color: "var(--fg-3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background var(--dur) var(--ease)",
            }}
            className="hover:!bg-[var(--row-hover)]"
          >
            <kbd
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                color: "var(--fg-3)",
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)",
                padding: "2px 7px",
                cursor: "pointer",
              }}
            >
              ?
            </kbd>
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode (T)`}
            style={{
              width: 34,
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--r-md)",
              color: "var(--fg-3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)",
            }}
            className="hover:!bg-[var(--row-hover)] hover:!text-[var(--fg)]"
          >
            {mounted ? (
              theme === "dark" ? (
                <SunIcon size={16} strokeWidth={1.5} />
              ) : (
                <MoonIcon size={16} strokeWidth={1.5} />
              )
            ) : (
              <MoonIcon size={16} strokeWidth={1.5} />
            )}
          </button>
        </header>

        {/* Module content */}
        <main
          style={{
            flex: 1,
            padding: "var(--s-5) var(--s-6) var(--s-7)",
            maxWidth: "var(--content-max)",
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      </div>

      {/* ── Overlays ── */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
