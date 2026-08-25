"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ALL_TABS = [
  { label: "Users", href: "/admin/users", ownerOnly: false },
  { label: "Locations", href: "/admin/locations", ownerOnly: false },
  { label: "Audit Logs", href: "/admin/audit-logs", ownerOnly: false },
  { label: "Appearance", href: "/admin/appearance", ownerOnly: true },
  { label: "Automations", href: "/admin/automations", ownerOnly: true },
] as const;

export function AdminTabNav({ isOwner = true }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const TABS = ALL_TABS.filter((t) => isOwner || !t.ownerOnly);

  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", marginBottom: 24 }}>
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              position: "relative",
              padding: "8px 12px 10px",
              fontSize: 13,
              fontWeight: 500,
              color: active ? "var(--fg)" : "var(--fg-4)",
              textDecoration: "none",
              borderBottom: active ? "2px solid var(--bronze)" : "2px solid transparent",
              marginBottom: -1,
              transition: "color 150ms, border-color 150ms",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
