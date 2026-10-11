import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getAccounts as getEnvAccounts, type Account } from "./accounts";

let cached: Account[] | null = null;
let cachedAt = 0;
const TTL_MS = 30_000;

type DbRow = {
  key: string;
  label: string;
  token: string;
  is_active: boolean;
};

async function loadDbAccounts(): Promise<Account[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("loyverse_accounts")
    .select("key, label, token, is_active")
    .eq("is_active", true)
    .order("key");
  if (error) throw error;
  const rows = (data ?? []) as DbRow[];
  return rows
    .filter((r) => r.key?.trim() && r.token?.trim())
    .map((r) => ({
      key: r.key.trim(),
      label: r.label?.trim() || r.key.trim(),
      token: r.token,
    }));
}

/**
 * Server-side account list: Supabase `loyverse_accounts` (source of truth,
 * editable via owner UI) merged with `LOYVERSE_ACCOUNTS` / legacy env
 * (fallback during transition). DB wins on key conflict.
 */
export async function getAccountsAsync(opts?: { noCache?: boolean }): Promise<Account[]> {
  const now = Date.now();
  if (!opts?.noCache && cached && now - cachedAt < TTL_MS) return cached;

  const env = getEnvAccounts();
  let db: Account[] = [];
  try {
    db = await loadDbAccounts();
  } catch {
    // Table missing / Supabase down → env fallback so sync never breaks.
    db = [];
  }

  const merged = new Map<string, Account>();
  for (const a of env) merged.set(a.key, a);
  for (const a of db) merged.set(a.key, a); // DB wins
  const list = Array.from(merged.values()).sort((a, b) => a.key.localeCompare(b.key));

  cached = list;
  cachedAt = now;
  return list;
}

export async function getDefaultAccountAsync(): Promise<Account | null> {
  return (await getAccountsAsync())[0] ?? null;
}

export async function getAccountByKeyAsync(key: string): Promise<Account | null> {
  return (await getAccountsAsync()).find((a) => a.key === key) ?? null;
}

export async function isLoyverseConfiguredAsync(): Promise<boolean> {
  return (await getAccountsAsync()).length > 0;
}

export function clearAccountsCache(): void {
  cached = null;
  cachedAt = 0;
}

/** Last-4 mask for admin UI identification without exposing the token. */
export function maskToken(token: string): string {
  const t = token.trim();
  if (t.length <= 8) return "••••••••";
  return `••••••${t.slice(-4)}`;
}
