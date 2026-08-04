import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChallengesOverview } from "@/modules/challenges/overview-data";
import { addMonths, buildSpotlightResponse } from "@/modules/challenges/spotlight";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month parameter required in YYYY-MM format" }, { status: 400 });
  }

  try {
    const priorMonth = addMonths(month, -1);
    const [current, prior] = await Promise.all([
      getChallengesOverview(month),
      getChallengesOverview(priorMonth),
    ]);

    const payload = buildSpotlightResponse(month, current, prior);
    return Response.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load spotlight";
    return Response.json({ error: message }, { status: 500 });
  }
}
