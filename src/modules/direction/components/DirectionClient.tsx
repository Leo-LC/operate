"use client";

import { useState } from "react";
import { LayoutDashboardIcon, TrendingUpIcon, LayersIcon, CalculatorIcon, BarChart3Icon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DirectionOverview } from "./DirectionOverview";
import { DirectionTrends } from "./DirectionTrends";
import { DirectionDetails } from "./DirectionDetails";
import { DirectionDaily } from "./DirectionDaily";
import { DirectionRevenue } from "./DirectionRevenue";

export function DirectionClient() {
  const [active, setActive] = useState<"overview" | "trends" | "daily" | "revenue" | "details">("overview");

  const TABS = [
    { value: "overview" as const, label: "Vue d'ensemble", icon: LayoutDashboardIcon },
    { value: "trends" as const, label: "Tendances", icon: TrendingUpIcon },
    { value: "daily" as const, label: "Résultat quotidien", icon: CalculatorIcon },
    { value: "revenue" as const, label: "Comparaison CA", icon: BarChart3Icon },
    { value: "details" as const, label: "Détails", icon: LayersIcon },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Direction" />

      {/* Tab bar with bluish/border indicator like Details (daily pnl / operations / by shop) */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", gap: 0 }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActive(tab.value)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0 var(--s-4)",
                height: 36,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                background: "none",
                cursor: "pointer",
                color: isActive ? "var(--fg)" : "var(--fg-4)",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
                transition: "color var(--dur) var(--ease)",
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget.style.color = "var(--fg-2)"); }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget.style.color = "var(--fg-4)"); }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        {active === "overview" && <DirectionOverview />}
        {active === "trends" && <DirectionTrends />}
        {active === "daily" && <DirectionDaily />}
        {active === "revenue" && <DirectionRevenue />}
        {active === "details" && <DirectionDetails />}
      </div>
    </div>
  );
}
