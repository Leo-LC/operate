import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { DocumentStatus } from "@/modules/documents/types";
import { salesNetTotal, expTotal, hrTotal, DAILY_ENTRY_SUMMARY_COLUMNS } from "@/modules/accounting/types";
import type { DailyEntry } from "@/modules/accounting/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().split("T")[0];

  const from = searchParams.get("from") ?? defaultFrom;
  const to = searchParams.get("to") ?? defaultTo;

  const supabase = getSupabaseServerClient();

  const [{ data: docsData }, { data: animalsData }, { data: entriesData }] = await Promise.all([
    supabase
      .from("documents")
      .select("status, expires_at")
      .is("deleted_at", null)
      .eq("organization_id", DEFAULT_ORG_ID),
    supabase
      .from("animals")
      .select("status")
      .is("deleted_at", null)
      .eq("organization_id", DEFAULT_ORG_ID),
    supabase
      .from("daily_entries")
      .select(DAILY_ENTRY_SUMMARY_COLUMNS.join(", "))
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .order("entry_date"),
  ]);

  // Documents — use the persisted status from DB (computed server-side on save)
  const docs = (docsData ?? []) as { status: DocumentStatus }[];
  const documents = docs.reduce(
    (acc, d) => {
      if (d.status === "not_relevant") return acc;
      acc.total++;
      if (d.status === "valid") acc.valid++;
      else if (d.status === "expiring") acc.expiring++;
      else if (d.status === "expired") acc.expired++;
      else if (d.status === "missing") acc.attention++;
      return acc;
    },
    { total: 0, valid: 0, expiring: 0, expired: 0, attention: 0 },
  );

  // Animals
  const animalRows = (animalsData ?? []) as { status: string }[];
  const animals = animalRows.reduce(
    (acc, a) => {
      if (a.status === "archived") return acc;
      acc.total++;
      if (a.status === "active") acc.active++;
      else if (a.status === "sick" || a.status === "quarantine" || a.status === "observation") acc.attention++;
      return acc;
    },
    { total: 0, active: 0, attention: 0 },
  );

  // Accounting
  const entries = (entriesData ?? []) as unknown as DailyEntry[];
  const salesNet = entries.reduce((s, e) => s + salesNetTotal(e), 0);
  const expenses = entries.reduce((s, e) => s + expTotal(e), 0);
  const hrCosts = entries.reduce((s, e) => s + hrTotal(e), 0);
  const totalExpenses = expenses + hrCosts;
  const netProfit = salesNet - totalExpenses;
  const margin = salesNet > 0 ? (netProfit / salesNet) * 100 : 0;

  // Days count in range
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const daysInRange = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;

  return Response.json({
    period: { from, to },
    documents,
    animals,
    accounting: {
      salesNet,
      expenses,
      hrCosts,
      totalExpenses,
      netProfit,
      margin,
      daysWithEntries: entries.length,
      daysInRange,
    },
  });
}
