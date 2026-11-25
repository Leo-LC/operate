"use client";

import { ModuleTabs } from "@/components/ui/module-tabs";

const ALL_TABS = [
  { label: "Scheduling", href: "/scheduling/annual", ownerOnly: false, visibilityKey: "tab:scheduling.annual" },
  { label: "Weekly", href: "/scheduling/week", ownerOnly: false, visibilityKey: "tab:scheduling.week" },
  { label: "Settings", href: "/scheduling/settings", ownerOnly: true, visibilityKey: "tab:scheduling.settings" },
] as const;

export function SchedulingTabNav({ isOwner = false }: { isOwner?: boolean }) {
  const TABS = ALL_TABS.filter((t) => isOwner || !t.ownerOnly);

  return (
    <div style={{ marginBottom: 24 }}>
      <ModuleTabs tabs={TABS} ariaLabel="Scheduling" />
    </div>
  );
}
