"use client";

import { useState } from "react";
import { PlugIcon, TrendingUpIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { LoyverseDashboard } from "@/modules/loyverse/components/LoyverseDashboard";
import { ReportsClient } from "@/modules/reports/components/ReportsClient";

export function BossClient({ canSync }: { canSync: boolean }) {
  const [active, setActive] = useState<"loyverse" | "reports">("loyverse");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Boss"
        eyebrow="Direction — preview"
        subtitle="Vue regroupée de tout ce que voit le rôle direction aujourd'hui (Loyverse + Reports). Onglets temporaires pour itérer — on affinera ensemble."
      />

      <Tabs
        value={active}
        onValueChange={(v) => setActive(v as "loyverse" | "reports")}
        className="flex flex-col w-full"
      >
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="loyverse" className="flex-none gap-2">
            <PlugIcon size={14} />
            Loyverse
            <span className="hidden text-[11px] font-normal text-[var(--fg-4)] sm:inline">
              · ventes & shops
            </span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-none gap-2">
            <TrendingUpIcon size={14} />
            Reports
            <span className="hidden text-[11px] font-normal text-[var(--fg-4)] sm:inline">
              · finance & P&L
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="loyverse" className="w-full pt-4">
          {/* Fidelity 100% : même composant que /loyverse */}
          <LoyverseDashboard canSync={canSync} />
        </TabsContent>

        <TabsContent value="reports" className="w-full pt-4">
          {/* Fidelity 100% : même composant que /reports */}
          <ReportsClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
