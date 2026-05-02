"use client";
import { useState, useCallback, useEffect } from "react";
import {
  DEFAULT_REPLY_CATEGORY_ID,
  type Rating,
  type RatingRule,
  type ReplyCategoryId,
  type ReplyTemplateMap,
  pickRandomTemplate,
} from "@/lib/constants";
import { dashboardStateStorageKey, selectedLocationsStorageKey } from "@/lib/storage-keys";
import type { ReviewWithLocation } from "@/types/review";

const STAR_RATINGS = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
} as const;

export function starNum(r: ReviewWithLocation): number {
  return STAR_RATINGS[r.starRating as keyof typeof STAR_RATINGS] ?? 0;
}

export function readSavedLocationIds(storageKey: string): string[] | null {
  if (typeof window === "undefined") return null;
  const tryKey = (key: string): string[] | null => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const arr = JSON.parse(raw) as string[];
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const ids = arr.filter((x) => typeof x === "string" && x.trim().length > 0);
      return ids.length > 0 ? ids : null;
    } catch {
      return null;
    }
  };
  const scoped = tryKey(storageKey);
  if (scoped) return scoped;
  // Fall back to legacy unscoped key for users upgrading from pre-email-scoped storage
  if (storageKey !== "capybara-selected-locations") {
    return tryKey("capybara-selected-locations");
  }
  return null;
}

interface UseReviewsParams {
  email: string | null | undefined;
  ratingRules: Record<Rating, RatingRule>;
  templateConfig: ReplyTemplateMap;
  sharedConfigVersion: number;
  /** Called with the initial location set after hydration or sync, so the
   *  component can update its filter state. Must be a stable reference. */
  onLocationsReady?: (locations: Set<string>) => void;
}

export interface UseReviewsReturn {
  reviews: ReviewWithLocation[];
  replyDrafts: Record<string, string>;
  replyCategories: Record<string, ReplyCategoryId>;
  handleSynced: (data: ReviewWithLocation[]) => void;
  handleReplySent: (reviewId: string) => void;
  setDraft: (reviewId: string, comment: string) => void;
  setCategory: (reviewId: string, category: ReplyCategoryId) => void;
  shuffleTemplateForReview: (reviewId: string) => void;
}

export function useReviews({
  email,
  ratingRules,
  templateConfig,
  sharedConfigVersion,
  onLocationsReady,
}: UseReviewsParams): UseReviewsReturn {
  const [reviews, setReviews] = useState<ReviewWithLocation[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyCategories, setReplyCategories] = useState<Record<string, ReplyCategoryId>>({});

  const DASHBOARD_STATE_KEY = dashboardStateStorageKey(email);
  const SELECTED_LOCATIONS_KEY = selectedLocationsStorageKey(email);

  // Hydrate from localStorage so syncing isn't required every time you return
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reviews.length > 0) return;
    try {
      const raw = window.localStorage.getItem(DASHBOARD_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        reviews: ReviewWithLocation[];
        replyDrafts: Record<string, string>;
        replyCategories?: Record<string, ReplyCategoryId>;
        timestamp: number;
        configVersion?: number;
      };
      const maxAgeMs = 30 * 60 * 1000;
      if (!parsed.timestamp || Date.now() - parsed.timestamp > maxAgeMs) return;
      if (!Array.isArray(parsed.reviews) || parsed.reviews.length === 0) return;
      setReviews(parsed.reviews);
      setReplyDrafts(parsed.replyDrafts ?? {});
      setReplyCategories(parsed.replyCategories ?? {});
      const fromReviews = Array.from(new Set(parsed.reviews.map((r) => r.locationName)));
      const saved = readSavedLocationIds(SELECTED_LOCATIONS_KEY);
      const nextLoc = saved && saved.length > 0 ? new Set(saved) : new Set(fromReviews);
      onLocationsReady?.(nextLoc);
    } catch {
      // ignore bad data
    }
  }, [reviews.length, DASHBOARD_STATE_KEY, SELECTED_LOCATIONS_KEY, onLocationsReady]);

  // If shared config changed since cached state, refresh auto-generated drafts
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reviews.length === 0) return;
    if (!sharedConfigVersion) return;
    try {
      const raw = window.localStorage.getItem(DASHBOARD_STATE_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as { configVersion?: number; replyCategories?: Record<string, ReplyCategoryId> })
        : null;
      if (parsed?.configVersion === sharedConfigVersion) return;

      const nextDrafts: Record<string, string> = {};
      for (const r of reviews) {
        const n = starNum(r);
        if (n === 5 || n === 4) {
          const rule = ratingRules[n as Rating];
          if (rule?.mode === "template") {
            const category = replyCategories[r.reviewId] ?? DEFAULT_REPLY_CATEGORY_ID;
            nextDrafts[r.reviewId] = pickRandomTemplate(n as 4 | 5, category, templateConfig);
          } else {
            nextDrafts[r.reviewId] = replyDrafts[r.reviewId] ?? "";
          }
        } else {
          nextDrafts[r.reviewId] = replyDrafts[r.reviewId] ?? "";
        }
      }
      setReplyDrafts(nextDrafts);
      window.localStorage.setItem(
        DASHBOARD_STATE_KEY,
        JSON.stringify({
          reviews,
          replyDrafts: nextDrafts,
          replyCategories,
          timestamp: Date.now(),
          configVersion: sharedConfigVersion,
        })
      );
    } catch {
      // ignore
    }
  }, [
    DASHBOARD_STATE_KEY,
    replyCategories,
    replyDrafts,
    reviews,
    ratingRules,
    sharedConfigVersion,
    templateConfig,
  ]);

  // Persist drafts/categories with a small debounce to avoid excessive writes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reviews.length === 0) return;
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(
        DASHBOARD_STATE_KEY,
        JSON.stringify({
          reviews,
          replyDrafts,
          replyCategories,
          timestamp: Date.now(),
          configVersion: sharedConfigVersion,
        })
      );
    }, 400);
    return () => window.clearTimeout(handle);
  }, [reviews, replyDrafts, replyCategories, DASHBOARD_STATE_KEY, sharedConfigVersion]);

  const handleSynced = useCallback(
    (data: ReviewWithLocation[]) => {
      const sorted = [...data].sort((a, b) => {
        const aTime = a.createTime ? Date.parse(a.createTime as string) : 0;
        const bTime = b.createTime ? Date.parse(b.createTime as string) : 0;
        return bTime - aTime;
      });
      setReviews(sorted);
      const initialDrafts: Record<string, string> = {};
      const initialCategories: Record<string, ReplyCategoryId> = {};
      for (const r of sorted) {
        const n = starNum(r);
        if (n === 5 || n === 4) {
          const rule = ratingRules[n as Rating];
          if (rule?.mode === "template") {
            initialDrafts[r.reviewId] = pickRandomTemplate(
              n as 4 | 5,
              DEFAULT_REPLY_CATEGORY_ID,
              templateConfig
            );
            initialCategories[r.reviewId] = DEFAULT_REPLY_CATEGORY_ID;
          } else {
            initialDrafts[r.reviewId] = "";
          }
        } else {
          initialDrafts[r.reviewId] = "";
        }
      }
      setReplyDrafts(initialDrafts);
      setReplyCategories(initialCategories);
      const fromReviews = Array.from(new Set(sorted.map((r) => r.locationName)));
      const saved = readSavedLocationIds(SELECTED_LOCATIONS_KEY);
      const nextLoc = saved && saved.length > 0 ? new Set(saved) : new Set(fromReviews);
      onLocationsReady?.(nextLoc);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          DASHBOARD_STATE_KEY,
          JSON.stringify({
            reviews: sorted,
            replyDrafts: initialDrafts,
            replyCategories: initialCategories,
            timestamp: Date.now(),
            configVersion: sharedConfigVersion,
          })
        );
      }
    },
    [
      ratingRules,
      templateConfig,
      DASHBOARD_STATE_KEY,
      SELECTED_LOCATIONS_KEY,
      sharedConfigVersion,
      onLocationsReady,
    ]
  );

  const handleReplySent = useCallback((reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.reviewId !== reviewId));
    setReplyDrafts((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });
  }, []);

  const setDraft = useCallback((reviewId: string, comment: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: comment }));
  }, []);

  const setCategory = useCallback((reviewId: string, category: ReplyCategoryId) => {
    setReplyCategories((prev) => ({ ...prev, [reviewId]: category }));
  }, []);

  const shuffleTemplateForReview = useCallback(
    (reviewId: string) => {
      const review = reviews.find((r) => r.reviewId === reviewId);
      if (!review) return;
      const n = starNum(review);
      if (n !== 4 && n !== 5) return;
      const category = replyCategories[reviewId] ?? DEFAULT_REPLY_CATEGORY_ID;
      const nextTemplate = pickRandomTemplate(n as 4 | 5, category, templateConfig);
      setDraft(reviewId, nextTemplate);
    },
    [reviews, replyCategories, templateConfig, setDraft]
  );

  return {
    reviews,
    replyDrafts,
    replyCategories,
    handleSynced,
    handleReplySent,
    setDraft,
    setCategory,
    shuffleTemplateForReview,
  };
}
