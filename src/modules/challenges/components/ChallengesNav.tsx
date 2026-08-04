"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const tabs = isOwner ? OWNER_TABS : BASE_TABS;

  return (
    <nav className="mt-4 flex gap-1">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-[var(--r-sm)] px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-[var(--surface)] border border-[var(--line)] font-medium text-[var(--fg)]"
                : "text-[var(--fg-3)] hover:text-[var(--fg-2)] hover:bg-[var(--row-hover)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
