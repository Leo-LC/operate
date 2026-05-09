import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("hr_settings")
    .select("*")
    .eq("organization_id", ORG_ID)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: Partial<{
    overtime_weekday_multiplier: number;
    overtime_weekend_multiplier: number;
    overtime_holiday_multiplier: number;
    monthly_hours_divisor: number;
  }>;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("hr_settings")
    .upsert({ organization_id: ORG_ID, ...body, updated_at: new Date().toISOString() }, { onConflict: "organization_id" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
