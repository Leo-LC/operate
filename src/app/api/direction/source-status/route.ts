import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { isWriteBackEnabled } from "@/modules/loyverse/lib/write-back";

// GET /api/direction/source-status — bandeau source OWNER-only.
// D'où viennent les chiffres de Direction > Vue d'ensemble (daily_entries consolidé).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const [syncRes, sheetsRes] = await Promise.all([
    supabase
      .from("loyverse_sync_runs")
      .select("status, finished_at, total_snapshots, triggered_by")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sheet_import_batches")
      .select("created_at, reverted_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return Response.json({
    salesSource: "loyverse",
    salesDetail: "snapshots Loyverse → daily_entries (write-back quotidien J+J-1)",
    costsSource: "recurring_costs",
    countersSource: "challenge_counters (100% Loyverse)",
    writeBackEnabled: isWriteBackEnabled(),
    lastLoyverseSync: syncRes.data ?? null,
    lastSheetsImport: sheetsRes.data ?? null,
  });
}
