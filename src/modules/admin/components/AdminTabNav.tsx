"use client";

import { usePathname } from "next/navigation";
import { ModuleTabs } from "@/components/ui/module-tabs";

const ALL_TABS = [
  { label: "Users", href: "/admin/users", ownerOnly: false },
  { label: "Locations", href: "/admin/locations", ownerOnly: false },
  { label: "Activity", href: "/admin/activity", ownerOnly: false },
  { label: "Appearance", href: "/admin/appearance", ownerOnly: true },
  { label: "Automations", href: "/admin/automations", ownerOnly: true },
  { label: "Audit Logs", href: "/admin/audit-logs", ownerOnly: false },
] as const;

export function AdminTabNav({ isOwner = true }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const TABS = ALL_TABS.filter((t) => isOwner || !t.ownerOnly);
  const sectionLabel = TABS.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.label
    ?? (pathname.startsWith("/admin/employees") || pathname.startsWith("/admin/hr-settings") ? "Employees" : "Admin");

  return (
    <div className="ui-module-header adm-nav">
      <nav aria-label="Breadcrumb">
        <ol className="ui-breadcrumb">
          <li>
            <span aria-current="page">Admin</span>
          </li>
        </ol>
      </nav>
      <div className="ui-module-header-row">
        <h1 className="ui-module-title">Admin</h1>
        <ModuleTabs tabs={TABS} ariaLabel="Admin" variant="pills" />
        <span className="adm-section" aria-hidden>{sectionLabel}</span>
      </div>
    </div>
  );
}
