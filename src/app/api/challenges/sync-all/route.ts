import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncAllChallenges } from "@/modules/challenges/lib/sync-all";

/**
 * Manual "Sync all" for challenges (owner only) — runs the same sequential
 * pipeline as the nightly cron: sheets → loyverse → write-back → counters →
 * reviews. Use after mid-day edits instead of the individual sync buttons.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "owner") {
    return Response.json({ error: "Forbidden — owner only." }, { status: 403 });
  }
  try {
    const result = await syncAllChallenges({ triggeredBy: "manual", respectSheetConfig: false });
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
