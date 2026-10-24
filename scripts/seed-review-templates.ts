import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import {
  REPLY_CATEGORIES,
  REPLY_TEMPLATES,
  DEFAULT_RATING_RULES,
} from "../src/lib/constants";

// One-off script: seeds the reply system's baseline into its real tables
// (migration 20261024000000) — reply_categories, reply_templates (30 generic
// per rating, star-only texts, and the specialized themes), rating_rules.
// Run with: npx tsx scripts/seed-review-templates.ts
//
// After this, edit templates in the UI (Reviews → Templates) — the app reads
// and writes rows, not the legacy shared_config blob.

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.SUPABASE_URL ?? "", env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false },
  });

  // 1. Categories (upsert so re-running refreshes labels/descriptions).
  const categoryRows = REPLY_CATEGORIES.map((cat, index) => ({
    id: cat.id,
    label: cat.label,
    description: cat.description ?? null,
    ratings: cat.ratings ?? [4, 5],
    sort_order: (index + 1) * 10,
  }));
  {
    const { error } = await supabase.from("reply_categories").upsert(categoryRows);
    if (error) throw error;
  }
  console.log(`reply_categories upserted (${categoryRows.length} rows).`);

  // 2. Templates — replace-all with the seed baseline from constants.ts.
  const templateRows: { rating: number; category_id: string; body: string; sort_order: number }[] = [];
  for (const ratingKey of ["4", "5"] as const) {
    const rating = Number(ratingKey);
    const byCategory = REPLY_TEMPLATES[ratingKey as "4" | "5"];
    for (const [categoryId, bodies] of Object.entries(byCategory)) {
      (bodies ?? []).forEach((body, index) => {
        const text = (body ?? "").trim();
        if (!text) return;
        templateRows.push({ rating, category_id: categoryId, body: text, sort_order: (index + 1) * 10 });
      });
    }
  }
  {
    const { error: delErr } = await supabase.from("reply_templates").delete().gte("sort_order", -1000);
    if (delErr) throw delErr;
  }
  {
    const { error } = await supabase.from("reply_templates").insert(templateRows);
    if (error) throw error;
  }
  console.log(`reply_templates seeded (${templateRows.length} rows).`);

  // 3. Rules — defaults (template for 5/4, custom + no bulk for 1–3).
  const ruleRows = ([5, 4, 3, 2, 1] as const).map((rating) => ({
    rating,
    mode: DEFAULT_RATING_RULES[rating].mode,
    allow_bulk: DEFAULT_RATING_RULES[rating].allowBulk,
  }));
  {
    const { error } = await supabase.from("rating_rules").upsert(ruleRows);
    if (error) throw error;
  }
  console.log(`rating_rules upserted (${ruleRows.length} rows).`);
}

void main();
