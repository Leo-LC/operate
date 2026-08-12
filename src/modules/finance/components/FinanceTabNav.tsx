"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Daily P&L", href: "/finance/daily-profit" },
  { label: "Recurring costs", href: "/finance/recurring-costs" },
  { label: "Shop settings", href: "/finance/shop-settings" },
];

export function FinanceTabNav() {
  const pathname = usePathname();
  return <nav aria-label="Finance" style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
    {TABS.map((tab) => {
      const active = pathname.startsWith(tab.href);
      return <Link key={tab.href} href={tab.href} style={{ padding: "9px 13px 11px", whiteSpace: "nowrap", fontSize: 13, fontWeight: 550, color: active ? "var(--fg)" : "var(--fg-4)", textDecoration: "none", borderBottom: active ? "2px solid var(--bronze)" : "2px solid transparent", marginBottom: -1 }}>{tab.label}</Link>;
    })}
  </nav>;
}
