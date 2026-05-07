import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const locationIds = searchParams.getAll("location_id");

  const supabase = getSupabaseServerClient();

  // Fetch all active locations
  const { data: locData } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", ORG_ID)
    .eq("is_active", true)
    .order("name");

  const allLocations = locData ?? [];
  const targetLocIds = locationIds.length > 0
    ? locationIds.filter((id) => allLocations.some((l) => l.id === id))
    : allLocations.map((l) => l.id);

  // Run all aggregation queries in parallel
  const [
    { data: accountingData },
    { data: animalsData },
    { data: documentsData },
    { data: employeesData },
  ] = await Promise.all([
    supabase
      .from("daily_entries")
      .select("location_id, sales_drinks_net, sales_ticket_net, sales_snack_net, sales_goodies_net, exp_staff_food_cash, exp_drinks_cash, exp_goodies_cash, exp_animals_cash, exp_supply_cash, exp_boss_fees_cash, exp_other_cash, exp_makro_bank, exp_other_bank, hr_salary_cash, hr_salary_bank, hr_challenge_cash, hr_service_charge_cash, hr_accompte_cash")
      .eq("organization_id", ORG_ID)
      .in("location_id", targetLocIds)
      .gte("entry_date", `${month}-01`)
      .lte("entry_date", `${month}-31`),
    supabase
      .from("animals")
      .select("location_id, status, species")
      .eq("organization_id", ORG_ID)
      .is("deleted_at", null)
      .in("location_id", targetLocIds),
    supabase
      .from("documents")
      .select("location_id, status, expires_at")
      .eq("organization_id", ORG_ID)
      .is("deleted_at", null)
      .in("location_id", targetLocIds),
    supabase
      .from("employees")
      .select("location_id, active")
      .eq("organization_id", ORG_ID)
      .is("deleted_at", null)
      .eq("active", true)
      .in("location_id", targetLocIds),
  ]);

  // Aggregate accounting per location
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const accountingByLoc = new Map<string, { sales: number; expenses: number }>();
  for (const e of (accountingData ?? [])) {
    const curr = accountingByLoc.get(e.location_id) ?? { sales: 0, expenses: 0 };
    const sales = Number(e.sales_drinks_net) + Number(e.sales_ticket_net) + Number(e.sales_snack_net) + Number(e.sales_goodies_net);
    const exp = Number(e.exp_staff_food_cash) + Number(e.exp_drinks_cash) + Number(e.exp_goodies_cash) + Number(e.exp_animals_cash) + Number(e.exp_supply_cash) + Number(e.exp_boss_fees_cash) + Number(e.exp_other_cash) + Number(e.exp_makro_bank) + Number(e.exp_other_bank) + Number(e.hr_salary_cash) + Number(e.hr_salary_bank) + Number(e.hr_challenge_cash) + Number(e.hr_service_charge_cash) + Number(e.hr_accompte_cash);
    accountingByLoc.set(e.location_id, { sales: curr.sales + sales, expenses: curr.expenses + exp });
  }

  // Document status helper
  function docStatus(d: { status: string; expires_at: string | null }): string {
    if (!d.expires_at) return d.status;
    if (d.expires_at < today) return "expired";
    if (d.expires_at <= in30) return "expiring";
    return d.status === "expired" || d.status === "expiring" ? "valid" : d.status;
  }

  // Per-location summary
  const locationSummaries = allLocations
    .filter((l) => targetLocIds.includes(l.id))
    .map((loc) => {
      const acc = accountingByLoc.get(loc.id) ?? { sales: 0, expenses: 0 };
      const animals = (animalsData ?? []).filter((a) => a.location_id === loc.id);
      const docs = (documentsData ?? []).filter((d) => d.location_id === loc.id);
      const employees = (employeesData ?? []).filter((e) => e.location_id === loc.id);

      return {
        location_id: loc.id,
        location_name: loc.name,
        accounting: {
          sales_net: acc.sales,
          expenses: acc.expenses,
          net_profit: acc.sales - acc.expenses,
        },
        animals: {
          total: animals.length,
          sick: animals.filter((a) => a.status === "sick" || a.status === "quarantine").length,
          capybaras: animals.filter((a) => a.species === "capybara").length,
          meerkats: animals.filter((a) => a.species === "meerkat").length,
        },
        documents: {
          total: docs.length,
          expired: docs.filter((d) => docStatus(d) === "expired").length,
          expiring: docs.filter((d) => docStatus(d) === "expiring").length,
          valid: docs.filter((d) => docStatus(d) === "valid").length,
        },
        staffing: {
          active_employees: employees.length,
        },
      };
    });

  return Response.json({ month, locations: allLocations, summaries: locationSummaries });
}
