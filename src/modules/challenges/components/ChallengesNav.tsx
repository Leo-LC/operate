import { ModuleTabs } from "@/components/ui/module-tabs";

const BASE_TABS = [
  { label: "Overview", href: "/challenges/overview" },
  { label: "Reviews", href: "/challenges/reviews" },
  { label: "Spotlight", href: "/challenges/spotlight" },
] as const;

const OWNER_TABS = [
  ...BASE_TABS,
  { label: "Methodology", href: "/challenges/methodology" },
] as const;

export function ChallengesNav({ isOwner }: { isOwner?: boolean }) {
  const tabs = isOwner ? OWNER_TABS : BASE_TABS;

  return <ModuleTabs tabs={tabs} ariaLabel="Challenges" />;
}
