import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ReportsClient } from "@/modules/reports/components/ReportsClient";
import { computeStatus } from "@/modules/documents/types";
import { salesNetTotal, expTotal, hrTotal } from "@/modules/accounting/types";
import type { DailyEntry } from "@/modules/accounting/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export interface ReportsSummary {
  documents: {
    total: number;
    valid: number;
    expiring: number;
    expired: number;
    attention: number; // missing + to_review
  };
  animals: {
    total: number;
    active: number;
    attention: number; // sick + quarantine + observation
  };
  accounting: {
    month: string;
    salesNet: number;
    expenses: number;
    hrCosts: number;
    daysWithEntries: number;
    daysInMonth: number;
  };
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const supabase = getSupabaseServerClient();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const [{ data: docsData }, { data: animalsData }, { data: entriesData }] = await Promise.all([
    supabase
      .from("documents")
      .select("status, expires_at")
      .is("deleted_at", null)
      .eq("organization_id", ORG_ID),
    supabase
      .from("animals")
      .select("status")
      .is("deleted_at", null)
      .eq("organization_id", ORG_ID),
    supabase
      .from("daily_entries")
      .select("*")
      .eq("organization_id", ORG_ID)
      .gte("entry_date", `${month}-01`)
      .lt("entry_date", `${month}-32`),
  ]);

  // Documents summary
  const docs = (docsData ?? []) as { status: string; expires_at: string | null }[];
  const docSummary = docs.reduce(
    (acc, d) => {
      const effective = computeStatus({ status: d.status as Parameters<typeof computeStatus>[0]["status"], expires_at: d.expires_at });
      if (effective === "archived" || effective === "replaced") return acc;
      acc.total++;
      if (effective === "valid") acc.valid++;
      else if (effective === "expiring") acc.expiring++;
      else if (effective === "expired") acc.expired++;
      else if (effective === "missing" || effective === "to_review") acc.attention++;
      return acc;
    },
    { total: 0, valid: 0, expiring: 0, expired: 0, attention: 0 },
  );

  // Animals summary
  const animals = (animalsData ?? []) as { status: string }[];
  const animalSummary = animals.reduce(
    (acc, a) => {
      if (a.status === "archived") return acc;
      acc.total++;
      if (a.status === "active") acc.active++;
      else if (a.status === "sick" || a.status === "quarantine" || a.status === "observation") acc.attention++;
      return acc;
    },
    { total: 0, active: 0, attention: 0 },
  );

  // Accounting summary
  const entries = (entriesData ?? []) as DailyEntry[];
  const accountingSummary = {
    month,
    salesNet: entries.reduce((s, e) => s + salesNetTotal(e), 0),
    expenses: entries.reduce((s, e) => s + expTotal(e), 0),
    hrCosts: entries.reduce((s, e) => s + hrTotal(e), 0),
    daysWithEntries: entries.length,
    daysInMonth,
  };

  const summary: ReportsSummary = {
    documents: docSummary,
    animals: animalSummary,
    accounting: accountingSummary,
  };

  return <ReportsClient summary={summary} />;
}
