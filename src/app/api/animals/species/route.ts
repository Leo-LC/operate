import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export type AnimalSpeciesRow = {
  id: string;
  organization_id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("include_inactive") === "true";

  const supabase = getSupabaseServerClient();
  let q = supabase
    .from("animal_species")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("sort_order");

  if (!includeInactive) q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ species: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { key?: string; label?: string; sort_order?: number };
  const label = body.label?.trim();
  // derive key from label if not provided: slugify
  const rawKey = (body.key ?? label ?? "").trim().toLowerCase();
  const key = rawKey.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  if (!key || !label) return Response.json({ error: "key and label required" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: existing } = await supabase
    .from("animal_species")
    .select("sort_order")
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = ((existing?.[0]?.sort_order as number) ?? 0) + 1;

  const { data, error } = await supabase
    .from("animal_species")
    .upsert(
      { organization_id: DEFAULT_ORG_ID, key, label, sort_order: body.sort_order ?? nextOrder, is_active: true },
      { onConflict: "organization_id,key" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data as AnimalSpeciesRow);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) return Response.json({ error: "key required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("animal_species")
    .update({ is_active: false })
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("key", key);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
