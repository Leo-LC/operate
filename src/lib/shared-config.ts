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

export interface SharedConfig {
  templates: ReplyTemplateMap;
  rules: Record<Rating, RatingRule>;
  categories: ReplyCategory[];
  updatedAt: number;
}

const defaultSharedConfig: SharedConfig = {
  templates: REPLY_TEMPLATES,
  rules: DEFAULT_RATING_RULES,
  categories: REPLY_CATEGORIES,
  updatedAt: 0,
};

export async function readSharedConfig(): Promise<SharedConfig> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("shared_config")
      .select("templates, rules, categories, updated_at")
      .limit(1)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to read shared_config from Supabase:", error);
      return defaultSharedConfig;
    }

    if (!data) {
      return defaultSharedConfig;
    }

    const parsed = {
      templates: data.templates,
      rules: data.rules,
      categories: data.categories,
      updatedAt: data.updated_at
        ? new Date(data.updated_at as string).getTime()
        : 0,
    } as Partial<SharedConfig>;

    return {
      templates: (parsed.templates ?? REPLY_TEMPLATES) as ReplyTemplateMap,
      rules: (parsed.rules ?? DEFAULT_RATING_RULES) as Record<Rating, RatingRule>,
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? (parsed.categories as ReplyCategory[])
          : REPLY_CATEGORIES,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return defaultSharedConfig;
  }
}

export async function writeSharedConfig(config: SharedConfig): Promise<void> {
  const supabase = getSupabaseServerClient();

  const payload = {
    templates: config.templates,
    rules: config.rules,
    categories: config.categories,
    updated_at: new Date(config.updatedAt || Date.now()).toISOString(),
  };

  // shared_config is a singleton table (enforced by a unique index on a
  // constant expression), so there is always at most one row. Update it by
  // id rather than upserting, since a fresh insert without an id would
  // collide with that singleton constraint instead of the id conflict
  // target.
  const { data: existing, error: selectError } = await supabase
    .from("shared_config")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (selectError) {
    // eslint-disable-next-line no-console
    console.error("Failed to read shared_config id from Supabase:", selectError);
    throw selectError;
  }

  const { error } = existing
    ? await supabase.from("shared_config").update(payload).eq("id", existing.id)
    : await supabase.from("shared_config").insert(payload);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to write shared_config to Supabase:", error);
    throw error;
  }
}

