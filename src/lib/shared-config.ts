import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DEFAULT_RATING_RULES,
  REPLY_CATEGORIES,
  REPLY_TEMPLATES,
  type Rating,
  type RatingRule,
  type ReplyCategory,
  type ReplyTemplateMap,
} from "@/lib/constants";

export interface SharedConfig {
  templates: ReplyTemplateMap;
  rules: Record<Rating, RatingRule>;
  categories: ReplyCategory[];
  updatedAt: number;
}

const dataDir = path.join(process.cwd(), "data");
const configPath = path.join(dataDir, "shared-config.json");

const defaultSharedConfig: SharedConfig = {
  templates: REPLY_TEMPLATES,
  rules: DEFAULT_RATING_RULES,
  categories: REPLY_CATEGORIES,
  updatedAt: 0,
};

export async function readSharedConfig(): Promise<SharedConfig> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SharedConfig>;
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
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
}

