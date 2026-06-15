import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "owner")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    location_id?: string;
    account_name: string;
    declared_balance?: number;
    last_verified_at?: string;
    reliability?: string;
    notes?: string;
  };

  if (!body.account_name) return Response.json({ error: "account_name required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("treasury_bank_accounts")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      location_id: body.location_id ?? null,
      account_name: body.account_name,
      declared_balance: body.declared_balance ?? null,
      last_verified_at: body.last_verified_at ?? null,
      reliability: body.reliability ?? "medium",
      notes: body.notes ?? null,
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "owner")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: string; [key: string]: unknown };
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });

  const { id, ...fields } = body;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("treasury_bank_accounts")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORG_ID)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "owner")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json() as { id: string };
  const supabase = getSupabaseServerClient();
  await supabase
    .from("treasury_bank_accounts")
    .delete()
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORG_ID);

  return Response.json({ deleted: true });
}
