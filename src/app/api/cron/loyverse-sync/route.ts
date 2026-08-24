import { isLoyverseConfigured } from "@/lib/loyverse/client";
import { syncAllLoyverse } from "@/modules/loyverse/lib/sync";

function checkAuth(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = request.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function handleCron(request: Request) {
  const authErr = checkAuth(request);
  if (authErr) return authErr;

  if (!isLoyverseConfigured()) {
    return Response.json({ error: "Loyverse not configured" }, { status: 503 });
  }

  try {
    // Cron backfills missing in last 30d + refresh J/J-1 (idempotent)
    const result = await syncAllLoyverse({ triggeredBy: "cron", backfill: true });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
