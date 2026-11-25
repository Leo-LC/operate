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

export function ChallengesNav({ isOwner }: { isOwner?: boolean }) {
  const tabs = isOwner ? OWNER_TABS : BASE_TABS;

  return <ModuleTabs tabs={tabs} ariaLabel="Challenges" />;
}
