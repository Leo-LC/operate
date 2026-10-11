import { getAccounts as getEnvAccounts } from "@/lib/loyverse/accounts";
import {
  clearAccountsCache,
  getAccountsAsync,
  maskToken,
} from "@/lib/loyverse/accounts-server";
import { loyverseFetch } from "@/lib/loyverse/client";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseAccess, requireLoyverseOwner } from "@/modules/loyverse/lib/guard";

const KEY_RE = /^[a-z0-9_-]{1,40}$/;

/** GET: visible list (no tokens) for anyone with loyverse access. */
export async function GET() {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;

  const [merged, env] = await Promise.all([getAccountsAsync(), Promise.resolve(getEnvAccounts())]);
  const envKeys = new Set(env.map((a) => a.key));

  const meta = new Map<string, { is_active: boolean; created_at: string | null; updated_at: string | null }>();
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.from("loyverse_accounts").select("key, is_active, created_at, updated_at");
    for (const row of (data ?? []) as Array<{ key: string; is_active: boolean; created_at: string; updated_at: string }>) {
      meta.set(row.key, { is_active: row.is_active, created_at: row.created_at, updated_at: row.updated_at });
    }
  } catch {
    // ignore — env-only fallback
  }

  // Tokens come from the merged server-side list but are never returned.
  const tokenByKey = new Map(merged.map((a) => [a.key, a.token] as const));

  return Response.json({
    accounts: merged.map((a) => ({
      key: a.key,
      label: a.label,
      source: meta.has(a.key) ? "db" : "env",
      is_active: meta.get(a.key)?.is_active ?? true,
      has_token: tokenByKey.has(a.key),
      masked: tokenByKey.has(a.key) ? maskToken(tokenByKey.get(a.key)!) : null,
      env_fallback: envKeys.has(a.key) && !meta.has(a.key),
      created_at: meta.get(a.key)?.created_at ?? null,
      updated_at: meta.get(a.key)?.updated_at ?? null,
    })),
  });
}

/** POST: owner-only create { key, label, token }. Token is live-tested via GET /stores. */
export async function POST(request: Request) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key.trim().toLowerCase() : "";
  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim() : key;
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!KEY_RE.test(key)) {
    return Response.json({ error: "Invalid key (lowercase letters, digits, - _)" }, { status: 400 });
  }
  if (!token) return Response.json({ error: "Token is required" }, { status: 400 });

  // Live-test the token before storing so a typo never blinds prod.
  try {
    await loyverseFetch<{ stores: Array<{ id: string; name: string }> }>(
      { key, label, token },
      "/stores",
      { limit: 50 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Token rejected by Loyverse API: ${message}` }, { status: 502 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("loyverse_accounts")
    .insert({ key, label, token, is_active: true, updated_at: new Date().toISOString() });
  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return Response.json({ error: error.code === "23505" ? "Key already exists" : error.message }, { status });
  }

  clearAccountsCache();
  const stores = await loyverseFetch<{ stores: Array<{ id: string; name: string }> }>(
    { key, label, token },
    "/stores",
    { limit: 50 },
  ).catch(() => ({ stores: [] }));
  return Response.json({
    ok: true,
    key,
    stores: (stores.stores ?? []).map((s) => ({ id: s.id, name: s.name })),
    next: "Map each store in `locations` (loyverse_store_id + loyverse_account_key), then run a sync.",
  });
}
