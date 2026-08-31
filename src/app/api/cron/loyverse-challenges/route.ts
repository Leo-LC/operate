import { syncChallengesFromLoyverse } from "@/modules/challenges/lib/sync-from-loyverse";

function checkAuth(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = request.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

function bangkokMonth(): string {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function handleCron(request: Request) {
  const authErr = checkAuth(request);
  if (authErr) return authErr;
  const url = new URL(request.url);
  const month = url.searchParams.get("month") && /^\d{4}-\d{2}$/.test(url.searchParams.get("month")!) ? url.searchParams.get("month")! : bangkokMonth();
  try {
    // Remplit les périodes du mois en cours depuis les snapshots déjà archivés (tickets/snacks)
    // force=false : n'écrase pas les saisies manuelles déjà présentes
    const result = await syncChallengesFromLoyverse(month, { dryRun: false, force: false });
    return Response.json({ ...result, triggered_by: "cron", month });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}
export async function POST(request: Request) {
  return handleCron(request);
}
