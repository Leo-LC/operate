"use client";

import * as React from "react";
import { ControlledTabs } from "@/components/ui/module-tabs";
import { CalculatorIcon, TrophyIcon, AlertTriangleIcon, BeakerIcon, ClockIcon, ScaleIcon, BarChart3Icon } from "lucide-react";
import { AccountingPreview } from "./AccountingPreview";
import { ChallengesPreview } from "./ChallengesPreview";
import { ReconciliationPanel } from "./ReconciliationPanel";
import { UnmappedPanel } from "./UnmappedPanel";
import { LoyverseSandboxClient } from "@/modules/loyverse-sandbox/components/LoyverseSandboxClient";
import { ShiftsPreview } from "./ShiftsPreview";
import { AnalysisPanel } from "./AnalysisPanel";
import { bangkokToday, bangkokYesterday } from "@/lib/dates";

const TABS = [
  { value: "shifts", label: "Shifts (veille)", icon: ClockIcon },
  { value: "accounting", label: "Accounting", icon: CalculatorIcon },
  { value: "challenges", label: "Challenges", icon: TrophyIcon },
  { value: "analysis", label: "Analyse", icon: BarChart3Icon },
  { value: "reco", label: "Réconciliation (probation)", icon: ScaleIcon },
  { value: "unmapped", label: "Unmapped", icon: AlertTriangleIcon },
  { value: "debug", label: "Debug", icon: BeakerIcon },
];

export function LoyverseModuleClient({ canSync = false }: { canSync?: boolean }) {
  const [date] = React.useState<string>(() => bangkokToday());
  const [activeTab, setActiveTab] = React.useState("shifts");
  const [refreshKey] = React.useState(0);

  return (
    <div className="flex flex-col gap-6">
      <ControlledTabs tabs={TABS} value={activeTab} onChange={setActiveTab} ariaLabel="Shift and Sales" />

      <div className="w-full pt-2">
        {activeTab === "shifts" && <ShiftsPreview key={`shifts-${date}-${refreshKey}`} initialDate={bangkokYesterday()} />}
        {activeTab === "accounting" && <AccountingPreview key={`acc-${date}-${refreshKey}`} date={date} />}
        {activeTab === "challenges" && <ChallengesPreview key={`chal-${date}-${refreshKey}`} date={date} />}
        {activeTab === "reco" && <ReconciliationPanel />}
        {activeTab === "unmapped" && <UnmappedPanel key={`unm-${date}-${refreshKey}`} date={date} />}
        {activeTab === "analysis" && <AnalysisPanel key={`ana-${refreshKey}`} canSync={canSync} />}
        {activeTab === "debug" && (
          <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-4 text-xs text-[var(--fg-4)]">
              Ancien sandbox fusionné — API Explorer, Mapping Preview, Store Mapping, Demo Report. Conservé pour debug.
            </p>
            <LoyverseSandboxClient />
          </div>
        )}
      </div>
    </div>
  );
}
