import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

interface EntryBody {
  locationId: string;
  month: string; // YYYY-MM
  entryCount?: number;
  snacksSold?: number;
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as EntryBody;
  const { locationId, month, entryCount, snacksSold } = body;

  if (!locationId || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
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
    synced_at: new Date().toISOString(),
  };
  if (entryCount !== undefined) patch.entry_count = Math.round(entryCount);
  if (snacksSold !== undefined) patch.snacks_sold = Math.round(snacksSold);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("location_entries").upsert(patch, {
    onConflict: "location_id,organization_id,month",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
