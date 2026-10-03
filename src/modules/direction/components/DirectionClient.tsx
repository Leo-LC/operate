"use client";

import { useState } from "react";
import { LayoutDashboardIcon, LayersIcon, CalculatorIcon, BarChart3Icon, PlugIcon, CalendarClockIcon } from "lucide-react";
import { ControlledTabs, type ControlledTab } from "@/components/ui/module-tabs";
import { LoyverseDashboard } from "@/modules/loyverse/components/LoyverseDashboard";
import { DirectionOverview } from "./DirectionOverview";
import { DirectionSourceBanner } from "./DirectionSourceBanner";
import { DirectionComparaison } from "./DirectionComparaison";
import { DirectionDetails } from "./DirectionDetails";
import { DirectionDaily } from "./DirectionDaily";
import { DirectionEndOfMonth } from "./DirectionEndOfMonth";
import { DirectionExecutiveDashboard } from "./DirectionExecutiveDashboard";

type TabKey = "dashboard" | "loyverse" | "overview" | "comparaison" | "daily" | "details" | "end_of_month";
type TabDef = { value: TabKey; label: string; icon: React.ElementType };

const ALL_TABS: TabDef[] = [
  { value: "dashboard", label: "Dashboard boss", icon: LayoutDashboardIcon },
  { value: "loyverse", label: "Loyverse", icon: PlugIcon },
  { value: "overview", label: "Vue d'ensemble", icon: LayoutDashboardIcon },
  { value: "comparaison", label: "Comparaison", icon: BarChart3Icon },
  { value: "daily", label: "Résultat quotidien", icon: CalculatorIcon },
  { value: "details", label: "Détails", icon: LayersIcon },
  { value: "end_of_month", label: "Fin de mois", icon: CalendarClockIcon },
];

export function DirectionClient({ canSync = true, userRole = "" }: { canSync?: boolean; userRole?: string }) {
  if (userRole === "direction") return <DirectionExecutiveDashboard />;
  return <DirectionTechnicalClient canSync={canSync} userRole={userRole} />;
}

function DirectionTechnicalClient({ canSync, userRole }: { canSync: boolean; userRole: string }) {
  const [active, setActive] = useState<TabKey>("dashboard");
  const controlledTabs: ControlledTab[] = ALL_TABS;

  return (
    <div className="flex flex-col gap-4">
      {userRole === "owner" && <DirectionSourceBanner userRole={userRole} />}
      <ControlledTabs tabs={controlledTabs} value={active} onChange={(v) => setActive(v as TabKey)} ariaLabel="Direction" />

      <div className="pt-2">
        {active === "dashboard" && <DirectionExecutiveDashboard />}
        {active === "loyverse" && <LoyverseDashboard canSync={canSync} />}
        {active === "overview" && <DirectionOverview />}
        {active === "comparaison" && <DirectionComparaison />}
        {active === "daily" && <DirectionDaily />}
        {active === "details" && <DirectionDetails />}
        {active === "end_of_month" && <DirectionEndOfMonth />}
      </div>
    </div>
  );
}
