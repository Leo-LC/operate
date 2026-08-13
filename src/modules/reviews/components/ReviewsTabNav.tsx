"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionRole } from "@/core/permissions/types";

interface ReviewsTabNavProps {
  role?: SessionRole;
}

export function ReviewsTabNav({ role }: ReviewsTabNavProps) {
  const pathname = usePathname();
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
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              position: "relative",
              padding: "8px 12px 10px",
              fontSize: 13,
              fontWeight: 500,
              color: active ? "var(--fg)" : "var(--fg-4)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              borderBottom: active ? "2px solid var(--bronze)" : "2px solid transparent",
              marginBottom: -1,
              transition: "color 150ms, border-color 150ms",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
