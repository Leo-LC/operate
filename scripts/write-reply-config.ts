import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import {
  REPLY_CATEGORIES,
  REPLY_TEMPLATES,
  DEFAULT_RATING_RULES,
} from "../src/lib/constants";

// One-off script: push the reply templates / categories / rating rules that
// live in src/lib/constants.ts into the shared Supabase `shared_config` row
// (the same singleton the /api/config/shared PUT endpoint writes to).
// Run with: npx tsx scripts/write-reply-config.ts

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

  const { data: existing, error: selectError } = await supabase
    .from("shared_config")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;

  const payload = {
    templates: REPLY_TEMPLATES,
    rules: DEFAULT_RATING_RULES,
    categories: REPLY_CATEGORIES,
    updated_at: new Date().toISOString(),
  };

  const { error } = existing
    ? await supabase.from("shared_config").update(payload).eq("id", existing.id)
    : await supabase.from("shared_config").insert(payload);

  if (error) throw error;

  console.log("shared_config reply templates written.");
}

void main();
