"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Employees", href: "/dashboard/admin/employees" },
  { label: "Locations", href: "/dashboard/admin/locations" },
  { label: "Audit Logs", href: "/dashboard/admin/audit-logs" },
  { label: "HR Settings", href: "/dashboard/admin/hr-settings" },
  { label: "Appearance", href: "/dashboard/admin/appearance" },
];

export function AdminTabNav() {
  const pathname = usePathname();

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
