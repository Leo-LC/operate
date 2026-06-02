"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", href: "/challenges/overview" },
  { label: "Reviews", href: "/challenges/reviews" },
] as const;

export function ChallengesNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-4 flex gap-1">
      {TABS.map((tab) => {
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
