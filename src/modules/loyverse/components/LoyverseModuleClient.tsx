"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalculatorIcon, TrophyIcon, AlertTriangleIcon, RefreshCwIcon, CalendarIcon } from "lucide-react";
import { AccountingPreview } from "./AccountingPreview";
import { ChallengesPreview } from "./ChallengesPreview";
import { UnmappedPanel } from "./UnmappedPanel";

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function LoyverseModuleClient() {
  const [date, setDate] = React.useState<string>(() => bangkokToday());
  const [activeTab, setActiveTab] = React.useState("accounting");
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loyverse — Preview"
        subtitle="Contrôle avant mise en prod. Lecture seule : rien n'est écrit dans daily_entries / location_entries tant que tu n'actives pas Phase 4."
        eyebrow="Module • Owner only"
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--fg-3)]">
              <CalendarIcon className="size-3.5" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-[13px] font-medium text-[var(--fg)] outline-none"
              />
            </label>
            <Button variant="secondary" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshCwIcon className="size-3.5" />
              Actualiser
            </Button>
          </div>
        }
      />

      {/* Help banner */}
      <Card className="border-[var(--bronze-soft)] bg-[var(--bronze-soft)]/30">
        <CardContent className="py-3">
          <p className="text-sm font-medium text-[var(--fg)]">Comment utiliser cette page ?</p>
          <div className="mt-2 grid gap-2 text-xs leading-relaxed text-[var(--fg-3)] sm:grid-cols-3">
            <div className="flex gap-2">
              <CalculatorIcon className="mt-0.5 size-3.5 shrink-0 text-[var(--bronze)]" />
              <span><strong className="text-[var(--fg-2)]">Accounting</strong> — compare le proposé Loyverse vs ta saisie Sheets. Écart 0 = prêt.</span>
            </div>
            <div className="flex gap-2">
              <TrophyIcon className="mt-0.5 size-3.5 shrink-0 text-[var(--bronze)]" />
              <span><strong className="text-[var(--fg-2)]">Challenges</strong> — vérifie entrées/snacks/panier exacts vs seuils du mois.</span>
            </div>
            <div className="flex gap-2">
              <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-[var(--warn)]" />
              <span><strong className="text-[var(--fg-2)]">Unmapped</strong> — liste ce qui n’est pas bucketisé. Corrige dans <code>mapping-config.ts</code>.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="accounting">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-[var(--r-md)] bg-[var(--bg-2)] p-1">
          <TabsTrigger
            value="accounting"
            className="flex items-center gap-1.5 rounded-[var(--r-sm)] px-3 py-1.5 text-sm font-medium data-active:bg-[var(--surface)] data-active:shadow-sm data-active:text-[var(--fg)] text-[var(--fg-3)]"
          >
            <CalculatorIcon className="size-3.5" />
            Accounting
          </TabsTrigger>
          <TabsTrigger
            value="challenges"
            className="flex items-center gap-1.5 rounded-[var(--r-sm)] px-3 py-1.5 text-sm font-medium data-active:bg-[var(--surface)] data-active:shadow-sm data-active:text-[var(--fg)] text-[var(--fg-3)]"
          >
            <TrophyIcon className="size-3.5" />
            Challenges
          </TabsTrigger>
          <TabsTrigger
            value="unmapped"
            className="flex items-center gap-1.5 rounded-[var(--r-sm)] px-3 py-1.5 text-sm font-medium data-active:bg-[var(--surface)] data-active:shadow-sm data-active:text-[var(--fg)] text-[var(--fg-3)]"
          >
            <AlertTriangleIcon className="size-3.5" />
            Unmapped
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounting" className="pt-4">
          <AccountingPreview key={`acc-${date}-${refreshKey}`} date={date} />
        </TabsContent>
        <TabsContent value="challenges" className="pt-4">
          <ChallengesPreview key={`chal-${date}-${refreshKey}`} date={date} />
        </TabsContent>
        <TabsContent value="unmapped" className="pt-4">
          <UnmappedPanel key={`unm-${date}-${refreshKey}`} date={date} />
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-[var(--fg-4)]">
        Besoin de données fraîches ? Va sur <a href="/overview" className="underline decoration-[var(--line-strong)] underline-offset-2 hover:text-[var(--fg-3)]">Overview → Synchroniser</a> puis reviens ici et clique Actualiser.
      </p>
    </div>
  );
}
