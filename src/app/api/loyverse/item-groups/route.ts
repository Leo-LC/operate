import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseAccess, requireLoyverseSync } from "@/modules/loyverse/lib/guard";
import { normalizeName } from "@/modules/loyverse/lib/item-analysis";

// Lecture : tout accès au module loyverse. Écriture : owner/admin/direction
// (requireLoyverseSync) — les groupes sont partagés, on restreint qui les modifie.

type ItemGroupRow = {
  id: string;
  name: string;
  item_names: string[] | null;
  created_by: string | null;
  created_at: string;
};

function isValidUuid(v: string | null): v is string {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function GET() {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("loyverse_item_groups")
      .select("id, name, item_names, created_by, created_at")
      .order("name", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as ItemGroupRow[];
    return NextResponse.json({
      groups: rows.map((r) => ({ id: r.id, name: r.name, item_names: r.item_names ?? [], created_by: r.created_by, created_at: r.created_at })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireLoyverseSync();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseServerClient();
  try {
    const body = (await request.json()) as { name?: unknown; item_names?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 80) {
      return NextResponse.json({ error: "name is required (max 80 chars)" }, { status: 400 });
    }
    if (!Array.isArray(body.item_names) || body.item_names.length === 0) {
      return NextResponse.json({ error: "item_names must be a non-empty array" }, { status: 400 });
    }
    const itemNames = body.item_names
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0 && v.trim().length <= 200)
      .map((v) => v.trim());
    // Dédup sur nom normalisé — deux entrées qui ne diffèrent que par casse/accents
    // sont le même article vu par le flatten.
    const seen = new Set<string>();
    const uniqueNames = itemNames.filter((n) => {
      const key = normalizeName(n);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (uniqueNames.length === 0 || uniqueNames.length > 300) {
      return NextResponse.json({ error: "item_names must contain 1–300 unique items" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const { data, error } = await supabase
      .from("loyverse_item_groups")
      .upsert(
        {
          name,
          item_names: uniqueNames,
          created_by: session?.user?.userId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "name" },
      )
      .select("id, name, item_names")
      .single();
    if (error) throw error;

    return NextResponse.json({ group: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireLoyverseSync();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "id (uuid) is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  try {
    const { error } = await supabase.from("loyverse_item_groups").delete().eq("id", id!);
    if (error) throw error;
    return NextResponse.json({ deleted: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
