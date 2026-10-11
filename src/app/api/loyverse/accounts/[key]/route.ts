import { clearAccountsCache } from "@/lib/loyverse/accounts-server";
import { loyverseFetch } from "@/lib/loyverse/client";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseOwner } from "@/modules/loyverse/lib/guard";

/** PATCH /api/loyverse/accounts/[key]: owner-only update label/token/is_active. */
export async function PATCH(request: Request, { params }: { params: { key: string } }) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  const key = params.key?.trim().toLowerCase();
  if (!key) return Response.json({ error: "Missing key" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const patch: { label?: string; token?: string; is_active?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body?.label === "string" && body.label.trim()) patch.label = body.label.trim();
  if (typeof body?.token === "string" && body.token.trim()) patch.token = body.token.trim();
  if (typeof body?.is_active === "boolean") patch.is_active = body.is_active;

  if (!patch.label && !patch.token && patch.is_active === undefined) {
    return Response.json({ error: "Nothing to update (label, token, is_active)" }, { status: 400 });
  }

  // Live-test a new token before storing.
  if (patch.token) {
    try {
      await loyverseFetch<{ stores: unknown }>({ key, label: key, token: patch.token }, "/stores", { limit: 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ error: `Token rejected by Loyverse API: ${message}` }, { status: 502 });
    }
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("loyverse_accounts")
    .update(patch)
    .eq("key", key)
    .select("key, label, is_active, updated_at")
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Not found in DB (env-only account — add it to DB first)" }, { status: 404 });

  clearAccountsCache();
  return Response.json({ ok: true, account: data });
}

/** DELETE /api/loyverse/accounts/[key]: owner-only remove from DB. */
export async function DELETE(_request: Request, { params }: { params: { key: string } }) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  const key = params.key?.trim().toLowerCase();
  if (!key) return Response.json({ error: "Missing key" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { error, count } = await supabase.from("loyverse_accounts").delete().eq("key", key);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  clearAccountsCache();
  return Response.json({
    ok: true,
    key,
    deleted: (count ?? 0) > 0,
    note: "History (snapshots keyed on account_key) is untouched. If the same key still exists in env, it will reappear as source=env.",
  });
}
