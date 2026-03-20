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

  const { error } = await supabase
    .from("shared_config")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to write shared_config to Supabase:", error);
    throw error;
  }
}

