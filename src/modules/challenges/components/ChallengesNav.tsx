"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleTabs } from "@/components/ui/module-tabs";

const BASE_TABS = [
  { label: "Overview", href: "/challenges/overview", visibilityKey: "tab:challenges.overview" },
  { label: "Reviews", href: "/challenges/reviews", visibilityKey: "tab:challenges.reviews" },
  { label: "Spotlight", href: "/challenges/spotlight", visibilityKey: "tab:challenges.spotlight" },
] as const;

const OWNER_TABS = [
  ...BASE_TABS,
  { label: "Labo", href: "/challenges/labo", visibilityKey: "tab:challenges.labo" },
  { label: "Methodology", href: "/challenges/methodology", visibilityKey: "tab:challenges.methodology" },
] as const;

const SECTION_LABELS: Record<string, string> = {
  "/challenges/overview": "Overview",
  "/challenges/reviews": "Reviews",
  "/challenges/spotlight": "Spotlight",
  "/challenges/labo": "Labo",
  "/challenges/methodology": "Methodology",
};

/**
 * Every Challenges route shares one reading order, matching the Reviews
 * module: a real breadcrumb, a compact "Challenges" title and the module
 * navigation as pill links beside it (docs/ui-pilot/DESIGN-CONTRACT.md).
 * Owner-only tabs stay owner-only; the tab sets themselves are unchanged.
 */
export function ChallengesNav({ isOwner }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const sectionLabel = SECTION_LABELS[pathname] ?? "Overview";
  const tabs = isOwner ? OWNER_TABS : BASE_TABS;

  return (
    <div className="ui-module-header">
      <nav aria-label="Breadcrumb">
        <ol className="ui-breadcrumb">
          <li>
            <Link href="/challenges/overview">Challenges</Link>
            <span className="ui-breadcrumb-sep" aria-hidden> / </span>
          </li>
          <li>
            <span aria-current="page">{sectionLabel}</span>
          </li>
        </ol>
      </nav>
      <div className="ui-module-header-row">
        <h1 className="ui-module-title">Challenges</h1>
      </div>
      <ModuleTabs tabs={tabs} ariaLabel="Challenges" />
    </div>
  );
}
