import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "owner")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    category: string;
    priority?: string;
    label: string;
    amount_required: number;
    amount_reserved?: number;
    due_date?: string;
    is_recurring?: boolean;
    recurrence_interval?: string;
    notes?: string;
    month?: string;
  };

  if (!body.label || !body.category) return Response.json({ error: "label and category required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("treasury_reserves")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      category: body.category,
      priority: body.priority ?? "high",
      label: body.label,
      amount_required: body.amount_required ?? 0,
      amount_reserved: body.amount_reserved ?? 0,
      due_date: body.due_date ?? null,
      is_recurring: body.is_recurring ?? false,
      recurrence_interval: body.recurrence_interval ?? null,
      notes: body.notes ?? null,
      month: body.month ?? null,
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
    .from("treasury_reserves")
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
    .from("treasury_reserves")
    .delete()
    .eq("id", id)
    .eq("organization_id", DEFAULT_ORG_ID);

  return Response.json({ deleted: true });
}
