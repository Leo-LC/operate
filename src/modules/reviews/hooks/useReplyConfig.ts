"use client";
import { useState, useEffect } from "react";
import {
  DEFAULT_RATING_RULES,
  REPLY_CATEGORIES,
  REPLY_TEMPLATES,
  type Rating,
  type ReplyCategory,
  type RatingRule,
  type ReplyTemplateMap,
} from "@/lib/constants";

export interface ReplyConfig {
  ratingRules: Record<Rating, RatingRule>;
  templateConfig: ReplyTemplateMap;
  sharedCategories: ReplyCategory[];
  sharedConfigVersion: number;
}

export function useReplyConfig(): ReplyConfig {
  const [ratingRules, setRatingRules] = useState<Record<Rating, RatingRule>>(DEFAULT_RATING_RULES);
  const [templateConfig, setTemplateConfig] = useState<ReplyTemplateMap>(REPLY_TEMPLATES);
  const [sharedCategories, setSharedCategories] = useState<ReplyCategory[]>(REPLY_CATEGORIES);
  const [sharedConfigVersion, setSharedConfigVersion] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config/shared");
        if (!res.ok) return;
        const data = (await res.json()) as {
          templates?: ReplyTemplateMap;
          rules?: Record<Rating, RatingRule>;
          categories?: ReplyCategory[];
          updatedAt?: number;
        };
        if (cancelled) return;
        if (data.templates) setTemplateConfig(data.templates);
        if (data.rules) setRatingRules(data.rules);
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setSharedCategories(data.categories);
        }
        if (typeof data.updatedAt === "number") {
          setSharedConfigVersion(data.updatedAt);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ratingRules, templateConfig, sharedCategories, sharedConfigVersion };
}
