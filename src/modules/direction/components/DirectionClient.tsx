"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboardIcon, LayersIcon, CalculatorIcon, BarChart3Icon, PlugIcon, CalendarClockIcon } from "lucide-react";
import { ControlledTabs, type ControlledTab } from "@/components/ui/module-tabs";
import { TableScrollAffordance } from "@/components/ui/table-scroll-affordance";
import { useUiVisibility } from "@/components/visibility";
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
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { value: "loyverse", label: "Loyverse", icon: PlugIcon },
  { value: "overview", label: "Vue d'ensemble", icon: LayoutDashboardIcon },
  { value: "comparaison", label: "Comparaison", icon: BarChart3Icon },
  { value: "daily", label: "Résultat quotidien", icon: CalculatorIcon },
  { value: "details", label: "Détails", icon: LayersIcon },
  { value: "end_of_month", label: "Fin de mois", icon: CalendarClockIcon },
];

/**
 * Tab visibility uses the unified eye-toggle system (`tab:direction.<key>` in
 * module_visibility): masked tabs disappear for non-privileged roles, render
 * dimmed with an eye for owner/admin, and only the owner gets the eye toggle.
 */
export function DirectionClient({ canSync = true, userRole = "" }: { canSync?: boolean; userRole?: string }) {
  const { isVisible, canSeeHidden } = useUiVisibility();

  const [active, setActive] = useState<TabKey>("dashboard");

  // Tabs the current user may open (the tab bar itself hides/dims masked tabs).
  const tabsForUser = ALL_TABS.filter((t) => canSeeHidden || isVisible(`tab:direction.${t.value}`));

  // Ensure active is visible; if not, switch to first visible
  useEffect(() => {
    if (!tabsForUser.some((t) => t.value === active)) {
      setActive(tabsForUser[0]?.value ?? "dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeHidden, isVisible]);

  const controlledTabs: ControlledTab[] = ALL_TABS.map((tab) => ({
    value: tab.value,
    label: tab.label,
    icon: tab.icon,
    visibilityKey: `tab:direction.${tab.value}`,
  }));

  const activeTabLabel = ALL_TABS.find((tab) => tab.value === active)?.label ?? "Direction";

  return (
    <div className="dir-shell">
      <TableScrollAffordance />
      <div className="dir dir-head">
        <div className="ui-module-header">
          <nav aria-label="Breadcrumb">
            <ol className="ui-breadcrumb">
              <li>
                <Link href="/direction">Direction</Link>
                <span className="ui-breadcrumb-sep" aria-hidden> / </span>
              </li>
              <li>
                <span aria-current="page">{activeTabLabel}</span>
              </li>
            </ol>
          </nav>
          <div className="ui-module-header-row">
            <h1 className="ui-module-title">Direction</h1>
            {/* Tab bar with eye toggle per tab for privileged users */}
            <ControlledTabs
              variant="pills"
              tabs={controlledTabs}
              value={active}
              onChange={(v) => setActive(v as TabKey)}
              ariaLabel="Direction"
            />
          </div>
          {/* Seven tabs do not fit a phone: say that the strip scrolls. */}
          <p className="ui-scroll-note">↔ Faites défiler les onglets</p>
        </div>
      </div>

      {/* Loyverse is not migrated yet: it renders outside the `.dir` bridge so
          the legacy tokens keep applying to it. */}
      {active === "loyverse" ? (
        <LoyverseDashboard canSync={canSync} />
      ) : (
        <div className="dir dir-body">
          {active === "dashboard" && <DirectionExecutiveDashboard />}
          {active === "overview" && <DirectionOverview />}
          {active === "comparaison" && <DirectionComparaison />}
          {active === "daily" && <DirectionDaily />}
          {active === "details" && <DirectionDetails />}
          {active === "end_of_month" && <DirectionEndOfMonth />}
          {/* Diagnostic, not a driving metric: kept at the end of the panel. */}
          {userRole === "owner" && <DirectionSourceBanner userRole={userRole} />}
        </div>
      )}
    </div>
  );
}
