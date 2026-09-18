import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";

interface EntryBody {
  locationId: string;
  month: string; // YYYY-MM
  period: 1 | 2 | 3;
  entryCount?: number;
  snacksSold?: number;
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Override manuel = owner uniquement (source de vérité = Loyverse, sync force=true).
  // Le bouton rouge côté UI prévient : n'utiliser qu'en cas de mauvais paramétrage Loyverse.
  if (session.user.role !== "owner") {
    return Response.json({ error: "Forbidden — override manuel réservé au owner." }, { status: 403 });
  }

  const body = (await request.json()) as EntryBody;
  const { locationId, month, period, entryCount, snacksSold } = body;

  if (!locationId || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (period !== 1 && period !== 2 && period !== 3) {
    return Response.json({ error: "period must be 1, 2 or 3" }, { status: 400 });
  }
  if (entryCount !== undefined && (typeof entryCount !== "number" || entryCount < 0)) {
    return Response.json({ error: "Invalid entryCount" }, { status: 400 });
  }
  if (snacksSold !== undefined && (typeof snacksSold !== "number" || snacksSold < 0)) {
    return Response.json({ error: "Invalid snacksSold" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    location_id: locationId,
    organization_id: DEFAULT_ORG_ID,
    month,
    period,
    synced_at: new Date().toISOString(),
  };
  if (entryCount !== undefined) patch.entry_count = Math.round(entryCount);
  if (snacksSold !== undefined) patch.snacks_sold = Math.round(snacksSold);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("challenge_counters").upsert(patch, {
    onConflict: "location_id,organization_id,month,period",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "challenges.counters.override",
    moduleKey: "challenges",
    entityType: "challenge_counters",
    entityId: locationId,
    payload: { location_id: locationId, month, period, entryCount, snacksSold },
  });

  return Response.json({ ok: true });
}
