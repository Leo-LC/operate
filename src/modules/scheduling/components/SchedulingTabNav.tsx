"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleTabs } from "@/components/ui/module-tabs";

const ALL_TABS = [
  { label: "Scheduling", href: "/scheduling/annual", ownerOnly: false },
  { label: "Weekly", href: "/scheduling/week", ownerOnly: false },
  { label: "Settings", href: "/scheduling/settings", ownerOnly: true },
] as const;

export function SchedulingTabNav({ isOwner = false }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const TABS = ALL_TABS.filter((t) => isOwner || !t.ownerOnly);
  const sectionLabel = TABS.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.label ?? "Annual";

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
        <ModuleTabs tabs={TABS} ariaLabel="Scheduling" variant="pills" />
        <span className="sch-section" aria-hidden>{sectionLabel}</span>
      </div>
    </div>
  );
}
