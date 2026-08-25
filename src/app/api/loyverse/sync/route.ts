import { getAccounts } from "@/lib/loyverse/accounts";
import { isLoyverseConfigured, LoyverseApiError } from "@/lib/loyverse/client";
import { requireLoyverseSync } from "@/modules/loyverse/lib/guard";
import { syncAllLoyverse } from "@/modules/loyverse/lib/sync";

export async function POST(request: Request) {
  const guard = await requireLoyverseSync();
  if (!guard.ok) return guard.response;

  if (!isLoyverseConfigured()) {
    return Response.json(
      { error: "Loyverse not configured. Set LOYVERSE_ACCOUNTS or LOYVERSE_ACCESS_TOKEN." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const dates: string[] | undefined = Array.isArray(body?.dates) ? body.dates : undefined;
  const days: number | undefined = typeof body?.days === "number" ? body.days : body?.days ? Number(body.days) : undefined;
  const backfill: boolean | undefined = body?.backfill === true;

  try {
    const result = await syncAllLoyverse({ triggeredBy: "manual", dates, days, backfill });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof LoyverseApiError ? err.message : err instanceof Error ? err.message : String(err);
    const status = err instanceof LoyverseApiError ? err.status : 500;
    return Response.json({ error: message }, { status: status >= 500 ? 500 : status });
  }
}

export async function GET(request: Request) {
  const guard = await requireLoyverseSync();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const datesParam = url.searchParams.get("dates");
  const dates = datesParam ? datesParam.split(",").map((d) => d.trim()).filter(Boolean) : undefined;
  const daysParam = url.searchParams.get("days");
  const days = daysParam ? Number(daysParam) : undefined;
  const backfill = url.searchParams.get("backfill") === "true";

  if (!isLoyverseConfigured()) {
    return Response.json({ error: "Loyverse not configured" }, { status: 503 });
  }

  try {
    const accounts = getAccounts();
    if (accounts.length === 0) {
      return Response.json({ error: "No accounts" }, { status: 503 });
    }
    const result = await syncAllLoyverse({ triggeredBy: "manual", dates, days, backfill });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
