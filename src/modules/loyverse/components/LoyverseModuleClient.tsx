"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalculatorIcon, TrophyIcon, AlertTriangleIcon, BeakerIcon, ClockIcon } from "lucide-react";
import { AccountingPreview } from "./AccountingPreview";
import { ChallengesPreview } from "./ChallengesPreview";
import { UnmappedPanel } from "./UnmappedPanel";
import { LoyverseSandboxClient } from "@/modules/loyverse-sandbox/components/LoyverseSandboxClient";
import { ShiftsPreview } from "./ShiftsPreview";

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function bangkokYesterday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);
}

export function LoyverseModuleClient() {
  const [date] = React.useState<string>(() => bangkokToday());
  const [activeTab, setActiveTab] = React.useState("shifts");
  const [refreshKey] = React.useState(0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Shift & Sales" />

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="shifts" className="flex flex-col">
        <TabsList className="inline-flex h-auto w-fit justify-start gap-1 rounded-[var(--r-md)] bg-[var(--bg-2)] p-1">
          <TabsTrigger
            value="shifts"
            className="inline-flex flex-none items-center gap-1.5 rounded-[var(--r-sm)] px-3 py-1.5 text-sm font-medium data-active:bg-[var(--surface)] data-active:shadow-sm data-active:text-[var(--fg)] text-[var(--fg-3)]"
          >
            <ClockIcon className="size-3.5" />
            Shifts (veille)
          </TabsTrigger>
          <TabsTrigger
            value="accounting"
            className="inline-flex flex-none items-center gap-1.5 rounded-[var(--r-sm)] px-3 py-1.5 text-sm font-medium data-active:bg-[var(--surface)] data-active:shadow-sm data-active:text-[var(--fg)] text-[var(--fg-3)]"
          >
            <CalculatorIcon className="size-3.5" />
            Accounting
          </TabsTrigger>
          <TabsTrigger
            value="challenges"
            className="inline-flex flex-none items-center gap-1.5 rounded-[var(--r-sm)] px-3 py-1.5 text-sm font-medium data-active:bg-[var(--surface)] data-active:shadow-sm data-active:text-[var(--fg)] text-[var(--fg-3)]"
          >
            <TrophyIcon className="size-3.5" />
            Challenges
          </TabsTrigger>
          <TabsTrigger
            value="unmapped"
            className="inline-flex flex-none items-center gap-1.5 rounded-[var(--r-sm)] px-3 py-1.5 text-sm font-medium data-active:bg-[var(--surface)] data-active:shadow-sm data-active:text-[var(--fg)] text-[var(--fg-3)]"
          >
            <AlertTriangleIcon className="size-3.5" />
            Unmapped
          </TabsTrigger>
          <TabsTrigger
            value="debug"
            className="inline-flex flex-none items-center gap-1.5 rounded-[var(--r-sm)] px-3 py-1.5 text-sm font-medium data-active:bg-[var(--surface)] data-active:shadow-sm data-active:text-[var(--fg)] text-[var(--fg-3)]"
          >
            <BeakerIcon className="size-3.5" />
            Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="w-full pt-4">
          <ShiftsPreview key={`shifts-${date}-${refreshKey}`} initialDate={bangkokYesterday()} />
        </TabsContent>
        <TabsContent value="accounting" className="w-full pt-4">
          <AccountingPreview key={`acc-${date}-${refreshKey}`} date={date} />
        </TabsContent>
        <TabsContent value="challenges" className="w-full pt-4">
          <ChallengesPreview key={`chal-${date}-${refreshKey}`} date={date} />
        </TabsContent>
        <TabsContent value="unmapped" className="w-full pt-4">
          <UnmappedPanel key={`unm-${date}-${refreshKey}`} date={date} />
        </TabsContent>
        <TabsContent value="debug" className="w-full pt-4">
          <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-4 text-xs text-[var(--fg-4)]">
              Ancien sandbox fusionné — API Explorer, Mapping Preview, Store Mapping, Demo Report. Conservé pour debug.
            </p>
            <LoyverseSandboxClient />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
