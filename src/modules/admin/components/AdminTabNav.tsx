"use client";

import { ModuleTabs } from "@/components/ui/module-tabs";

const ALL_TABS = [
  { label: "Users", href: "/admin/users", ownerOnly: false },
  { label: "Locations", href: "/admin/locations", ownerOnly: false },
  { label: "Audit Logs", href: "/admin/audit-logs", ownerOnly: false },
  { label: "Appearance", href: "/admin/appearance", ownerOnly: true },
  { label: "Automations", href: "/admin/automations", ownerOnly: true },
] as const;

export function AdminTabNav({ isOwner = true }: { isOwner?: boolean }) {
  const TABS = ALL_TABS.filter((t) => isOwner || !t.ownerOnly);

  return (
    <div style={{ marginBottom: 24 }}>
      <ModuleTabs tabs={TABS} ariaLabel="Admin" />
    </div>
  );
}
