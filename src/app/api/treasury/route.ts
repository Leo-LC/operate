import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

function requireOwner(role: string | undefined) {
  return role === "owner";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireOwner(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();

  const [bankRes, reservesRes, cashRes, locRes] = await Promise.all([
    supabase
      .from("treasury_bank_accounts")
      .select("*")
      .eq("organization_id", DEFAULT_ORG_ID)
      .order("created_at"),

    supabase
      .from("treasury_reserves")
      .select("*")
      .eq("organization_id", DEFAULT_ORG_ID)
      .order("priority")
      .order("label"),

    supabase
      .from("treasury_cash_positions")
      .select("*")
      .eq("organization_id", DEFAULT_ORG_ID),

    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .order("name"),
  ]);

  return Response.json({
    bankAccounts: bankRes.data ?? [],
    reserves: reservesRes.data ?? [],
    cashPositions: cashRes.data ?? [],
    locations: locRes.data ?? [],
  });
}
