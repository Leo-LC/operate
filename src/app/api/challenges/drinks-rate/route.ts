import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDrinksRate } from "@/modules/challenges/drinks-rate";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user?.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month parameter required in YYYY-MM format" }, { status: 400 });
  }

  try {
    const rows = await getDrinksRate(month);
    return Response.json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load drinks rate";
    return Response.json({ error: message }, { status: 500 });
  }
}
