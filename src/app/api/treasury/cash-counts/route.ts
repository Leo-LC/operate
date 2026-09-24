import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { computeCashTotal, isValidCounts } from "@/modules/treasury/lib/denominations";

function forbidden(role: string | undefined) {
  return role !== "owner";
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (forbidden(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("location_id");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("treasury_cash_counts")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("counted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ cashCounts: data ?? [] });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || forbidden(session.user.role))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    location_id?: string;
    counted_at?: string;
    counts?: unknown;
    notes?: string;
  };

  if (!body.location_id) return Response.json({ error: "location_id required" }, { status: 400 });
  if (!isValidCounts(body.counts)) return Response.json({ error: "counts invalid" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("treasury_cash_counts")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      location_id: body.location_id,
      counted_at: body.counted_at || new Date().toISOString().slice(0, 10),
      counts: body.counts,
      total: computeCashTotal(body.counts),
      notes: body.notes?.trim() ? body.notes.trim() : null,
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || forbidden(session.user.role))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json() as { id: string };
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  await supabase
    .from("treasury_cash_counts")
    .delete()
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORG_ID);

  return Response.json({ deleted: true });
}
