"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleTabs, type ModuleTab } from "@/components/ui/module-tabs";
import type { SessionRole } from "@/core/permissions/types";

interface ReviewsTabNavProps {
  role?: SessionRole;
}

const SECTION_LABELS: Record<string, string> = {
  "/reviews/inbox": "Inbox",
  "/reviews/templates": "Templates",
  "/reviews/locations": "Locations",
  "/reviews/stats": "Stats",
};

/**
 * Tab visibility uses the unified eye-toggle system (`tab:reviews.stats` in
 * module_visibility): masked tabs disappear for non-privileged roles, render
 * dimmed with an eye for owner/admin, and only the owner gets the eye toggle
 * (see ModuleTabs + the shared visibility context in components/visibility.tsx).
 *
 * Every Reviews route shares one reading order: a real breadcrumb, a compact
 * "Reviews" title and the module navigation beside it
 * (docs/ui-pilot DESIGN-CONTRACT.md).
 */
export function ReviewsTabNav({ role }: ReviewsTabNavProps) {
  const pathname = usePathname();
  const sectionLabel = SECTION_LABELS[pathname] ?? "Inbox";
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
    <div className="ui-module-header">
      <nav aria-label="Breadcrumb">
        <ol className="ui-breadcrumb">
          <li>
            <Link href="/reviews/inbox">Reviews</Link>
            <span className="ui-breadcrumb-sep" aria-hidden> / </span>
          </li>
          <li>
            <span aria-current="page">{sectionLabel}</span>
          </li>
        </ol>
      </nav>
      <div className="ui-module-header-row">
        <h1 className="ui-module-title">Reviews</h1>
        <ModuleTabs tabs={tabs} ariaLabel="Reviews" variant="pills" />
      </div>
    </div>
  );
}
