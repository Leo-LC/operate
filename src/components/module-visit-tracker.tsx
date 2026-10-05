"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** First path segment -> module_key tracked in module_visits. Null = not tracked. */
function moduleForPath(pathname: string): string | null {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";
  switch (seg) {
    case "direction":
      return "direction";
    case "loyverse":
    case "loyverse-export":
      return "loyverse";
    case "shift-sales":
    case "loyverse-preview":
      return "loyverse_preview";
    case "loyverse-sandbox":
      return "loyverse-sandbox";
    case "reports":
    case "finance":
      return "reports";
    case "challenges":
      return "challenges";
    case "reviews":
      return "reviews";
    case "customer-insights":
      return "customer-insights";
    case "employees":
    case "admin":
      return "admin";
    case "attendance":
      return "attendance";
    case "scheduling":
      return "schedules";
    case "payments":
      return "payments";
    case "accounting":
      return "accounting";
    case "treasury":
      return "treasury";
    case "documents":
      return "documents";
    case "animals":
      return "animals";
    case "directory":
    case "contacts":
      return "contacts";
    case "wiki":
      return "wiki";
    case "brand":
      return "brand";
    default:
      return null;
  }
}

export function ModuleVisitTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    const moduleKey = moduleForPath(pathname ?? "");
    if (!moduleKey || lastSent.current === `${moduleKey}:${pathname}`) return;
    lastSent.current = `${moduleKey}:${pathname}`;
    fetch("/api/activity/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module_key: moduleKey }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
