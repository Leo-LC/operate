"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface ReviewsTabNavProps {
  role?: "owner" | "staff";
}

export function ReviewsTabNav({ role }: ReviewsTabNavProps) {
  const pathname = usePathname();
  const isOwner = role === "owner";

  const tabs = [
    { label: "Inbox", href: "/dashboard/reviews/inbox" },
    ...(isOwner
      ? [
          { label: "Templates", href: "/dashboard/reviews/templates" },
          { label: "Rating Rules", href: "/dashboard/reviews/rules" },
        ]
      : []),
    { label: "Locations", href: "/dashboard/reviews/locations" },
  ];

  return (
    <div className="mb-4 flex gap-1 border-b border-border pb-0">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "relative px-3 pb-2 pt-1 text-sm font-medium transition-colors",
              active
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
