import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM
  const location = searchParams.get("location") ?? "all";

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month parameter required in YYYY-MM format" }, { status: 400 });
  }

  const [year, monthNum] = month.split("-").map(Number);
  const rangeStart = new Date(year, monthNum - 1, 1).toISOString();
  const rangeEnd = new Date(year, monthNum, 1).toISOString();

  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("reviews_cache")
    .select("star_rating, create_time, synced_at")
    .eq("organization_id", DEFAULT_ORG_ID)
    .gte("create_time", rangeStart)
    .lt("create_time", rangeEnd);

  if (location !== "all") {
    query = query.eq("location_id", location);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // Still return the last synced_at even when no reviews in range
    const { data: syncRow } = await supabase
      .from("reviews_cache")
      .select("synced_at")
      .eq("organization_id", DEFAULT_ORG_ID)
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();

    return Response.json({
      count: 0,
      avgRating: 0,
      byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      byWeek: [],
      lastSyncedAt: syncRow?.synced_at ?? null,
    });
  }

  const count = data.length;
  const byRating: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  // Bucket reviews into ISO weeks within the month
  const weekBuckets: Map<string, { count: number; ratingSum: number }> = new Map();

  for (const row of data) {
    const rating = row.star_rating as 1 | 2 | 3 | 4 | 5;
    byRating[rating] = (byRating[rating] ?? 0) + 1;
    ratingSum += rating;

    const date = new Date(row.create_time);
    const weekStart = getWeekStart(date, year, monthNum - 1);
    const key = weekStart.toISOString().slice(0, 10);
    const bucket = weekBuckets.get(key) ?? { count: 0, ratingSum: 0 };
    bucket.count++;
    bucket.ratingSum += rating;
    weekBuckets.set(key, bucket);
  }

  const byWeek = Array.from(weekBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, bucket]) => ({
      weekStart,
      count: bucket.count,
      avgRating: Math.round((bucket.ratingSum / bucket.count) * 10) / 10,
    }));

  const lastSyncedAt = data.reduce((max, row) => {
    return row.synced_at > max ? row.synced_at : max;
  }, data[0].synced_at);

  return Response.json({
    count,
    avgRating: Math.round((ratingSum / count) * 10) / 10,
    byRating,
    byWeek,
    lastSyncedAt,
  });
}

// Returns the Monday of the week containing `date`, clamped to the first day of
// the given month so that week labels stay within the month.
function getWeekStart(date: Date, year: number, month: number): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  // Clamp to month start
  const monthStart = new Date(year, month, 1);
  if (d < monthStart) return monthStart;
  return d;
}
