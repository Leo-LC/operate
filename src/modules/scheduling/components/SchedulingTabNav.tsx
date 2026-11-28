"use client";

import { usePathname } from "next/navigation";
import { ModuleTabs } from "@/components/ui/module-tabs";

const ALL_TABS = [
  { label: "Scheduling", href: "/scheduling/annual", ownerOnly: false, visibilityKey: "tab:scheduling.annual" },
  { label: "Weekly", href: "/scheduling/week", ownerOnly: false, visibilityKey: "tab:scheduling.week" },
  { label: "Settings", href: "/scheduling/settings", ownerOnly: true, visibilityKey: "tab:scheduling.settings" },
] as const;

export function SchedulingTabNav({ isOwner = false }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const TABS = ALL_TABS.filter((t) => isOwner || !t.ownerOnly);
  // Only a real tab label may appear here; unlisted routes (the plan list,
  // /scheduling/import, /scheduling/[id]) render no invented section name.
  const tab = TABS.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`));

  return (
    <div className="ui-module-header sch-nav">
      <nav aria-label="Breadcrumb">
        <ol className="ui-breadcrumb">
          <li>
            <span aria-current="page">Scheduling</span>
          </li>
        </ol>
      </nav>
      <div className="ui-module-header-row">
        <h1 className="ui-module-title">Scheduling</h1>
        {tab && <span className="sch-section" aria-hidden>{tab.label}</span>}
      </div>
      <ModuleTabs tabs={TABS} ariaLabel="Scheduling" />
    </div>
  );
}
