"use client";

import { ModuleTabs } from "@/components/ui/module-tabs";

const TABS = [
  { label: "Recurring costs", href: "/finance/recurring-costs" },
  { label: "Shop settings", href: "/finance/shop-settings" },
];

export function FinanceTabNav() {
  return <ModuleTabs tabs={TABS} ariaLabel="Finance" />;
}
