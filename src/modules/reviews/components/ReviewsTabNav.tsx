"use client";

import { ModuleTabs } from "@/components/ui/module-tabs";
import type { SessionRole } from "@/core/permissions/types";

interface ReviewsTabNavProps {
  role?: SessionRole;
}

export function ReviewsTabNav({ role }: ReviewsTabNavProps) {
  const isOwner = role === "owner";

  const tabs = [
    { label: "Inbox", href: "/reviews/inbox" },
    ...(isOwner
      ? [
          { label: "Templates", href: "/reviews/templates" },
          { label: "Rating Rules", href: "/reviews/rules" },
        ]
      : []),
    { label: "Locations", href: "/reviews/locations" },
  ];

  return (
    <div className="reviews-tab-nav">
      <ModuleTabs tabs={tabs} ariaLabel="Reviews" />
    </div>
  );
}
