import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "owner")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    location_id: string;
    cash_on_hand?: number;
    expected_transfer?: number;
    last_count_date?: string;
    notes?: string;
  };

  if (!body.location_id) return Response.json({ error: "location_id required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("treasury_cash_positions")
    .upsert({
      organization_id: DEFAULT_ORG_ID,
      location_id: body.location_id,
      cash_on_hand: body.cash_on_hand ?? null,
      expected_transfer: body.expected_transfer ?? null,
      last_count_date: body.last_count_date ?? null,
      notes: body.notes ?? null,
      created_by: session.user.userId ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,location_id" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
