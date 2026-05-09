import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { salesNetTotal, expTotal, hrTotal } from "@/modules/accounting/types";
import type { DailyEntry } from "@/modules/accounting/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

function agg(entries: DailyEntry[]) {
  const revenue = entries.reduce((s, e) => s + salesNetTotal(e), 0);
  const expenses = entries.reduce((s, e) => s + expTotal(e), 0);
  const hrCosts = entries.reduce((s, e) => s + hrTotal(e), 0);
  const netProfit = revenue - expenses - hrCosts;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const drinks = entries.reduce((s, e) => s + e.sales_drinks_net, 0);
  const tickets = entries.reduce((s, e) => s + e.sales_ticket_net, 0);
  const snacks = entries.reduce((s, e) => s + e.sales_snack_net, 0);
  const goodies = entries.reduce((s, e) => s + e.sales_goodies_net, 0);
  const surcharge = entries.reduce((s, e) => s + e.sales_card_surcharge, 0);
  const cash = entries.reduce((s, e) => s + e.payment_cash, 0);
  const scan = entries.reduce((s, e) => s + e.payment_scan, 0);
  const creditCard = entries.reduce((s, e) => s + e.payment_credit_card, 0);
  return { revenue, expenses, hrCosts, netProfit, margin, drinks, tickets, snacks, goodies, surcharge, cash, scan, creditCard };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "accounting")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().split("T")[0];

  const from = searchParams.get("from") ?? defaultFrom;
  const to = searchParams.get("to") ?? defaultTo;
  const locationsParam = searchParams.get("locations") ?? "all";

  const supabase = getSupabaseServerClient();

  const [{ data: locsData }, { data: entriesData }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", ORG_ID)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("daily_entries")
      .select("*")
      .eq("organization_id", ORG_ID)
      .gte("entry_date", from)
      .lte("entry_date", to),
  ]);

  const allLocations = (locsData ?? []) as { id: string; name: string }[];
  const selectedIds = locationsParam === "all"
    ? allLocations.map((l) => l.id)
    : locationsParam.split(",").filter(Boolean);

  const allEntries = (entriesData ?? []) as DailyEntry[];
  const filtered = allEntries.filter((e) => selectedIds.includes(e.location_id));

  const overview = agg(filtered);

  const byShop = allLocations
    .filter((l) => selectedIds.includes(l.id))
    .map((loc) => {
      const shopEntries = filtered.filter((e) => e.location_id === loc.id);
      return { locationId: loc.id, locationName: loc.name, ...agg(shopEntries) };
    });

  return Response.json({
    period: { from, to },
    locations: allLocations,
    overview,
    byShop,
  });
}
