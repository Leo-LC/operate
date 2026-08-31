import { requireLoyverseOwner } from "@/modules/loyverse/lib/guard";
import { syncChallengesFromLoyverse } from "@/modules/challenges/lib/sync-from-loyverse";

function bangkokMonth(): string {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const month: string = typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : bangkokMonth();
  const dryRun: boolean = body.dryRun === true;
  const force: boolean = body.force === true;

  try {
    const result = await syncChallengesFromLoyverse(month, { dryRun, force });
    return Response.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? bangkokMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: "month=YYYY-MM" }, { status: 400 });
  try {
    const result = await syncChallengesFromLoyverse(month, { dryRun: true });
    return Response.json({ ...result, hint: "POST { month, dryRun:false, force:false } pour écrire (force=true écrase l'existant)" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
