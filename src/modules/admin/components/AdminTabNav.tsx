"use client";

import { ModuleTabs } from "@/components/ui/module-tabs";

const ALL_TABS = [
  { label: "Users", href: "/admin/users", ownerOnly: false, visibilityKey: "tab:admin.users" },
  { label: "Locations", href: "/admin/locations", ownerOnly: false, visibilityKey: "tab:admin.locations" },
  { label: "Activity", href: "/admin/activity", ownerOnly: false, visibilityKey: "tab:admin.activity" },
  { label: "Appearance", href: "/admin/appearance", ownerOnly: true, visibilityKey: "tab:admin.appearance" },
  { label: "Automations", href: "/admin/automations", ownerOnly: true, visibilityKey: "tab:admin.automations" },
  { label: "Audit Logs", href: "/admin/audit-logs", ownerOnly: false, visibilityKey: "tab:admin.audit-logs" },
] as const;

export function AdminTabNav({ isOwner = true }: { isOwner?: boolean }) {
  const TABS = ALL_TABS.filter((t) => isOwner || !t.ownerOnly);

  return (
    <div style={{ marginBottom: 24 }}>
      <ModuleTabs tabs={TABS} ariaLabel="Admin" />
    </div>
  );
}
