"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Employees", href: "/dashboard/admin/employees" },
  { label: "Locations", href: "/dashboard/admin/locations" },
  { label: "Audit Logs", href: "/dashboard/admin/audit-logs" },
  { label: "HR Settings", href: "/dashboard/admin/hr-settings" },
];

export function AdminTabNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-border pb-0">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "relative px-3 pb-2 pt-1 text-sm font-medium transition-colors",
              active
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
