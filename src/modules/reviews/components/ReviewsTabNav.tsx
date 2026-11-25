"use client";

import { ModuleTabs, type ModuleTab } from "@/components/ui/module-tabs";
import type { SessionRole } from "@/core/permissions/types";

interface ReviewsTabNavProps {
  role?: SessionRole;
}

/**
 * Tab visibility uses the unified eye-toggle system (`tab:reviews.stats` in
 * module_visibility): masked tabs disappear for non-privileged roles, render
 * dimmed with an eye for owner/admin, and only the owner gets the eye toggle
 * (see ModuleTabs + the shared visibility context in components/visibility.tsx).
 */
export function ReviewsTabNav({ role }: ReviewsTabNavProps) {
  const isOwner = role === "owner";

  const tabs: ModuleTab[] = [
    { label: "Inbox", href: "/reviews/inbox" },
    ...(isOwner
      ? [
          { label: "Templates", href: "/reviews/templates" },
        ]
      : []),
    { label: "Stats", href: "/reviews/stats", visibilityKey: "tab:reviews.stats" },
    { label: "Locations", href: "/reviews/locations" },
  ];

  return (
    <div className="reviews-tab-nav">
      <ModuleTabs tabs={tabs} ariaLabel="Reviews" />
    </div>
  );
}
