import {
  DEFAULT_RATING_RULES,
  REPLY_CATEGORIES,
  REPLY_TEMPLATES,
  type Rating,
  type RatingRule,
  type ReplyCategory,
  type ReplyTemplateMap,
} from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Reply settings stored as real rows (reply_templates / reply_categories /
 * rating_rules — see migration 20261024000000) instead of the retired
 * shared_config JSON blob. The UI reaches these via /api/reviews/config
 * (owner-guarded); the auto-reply cron reads them directly, server-side.
 */

export interface StoredReplyConfig {
  templates: ReplyTemplateMap;
  rules: Record<Rating, RatingRule>;
  categories: ReplyCategory[];
  updatedAt: number;
}

interface TemplateRow {
  rating: number;
  category_id: string;
  body: string;
  sort_order: number;
  created_at: string;
}

interface CategoryRow {
  id: string;
  label: string;
  description: string | null;
  ratings: number[];
  sort_order: number;
}

interface RuleRow {
  rating: number;
  mode: "template" | "custom";
  allow_bulk: boolean;
  updated_at: string;
}

function configError(message: string, e: unknown): Error {
  const detail = e instanceof Error ? e.message : String(e);
  return new Error(`${message}: ${detail}`);
}

/** Read the full reply config from the tables, falling back to the defaults in
 *  constants.ts when a table is empty (e.g. before the seed script ran). */
export async function readStoredReplyConfig(): Promise<StoredReplyConfig> {
  const supabase = getSupabaseServerClient();

  const [{ data: templateRows, error: tErr }, { data: categoryRows, error: cErr }, { data: ruleRows, error: rErr }] =
    await Promise.all([
      supabase
        .from("reply_templates")
        .select("rating, category_id, body, sort_order, created_at")
        .order("category_id")
        .order("rating")
        .order("sort_order"),
      supabase
        .from("reply_categories")
        .select("id, label, description, ratings, sort_order")
        .order("sort_order"),
      supabase
        .from("rating_rules")
        .select("rating, mode, allow_bulk, updated_at")
        .order("rating"),
    ]);

  if (tErr) throw configError("Failed to read reply_templates", tErr);
  if (cErr) throw configError("Failed to read reply_categories", cErr);
  if (rErr) throw configError("Failed to read rating_rules", rErr);

  // Flatten template rows into {rating: {category: [body, …]}} preserving order.
  const templates: Record<string, Record<string, string[]>> = { 4: {}, 5: {} };
  const map = templates as unknown as ReplyTemplateMap;
  let updatedAt = 0;
  for (const row of (templateRows ?? []) as unknown as TemplateRow[]) {
    const list = ((map as Record<number, Record<string, string[]>>)[row.rating] ?? {})[row.category_id] ?? [];
    list.push(row.body);
    (map as Record<number, Record<string, string[]>>)[row.rating] = {
      ...(map as Record<number, Record<string, string[]>>)[row.rating],
      [row.category_id]: list,
    };
    const t = Date.parse(row.created_at);
    if (Number.isFinite(t) && t > updatedAt) updatedAt = t;
  }

  // Nothing stored yet (seed not run) → serve the constants defaults.
  const hasTemplates = (templateRows ?? []).length > 0;

  const categories: ReplyCategory[] =
    (categoryRows ?? []).length > 0
      ? ((categoryRows ?? []) as unknown as CategoryRow[]).map((row) => ({
          id: row.id,
          label: row.label,
          description: row.description ?? undefined,
          ratings: (row.ratings ?? [4, 5]) as ReplyCategory["ratings"],
        }))
      : REPLY_CATEGORIES;

  const rules = { ...DEFAULT_RATING_RULES };
  for (const row of (ruleRows ?? []) as unknown as RuleRow[]) {
    if ((row.rating as Rating) in rules) {
      rules[row.rating as Rating] = { mode: row.mode, allowBulk: row.allow_bulk };
      const t = Date.parse(row.updated_at);
      if (Number.isFinite(t) && t > updatedAt) updatedAt = t;
    }
  }

  return {
    templates: hasTemplates ? map : REPLY_TEMPLATES,
    rules,
    categories,
    updatedAt,
  };
}

/** Replace-all write: the UI edits whole lists, so the simplest faithful
 *  implementation is wipe + insert in one call path. Owner-only via API. */
export async function writeStoredReplyConfig(config: Pick<StoredReplyConfig, "templates" | "rules" | "categories">): Promise<void> {
  const supabase = getSupabaseServerClient();

  const templateRows: { rating: number; category_id: string; body: string; sort_order: number }[] = [];
  for (const ratingKey of ["4", "5"] as const) {
    const rating = Number(ratingKey);
    const byCategory = config.templates[ratingKey as "4" | "5"] ?? {};
    for (const [categoryId, bodies] of Object.entries(byCategory)) {
      (bodies ?? []).forEach((body, index) => {
        const text = (body ?? "").trim();
        if (!text) return;
        templateRows.push({ rating, category_id: categoryId, body: text, sort_order: (index + 1) * 10 });
      });
    }
  }

  // Templates first: removing a category from the UI would otherwise leave
  // orphan rows behind (FK CASCADE would also handle it, but the explicit
  // delete makes the wipe deterministic).
  const { error: tDelErr } = await supabase.from("reply_templates").delete().gte("sort_order", -1000);
  if (tDelErr) throw configError("Failed to clear reply_templates", tDelErr);

  const { error: rDelErr } = await supabase.from("rating_rules").delete().gte("rating", 0);
  if (rDelErr) throw configError("Failed to clear rating_rules", rDelErr);

  const { error: cDelErr } = await supabase.from("reply_categories").delete().gte("sort_order", -1000);
  if (cDelErr) throw configError("Failed to clear reply_categories", cDelErr);

  const categoryRows = config.categories.map((cat, index) => ({
    id: cat.id,
    label: cat.label,
    description: cat.description ?? null,
    ratings: cat.ratings ?? [4, 5],
    sort_order: (index + 1) * 10,
  }));

  const ruleRows = ([5, 4, 3, 2, 1] as Rating[]).map((rating) => ({
    rating,
    mode: config.rules[rating]?.mode ?? "custom",
    allow_bulk: config.rules[rating]?.allowBulk ?? false,
  }));

  const { error: cErr } = await supabase.from("reply_categories").insert(categoryRows);
  if (cErr) throw configError("Failed to write reply_categories", cErr);

  // Only insert templates whose category still exists — owner edits can
  // remove categories from the same save.
  const knownCategories = new Set(categoryRows.map((c) => c.id));
  const insertable = templateRows.filter((t) => knownCategories.has(t.category_id));
  if (insertable.length > 0) {
    const { error: tErr } = await supabase.from("reply_templates").insert(insertable);
    if (tErr) throw configError("Failed to write reply_templates", tErr);
  }

  const { error: rErr } = await supabase.from("rating_rules").insert(ruleRows);
  if (rErr) throw configError("Failed to write rating_rules", rErr);
}

/** ON/OFF switch for the daily auto-reply cron (Admin-visible automation). */
export async function readAutoSendEnabled(): Promise<boolean | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews_auto_config")
    .select("auto_send_enabled")
    .limit(1)
    .maybeSingle();
  if (error) throw configError("Failed to read reviews_auto_config", error);
  // sqlite-style "no row" → null so the route can distinguish un-seeded from OFF.
  return data ? data.auto_send_enabled === true : null;
}

export async function writeAutoSendEnabled(enabled: boolean): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data: existing, error: selErr } = await supabase
    .from("reviews_auto_config")
    .select("organization_id")
    .limit(1)
    .maybeSingle();
  if (selErr) throw configError("Failed to read reviews_auto_config", selErr);

  if (!existing) {
    // Default org (same insert pattern as the finance_sync_config migration).
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (!org?.id) throw new Error("No organization found — cannot store automation config");
    const { error: insErr } = await supabase
      .from("reviews_auto_config")
      .insert({ organization_id: org.id, auto_send_enabled: enabled });
    if (insErr) throw configError("Failed to write reviews_auto_config", insErr);
    return;
  }

  const { error } = await supabase
    .from("reviews_auto_config")
    .update({ auto_send_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("organization_id", existing.organization_id);
  if (error) throw configError("Failed to write reviews_auto_config", error);
}
