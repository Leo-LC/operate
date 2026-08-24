"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountingPreview } from "./AccountingPreview";
import { ChallengesPreview } from "./ChallengesPreview";
import { UnmappedPanel } from "./UnmappedPanel";

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function LoyverseModuleClient() {
  const [date, setDate] = React.useState<string>(() => bangkokToday());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loyverse — Preview"
        subtitle="Read-only : compare Loyverse proposé vs Sheets saisi. Rien n’écrit dans daily_entries/location_entries."
        eyebrow="Module"
        actions={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-[34px] rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2 text-[13px] text-[var(--fg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
        }
      />

      <Tabs defaultValue="accounting">
        <TabsList variant="line" className="w-full justify-start gap-4 border-b border-[var(--line)] rounded-none bg-transparent p-0">
          <TabsTrigger value="accounting" className="rounded-none border-b-2 border-transparent px-1 py-2 data-active:border-[var(--bronze)] data-active:text-[var(--fg)]">
            Accounting
          </TabsTrigger>
          <TabsTrigger value="challenges" className="rounded-none border-b-2 border-transparent px-1 py-2 data-active:border-[var(--bronze)] data-active:text-[var(--fg)]">
            Challenges
          </TabsTrigger>
          <TabsTrigger value="unmapped" className="rounded-none border-b-2 border-transparent px-1 py-2 data-active:border-[var(--bronze)] data-active:text-[var(--fg)]">
            Unmapped
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounting" className="pt-4">
          <AccountingPreview date={date} />
        </TabsContent>
        <TabsContent value="challenges" className="pt-4">
          <ChallengesPreview date={date} />
        </TabsContent>
        <TabsContent value="unmapped" className="pt-4">
          <UnmappedPanel date={date} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
