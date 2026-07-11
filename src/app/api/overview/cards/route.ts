import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

function nextMonday(from: Date): string {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun, 6=Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export interface ShopCard {
  id: string;
  name: string;
  accounting: { daysBehind: number; cashDiff: number | null };
  schedule: { nextWeekMissing: boolean } | null;
  entries: {
    period: 1 | 2;
    period1Filled: boolean;
    period2Filled: boolean;
    nearingEnd: boolean;
  };
  attendanceDue: boolean;
  nextVaccine: { animalName: string; date: string } | null;
  documents: { expired: number; expiring: number };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const today = new Date();
  const dayOfMonth = today.getDate();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const totalDays = daysInMonth(year, month);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const todayStr = today.toISOString().slice(0, 10);

  // Which bimonthly period are we in?
  const currentPeriod: 1 | 2 = dayOfMonth <= 15 ? 1 : 2;

  // Is it nearing end of the current period?
  // Period 1: days 13-15; Period 2: last 3 days of month
  const nearingEnd =
    currentPeriod === 1
      ? dayOfMonth >= 13 && dayOfMonth <= 15
      : dayOfMonth >= totalDays - 2;

  // Is attendance due (last 3 days of month)?
  const attendanceDue = dayOfMonth >= totalDays - 2;

  // Is today a weekend (Sat=6 or Sun=0)?
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const nextMondayStr = isWeekend ? nextMonday(today) : null;

  // Fetch locations
  const { data: locData } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .order("name");

  const locations = locData ?? [];
  if (locations.length === 0) return Response.json({ cards: [] });

  const locationIds = locations.map((l) => l.id);

  // Parallel fetches for all locations at once
  const [accountingRes, scheduleRes, entriesRes, animalsRes, documentsRes, cashRes] = await Promise.all([
    // Days filled this month (one row per day, so count = filled days)
    supabase
      .from("daily_entries")
      .select("location_id, entry_date")
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("entry_date", `${monthStr}-01`)
      .lt("entry_date", todayStr)
      .in("location_id", locationIds),

    // Schedule for next week (only needed on weekends)
    nextMondayStr
      ? supabase
          .from("schedules")
          .select("location_id, id")
          .eq("organization_id", DEFAULT_ORG_ID)
          .eq("week_start_date", nextMondayStr)
          .is("deleted_at", null)
          .in("location_id", locationIds)
      : Promise.resolve({ data: null }),

    // Location entries for current month (both periods)
    supabase
      .from("location_entries")
      .select("location_id, period, entry_count")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("month", monthStr)
      .in("location_id", locationIds),

    // Next vaccine per location (soonest upcoming)
    supabase
      .from("animals")
      .select("location_id, name, next_vaccination_date")
      .eq("organization_id", DEFAULT_ORG_ID)
      .is("deleted_at", null)
      .not("next_vaccination_date", "is", null)
      .order("next_vaccination_date", { ascending: true })
      .in("location_id", locationIds),

    // Documents with issues
    supabase
      .from("documents")
      .select("location_id, status")
      .is("deleted_at", null)
      .in("status", ["expired", "expiring"])
      .in("location_id", locationIds),

    // Latest cash difference per location (most recent daily entry with cash data)
    supabase
      .from("daily_entries")
      .select("location_id, entry_date, payment_cash, cash_end_day")
      .eq("organization_id", DEFAULT_ORG_ID)
      .in("location_id", locationIds)
      .order("entry_date", { ascending: false })
      .limit(locationIds.length * 2),
  ]);

  // Build lookup maps
  // Accounting: count filled days per location
  const filledDaysByLoc = new Map<string, number>();
  for (const row of accountingRes.data ?? []) {
    filledDaysByLoc.set(row.location_id, (filledDaysByLoc.get(row.location_id) ?? 0) + 1);
  }

  // Schedules for next week
  const scheduleLocIds = new Set((scheduleRes.data ?? []).map((r: { location_id: string }) => r.location_id));

  // Entries by location and period
  type EntryRow = { location_id: string; period: number; entry_count: number | null };
  const entriesByLoc = new Map<string, { p1: boolean; p2: boolean }>();
  for (const row of (entriesRes.data ?? []) as EntryRow[]) {
    const existing = entriesByLoc.get(row.location_id) ?? { p1: false, p2: false };
    if (row.period === 1) existing.p1 = row.entry_count !== null;
    if (row.period === 2) existing.p2 = row.entry_count !== null;
    entriesByLoc.set(row.location_id, existing);
  }

  // Next vaccine per location (already ordered by date ASC — take first per location)
  const vaccineByLoc = new Map<string, { animalName: string; date: string }>();
  for (const row of animalsRes.data ?? []) {
    if (!vaccineByLoc.has(row.location_id)) {
      vaccineByLoc.set(row.location_id, {
        animalName: row.name as string,
        date: row.next_vaccination_date as string,
      });
    }
  }

  // Documents: count expired and expiring per location
  type DocRow = { location_id: string; status: string };
  const docsByLoc = new Map<string, { expired: number; expiring: number }>();
  for (const row of (documentsRes.data ?? []) as DocRow[]) {
    const existing = docsByLoc.get(row.location_id) ?? { expired: 0, expiring: 0 };
    if (row.status === "expired") existing.expired++;
    else if (row.status === "expiring") existing.expiring++;
    docsByLoc.set(row.location_id, existing);
  }

  // Latest cash difference per location (payment_cash - cash_end_day where both are set)
  type CashRow = { location_id: string; entry_date: string; payment_cash: number | null; cash_end_day: number | null };
  const cashDiffByLoc = new Map<string, number>();
  const seenCashLoc = new Set<string>();
  for (const row of (cashRes.data ?? []) as CashRow[]) {
    if (seenCashLoc.has(row.location_id)) continue;
    if (row.payment_cash != null && row.cash_end_day != null) {
      cashDiffByLoc.set(row.location_id, row.cash_end_day - row.payment_cash);
      seenCashLoc.add(row.location_id);
    }
  }

  // Days that should have been filled = days elapsed before today (yesterday is the last completable day)
  const daysShouldBeFilled = dayOfMonth - 1;

  const cards: ShopCard[] = locations.map((loc) => {
    const filled = filledDaysByLoc.get(loc.id) ?? 0;
    const entryInfo = entriesByLoc.get(loc.id) ?? { p1: false, p2: false };

    return {
      id: loc.id,
      name: loc.name as string,
      accounting: {
        daysBehind: Math.max(0, daysShouldBeFilled - filled),
        cashDiff: cashDiffByLoc.get(loc.id) ?? null,
      },
      schedule: isWeekend
        ? { nextWeekMissing: !scheduleLocIds.has(loc.id) }
        : null,
      entries: {
        period: currentPeriod,
        period1Filled: entryInfo.p1,
        period2Filled: entryInfo.p2,
        nearingEnd,
      },
      attendanceDue,
      nextVaccine: vaccineByLoc.get(loc.id) ?? null,
      documents: docsByLoc.get(loc.id) ?? { expired: 0, expiring: 0 },
    };
  });

  return Response.json({ cards });
}
