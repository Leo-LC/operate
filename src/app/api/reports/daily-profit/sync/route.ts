import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { verifyCronAuth } from "@/lib/cron";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { syncDailyProfitMirror } from "@/modules/reports/daily-profit/sheet-mirror";

// Auth + config gate only — the actual mirror lives in sheet-mirror.ts, shared
// with the nightly pipeline (sync-all step `mirror`).

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role || undefined);
  if (permissions.global_role !== "owner") return Response.json({ error: "Owner access required" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { preview?: boolean };
  const { status, body: payload } = await syncDailyProfitMirror({
    userId: session.user.userId ?? null,
    source: "manual",
    preview: body.preview === true,
  });
  return Response.json(payload, { status });
}

export async function GET(request: Request) {
  const authErr = verifyCronAuth(request);
  if (authErr) return authErr;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("finance_sync_config").select("enabled").eq("organization_id", DEFAULT_ORG_ID).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data?.enabled) return Response.json({ skipped: true, reason: "Daily P&L sync disabled" });
  const { status, body } = await syncDailyProfitMirror({ userId: null, source: "cron" });
  return Response.json(body, { status });
}
