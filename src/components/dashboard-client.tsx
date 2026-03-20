"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Session } from "next-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DashboardFilters,
  getDefaultFilters,
  type DashboardFiltersState,
  type LocationOption,
} from "@/components/dashboard-filters";
import { ReviewListVirtual } from "@/components/review-list-virtual";
import { SyncButton } from "@/components/sync-button";
import {
  DEFAULT_RATING_RULES,
  DEFAULT_REPLY_CATEGORY_ID,
  LOCATION_NAMES,
  REPLY_CATEGORIES,
  REPLY_TEMPLATES,
  type Rating,
  type ReplyCategory,
  type RatingRule,
  type ReplyCategoryId,
  type ReplyTemplateMap,
  pickRandomTemplate,
} from "@/lib/constants";
import { dashboardStateStorageKey, selectedLocationsStorageKey } from "@/lib/storage-keys";
import type { ReviewWithLocation } from "@/types/review";
import { Loader2Icon, SlidersHorizontalIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const STAR_RATINGS = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
} as const;

function starNum(r: ReviewWithLocation): number {
  return STAR_RATINGS[r.starRating as keyof typeof STAR_RATINGS] ?? 0;
}

function readSavedLocationIds(storageKey: string): string[] | null {
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
  if (storageKey !== "capybara-selected-locations") {
    return tryKey("capybara-selected-locations");
  }
  return null;
}

function partitionReviews(reviews: ReviewWithLocation[]) {
  const five: ReviewWithLocation[] = [];
  const four: ReviewWithLocation[] = [];
  const three: ReviewWithLocation[] = [];
  const two: ReviewWithLocation[] = [];
  const one: ReviewWithLocation[] = [];
  for (const r of reviews) {
    const n = starNum(r);
    if (n === 5) five.push(r);
    else if (n === 4) four.push(r);
    else if (n === 3) three.push(r);
    else if (n === 2) two.push(r);
    else if (n === 1) one.push(r);
  }
  return { five, four, three, two, one };
}

interface DashboardClientProps {
  user: Session["user"] | null;
}

export function DashboardClient({ user }: DashboardClientProps) {
  const [reviews, setReviews] = useState<ReviewWithLocation[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyCategories, setReplyCategories] = useState<Record<string, ReplyCategoryId>>({});
  const [ratingRules, setRatingRules] = useState<Record<Rating, RatingRule>>(DEFAULT_RATING_RULES);
  const [templateConfig, setTemplateConfig] = useState<ReplyTemplateMap>(REPLY_TEMPLATES);
  const [sharedCategories, setSharedCategories] = useState<ReplyCategory[]>(REPLY_CATEGORIES);
  const [sharedConfigVersion, setSharedConfigVersion] = useState<number>(0);
  const [filters, setFilters] = useState<DashboardFiltersState>(() => getDefaultFilters());
  const [syncing, setSyncing] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{
    list: ReviewWithLocation[];
    label: string;
  } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

  const DASHBOARD_STATE_KEY = dashboardStateStorageKey(user?.email);
  const SELECTED_LOCATIONS_KEY = selectedLocationsStorageKey(user?.email);

  const [catalogLocations, setCatalogLocations] = useState<LocationOption[]>([]);
  const [selectionRevision, setSelectionRevision] = useState(0);

  useEffect(() => {
    const onFocus = () => setSelectionRevision((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/locations");
        if (!res.ok) return;
        const data = (await res.json()) as {
          locations?: { id: string; title: string }[];
        };
        if (cancelled) return;
        const list = (data.locations ?? []).filter(
          (l) => typeof l.id === "string" && l.id.length > 0
        );
        setCatalogLocations(list.map((l) => ({ id: l.id, title: l.title })));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  useEffect(() => {
    let frame: number;
    const duration = 450;
    const start = performance.now();
    const from = animatedTotal;
    const to = reviews.length;
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedTotal(Math.round(from + (to - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [reviews.length, animatedTotal]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(typeof window !== "undefined" && window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      const nextLoc =
        saved && saved.length > 0 ? new Set(saved) : new Set(fromReviews);
      setFilters((prev) => ({ ...prev, locations: nextLoc }));
    } catch {
      // ignore bad data
    }
  }, [reviews.length, setFilters, DASHBOARD_STATE_KEY, SELECTED_LOCATIONS_KEY]);

  // Hydrate shared config (templates/rules/categories) from server
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

  // If shared config changed since cached state, refresh auto-generated drafts.
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

  const handleSynced = useCallback((data: ReviewWithLocation[]) => {
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
    const nextLoc =
      saved && saved.length > 0 ? new Set(saved) : new Set(fromReviews);
    setFilters((prev) => ({ ...prev, locations: nextLoc }));
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
  }, [
    ratingRules,
    templateConfig,
    setFilters,
    DASHBOARD_STATE_KEY,
    SELECTED_LOCATIONS_KEY,
    sharedConfigVersion,
  ]);

  const handleReplySent = useCallback((reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.reviewId !== reviewId));
    setReplyDrafts((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });
  }, []);

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

  const setDraft = useCallback((reviewId: string, comment: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: comment }));
  }, []);

  const setCategory = useCallback((reviewId: string, category: ReplyCategoryId) => {
    setReplyCategories((prev) => ({ ...prev, [reviewId]: category }));
  }, []);

  const shuffleTemplateForReview = useCallback((reviewId: string) => {
    const review = reviews.find((r) => r.reviewId === reviewId);
    if (!review) return;
    const n = starNum(review);
    if (n !== 4 && n !== 5) return;
    const category = replyCategories[reviewId] ?? DEFAULT_REPLY_CATEGORY_ID;
    const nextTemplate = pickRandomTemplate(n as 4 | 5, category, templateConfig);
    setDraft(reviewId, nextTemplate);
  }, [reviews, replyCategories, templateConfig, setDraft]);

  /** Locations from reviews only (for merging titles) */
  const locationsFromReviews = useMemo((): LocationOption[] => {
    const seen = new Set<string>();
    const out: LocationOption[] = [];
    for (const r of reviews) {
      if (!seen.has(r.locationName)) {
        seen.add(r.locationName);
        out.push({ id: r.locationName, title: r.locationTitle });
      }
    }
    return out;
  }, [reviews]);

  /**
   * Sidebar: show every location saved in Config, even with zero unreplied reviews,
   * plus any review-only locations not in that list.
   */
  const filterLocationOptions = useMemo((): LocationOption[] => {
    const catalogMap = new Map(catalogLocations.map((l) => [l.id, l.title]));
    const reviewMap = new Map(locationsFromReviews.map((l) => [l.id, l.title]));

    const saved = readSavedLocationIds(SELECTED_LOCATIONS_KEY);

    const titleFor = (id: string) =>
      catalogMap.get(id) ??
      reviewMap.get(id) ??
      LOCATION_NAMES[id] ??
      id;

    if (saved && saved.length > 0) {
      const out: LocationOption[] = [];
      const seen = new Set<string>();
      for (const id of saved) {
        out.push({ id, title: titleFor(id) });
        seen.add(id);
      }
      for (const loc of locationsFromReviews) {
        if (!seen.has(loc.id)) {
          out.push(loc);
          seen.add(loc.id);
        }
      }
      return out;
    }

    return locationsFromReviews;
  }, [
    catalogLocations,
    locationsFromReviews,
    SELECTED_LOCATIONS_KEY,
    selectionRevision,
  ]);

  const filteredByLocation = useMemo(() => {
    if (filters.locations.size === 0) return [];
    return reviews.filter((r) => filters.locations.has(r.locationName));
  }, [reviews, filters.locations]);

  const total = reviews.length;
  const totalFiltered = filteredByLocation.length;

  const chronologicalList = useMemo(
    () =>
      sortOrder === "desc"
        ? filteredByLocation
        : [...filteredByLocation].slice().reverse(),
    [filteredByLocation, sortOrder]
  );

  const { five, four, three, two, one } = useMemo(
    () => partitionReviews(chronologicalList),
    [chronologicalList]
  );

  const fiveFiltered = filters.ratings.has("five") ? five : [];
  const fourFiltered = filters.ratings.has("four") ? four : [];
  const threeFiltered = filters.ratings.has("three") ? three : [];
  const twoFiltered = filters.ratings.has("two") ? two : [];
  const oneFiltered = filters.ratings.has("one") ? one : [];

  const allRatingsMode = filters.ratings.size === 5;
  const singleRatingMode = filters.ratings.size === 1;

  const applyLimit = useCallback(
    <T,>(list: T[]): T[] =>
      displayLimit == null ? list : list.slice(0, displayLimit),
    [displayLimit]
  );

  const displayedChronological = useMemo(
    () => applyLimit(chronologicalList),
    [chronologicalList, applyLimit]
  );

  const fiveInDisplay = useMemo(
    () => displayedChronological.filter((r) => starNum(r) === 5),
    [displayedChronological]
  );
  const fourInDisplay = useMemo(
    () => displayedChronological.filter((r) => starNum(r) === 4),
    [displayedChronological]
  );
  const attentionInDisplay = useMemo(
    () => displayedChronological.filter((r) => {
      const n = starNum(r);
      return n >= 1 && n <= 3;
    }),
    [displayedChronological]
  );

  const fiveDisplayed = singleRatingMode ? applyLimit(fiveFiltered) : fiveInDisplay;
  const fourDisplayed = singleRatingMode ? applyLimit(fourFiltered) : fourInDisplay;
  const attentionDisplayed = singleRatingMode
    ? applyLimit([...threeFiltered, ...twoFiltered, ...oneFiltered])
    : attentionInDisplay;

  const attentionWithRepliesInDisplay = useMemo(
    () =>
      attentionDisplayed.filter(
        (r) => (replyDrafts[r.reviewId] ?? "").trim().length > 0
      ),
    [attentionDisplayed, replyDrafts]
  );

  const getCommentForMixedList = useCallback(
    (reviewId: string) => {
      const d = replyDrafts[reviewId];
      if (d != null && d !== "") return d;
      const r = displayedChronological.find((x) => x.reviewId === reviewId);
      if (!r) return "";
      const n = starNum(r);
      if (n === 5 || n === 4) {
        const category = replyCategories[r.reviewId] ?? DEFAULT_REPLY_CATEGORY_ID;
        const rule = ratingRules[n as Rating];
        if (rule?.mode === "template") {
          return pickRandomTemplate(n as 4 | 5, category, templateConfig);
        }
        return "";
      }
      return "";
    },
    [replyDrafts, replyCategories, ratingRules, templateConfig, displayedChronological]
  );

  const hasAnyFiltered =
    fiveFiltered.length +
      fourFiltered.length +
      threeFiltered.length +
      twoFiltered.length +
      oneFiltered.length >
    0;


  const handleBulkSend = useCallback(
    async (list: ReviewWithLocation[]) => {
      const count = list.length;
      if (count === 0) return;
      setBulkSending(true);
      setBulkProgress({ current: 0, total: list.length });
      let done = 0;
      const failed: string[] = [];
      for (const r of list) {
        const comment = replyDrafts[r.reviewId]?.trim();
        setBulkProgress({ current: done + 1, total: list.length });
        if (!comment) {
          failed.push(r.reviewId);
          toast.error(`Empty reply for review ${r.reviewId}`);
          done += 1;
          continue;
        }
        try {
          const res = await fetch("/api/reviews/reply", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locationName: r.locationName,
              reviewId: r.reviewId,
              comment,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            failed.push(r.reviewId);
            toast.error(`Failed: ${(err as { error?: string }).error ?? res.statusText}`);
          } else {
            toast.success("Reply sent");
            handleReplySent(r.reviewId);
          }
        } catch (e) {
          failed.push(r.reviewId);
          toast.error(e instanceof Error ? e.message : "Request failed");
        }
        done += 1;
      }
      setBulkProgress(null);
      setBulkSending(false);
      if (failed.length > 0) {
        toast.error(`${failed.length} reply(ies) failed. Others were sent.`);
      }
    },
    [handleReplySent, replyDrafts]
  );

  const openBulkConfirm = useCallback((list: ReviewWithLocation[], label: string) => {
    if (bulkSending || list.length === 0) return;
    setBulkConfirm({ list, label });
  }, [bulkSending]);

  const moodEmoji =
    total === 0 ? "🥳" : total <= 25 ? "🙂" : total <= 150 ? "😅" : "😬";

  return (
        <>
          <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Mobile filters: only show after sync */}
              {total > 0 && (
              <Sheet>
                <SheetTrigger
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background hover:bg-muted hover:text-foreground md:hidden"
                >
                  <SlidersHorizontalIcon className="size-4" />
                  Filters
                  {totalFiltered < total && (
                    <span className="text-muted-foreground">({totalFiltered})</span>
                  )}
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px]">
                  <div className="py-4">
                    <h2 className="mb-4 text-sm font-medium">Filters</h2>
                    <DashboardFilters filters={filters} onChange={setFilters} locations={filterLocationOptions} />
                  </div>
                </SheetContent>
              </Sheet>
              )}
            </div>
          </div>

          {total > 0 && (
            <div className="mt-4 grid gap-x-5 gap-y-3 md:grid-cols-[260px_minmax(0,1fr)]">
              {/* Row 1: stats spans full width */}
              <div className="dashboard-stats-wrapper flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm md:col-span-2">
                <div className="dashboard-stats">
                  <span className="dashboard-stat-item">
                    <span aria-hidden className="text-lg">
                      {moodEmoji}
                    </span>
                    <strong>{animatedTotal.toLocaleString()}</strong> unreplied
                  </span>
                  <span className="dashboard-stat-sep" aria-hidden />
                  <span className="dashboard-stat-item" data-variant="success">
                    5★ <strong>{five.length.toLocaleString()}</strong>
                  </span>
                  <span className="dashboard-stat-sep" aria-hidden />
                  <span className="dashboard-stat-item" data-variant="amber">
                    4★ <strong>{four.length.toLocaleString()}</strong>
                  </span>
                  <span className="dashboard-stat-sep" aria-hidden />
                  <span className="dashboard-stat-item" data-variant="attention">
                    3★ <strong>{three.length.toLocaleString()}</strong>
                  </span>
                  <span className="dashboard-stat-sep" aria-hidden />
                  <span className="dashboard-stat-item" data-variant="attention">
                    2★ <strong>{two.length.toLocaleString()}</strong>
                  </span>
                  <span className="dashboard-stat-sep" aria-hidden />
                  <span className="dashboard-stat-item" data-variant="attention">
                    1★ <strong>{one.length.toLocaleString()}</strong>
                  </span>
                </div>
                <SyncButton
                  onSynced={handleSynced}
                  syncing={syncing}
                  setSyncing={setSyncing}
                  size="sm"
                  userEmail={user?.email}
                />
              </div>

              {/* Row 2: labels/controls headers aligned */}
              <div className="hidden md:flex md:items-center">
                <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Filters
                </h2>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-muted-foreground text-sm">
                    Reply to{" "}
                    {allRatingsMode
                      ? displayedChronological.length
                      : fiveDisplayed.length + fourDisplayed.length + attentionDisplayed.length}{" "}
                    reviews
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-md border-border bg-card text-foreground hover:bg-card/80"
                    onClick={() =>
                      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
                    }
                  >
                    <ArrowUpDownIcon className="size-4" />
                    <span className="text-xs">
                      {sortOrder === "desc" ? "Newest first" : "Oldest first"}
                    </span>
                  </Button>
                  <span className="text-muted-foreground text-sm">Limit:</span>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={displayLimit == null ? "all" : String(displayLimit)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDisplayLimit(value === "all" ? null : Number(value));
                    }}
                    aria-label="Select review display limit"
                  >
                    {LIMIT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                    <option value="all">All</option>
                  </select>
                </div>
                {allRatingsMode && (
                  <div className="flex flex-wrap items-center gap-2">
                    {fiveInDisplay.length > 0 && ratingRules[5]?.allowBulk && (
                      <Button
                        onClick={() => openBulkConfirm(fiveInDisplay, "5★")}
                        disabled={bulkSending}
                        size="sm"
                        className="rounded-md gap-1.5 bg-[var(--success)] text-primary-foreground hover:opacity-90"
                      >
                        Send all {fiveInDisplay.length} (5★)
                      </Button>
                    )}
                    {fourInDisplay.length > 0 && ratingRules[4]?.allowBulk && (
                      <Button
                        onClick={() => openBulkConfirm(fourInDisplay, "4★")}
                        disabled={bulkSending}
                        size="sm"
                        className="rounded-md gap-1.5 bg-[var(--amber)] text-black/90 hover:opacity-90"
                      >
                        Send all {fourInDisplay.length} (4★)
                      </Button>
                    )}
                    <Button
                      onClick={() => openBulkConfirm(attentionWithRepliesInDisplay, "1–3★")}
                      disabled={bulkSending || attentionWithRepliesInDisplay.length === 0}
                      size="sm"
                      className="rounded-md gap-1.5 bg-[color-mix(in oklch, var(--destructive) 16%, transparent)] text-[var(--destructive)] transition-colors hover:bg-[color-mix(in oklch, var(--destructive) 26%, transparent)] hover:text-[color-mix(in oklch, var(--destructive) 88%, black)] disabled:opacity-50"
                    >
                      Send all {attentionWithRepliesInDisplay.length} (1–3★)
                    </Button>
                  </div>
                )}
                {singleRatingMode &&
                  filters.ratings.has("five") &&
                  fiveDisplayed.length > 0 &&
                  ratingRules[5]?.allowBulk && (
                    <Button
                      onClick={() => openBulkConfirm(fiveDisplayed, "5★")}
                      disabled={bulkSending}
                      size="sm"
                      className="rounded-md gap-1.5 bg-[var(--success)] text-primary-foreground hover:opacity-90"
                    >
                      Send all {fiveDisplayed.length} replies
                    </Button>
                  )}
                {singleRatingMode &&
                  filters.ratings.has("four") &&
                  fourDisplayed.length > 0 &&
                  ratingRules[4]?.allowBulk && (
                    <Button
                      onClick={() => openBulkConfirm(fourDisplayed, "4★")}
                      disabled={bulkSending}
                      size="sm"
                      className="rounded-md gap-1.5 bg-[var(--amber)] text-black/90 hover:opacity-90"
                    >
                      Send all {fourDisplayed.length} replies
                    </Button>
                  )}
                {singleRatingMode &&
                  (filters.ratings.has("one") ||
                    filters.ratings.has("two") ||
                    filters.ratings.has("three")) && (
                    <Button
                      onClick={() => openBulkConfirm(attentionWithRepliesInDisplay, "1–3★")}
                      disabled={bulkSending || attentionWithRepliesInDisplay.length === 0}
                      size="sm"
                      className="rounded-md gap-1.5 bg-[color-mix(in oklch, var(--destructive) 16%, transparent)] text-[var(--destructive)] transition-colors hover:bg-[color-mix(in oklch, var(--destructive) 26%, transparent)] hover:text-[color-mix(in oklch, var(--destructive) 88%, black)] disabled:opacity-50"
                    >
                      Send all {attentionWithRepliesInDisplay.length} replies
                    </Button>
                  )}
              </div>

              {/* Row 3: actual filter panel + reviews content */}
              <aside className="space-y-3">
                <div className="rounded-lg border border-border bg-card/60 px-3 py-3">
                  <DashboardFilters
                    filters={filters}
                    onChange={setFilters}
                    locations={filterLocationOptions}
                  />
                </div>
              </aside>
              <div className="space-y-6">
                {hasAnyFiltered ? (
                  <>
                    {allRatingsMode ? (
                      <ReviewListVirtual
                        reviews={displayedChronological}
                        getComment={getCommentForMixedList}
                        onCommentChange={setDraft}
                        onReplySent={handleReplySent}
                        variant="success"
                        getVariant={(r) =>
                          starNum(r) === 5
                            ? "success"
                            : starNum(r) === 4
                              ? "amber"
                              : "attention"
                        }
                        getCategory={(id) => replyCategories[id] ?? DEFAULT_REPLY_CATEGORY_ID}
                        onCategoryChange={(id, category) => {
                          setCategory(id, category);
                          const review = displayedChronological.find((r) => r.reviewId === id);
                          if (!review) return;
                          const n = starNum(review);
                          if (n === 5 || n === 4) {
                            const nextTemplate = pickRandomTemplate(n as 4 | 5, category);
                            setDraft(id, nextTemplate);
                          }
                        }}
                        onShuffleTemplate={shuffleTemplateForReview}
                        categories={sharedCategories}
                      />
                    ) : (
                      <>
                        {fiveFiltered.length > 0 && filters.ratings.has("five") && (
                          <section className="space-y-4" aria-label="5 star reviews">
                            <ReviewListVirtual
                              reviews={fiveDisplayed}
                              getComment={(id) => {
                                const existing = replyDrafts[id];
                                if (existing != null && existing !== "") return existing;
                                const category = replyCategories[id] ?? DEFAULT_REPLY_CATEGORY_ID;
                                return pickRandomTemplate(5, category);
                              }}
                              onCommentChange={setDraft}
                              onReplySent={handleReplySent}
                              variant="success"
                              getCategory={(id) =>
                                replyCategories[id] ?? DEFAULT_REPLY_CATEGORY_ID
                              }
                              onCategoryChange={(id, category) => {
                                setCategory(id, category);
                                const review = fiveDisplayed.find((r) => r.reviewId === id);
                                if (!review) return;
                                const nextTemplate = pickRandomTemplate(5, category);
                                setDraft(id, nextTemplate);
                              }}
                              onShuffleTemplate={shuffleTemplateForReview}
                              categories={sharedCategories}
                            />
                          </section>
                        )}
                        {fourFiltered.length > 0 && filters.ratings.has("four") && (
                          <section className="space-y-4" aria-label="4 star reviews">
                            <ReviewListVirtual
                              reviews={fourDisplayed}
                              getComment={(id) => {
                                const existing = replyDrafts[id];
                                if (existing != null && existing !== "") return existing;
                                const category = replyCategories[id] ?? DEFAULT_REPLY_CATEGORY_ID;
                                return pickRandomTemplate(4, category);
                              }}
                              onCommentChange={setDraft}
                              onReplySent={handleReplySent}
                              variant="amber"
                              getCategory={(id) =>
                                replyCategories[id] ?? DEFAULT_REPLY_CATEGORY_ID
                              }
                              onCategoryChange={(id, category) => {
                                setCategory(id, category);
                                const review = fourDisplayed.find((r) => r.reviewId === id);
                                if (!review) return;
                                const nextTemplate = pickRandomTemplate(4, category);
                                setDraft(id, nextTemplate);
                              }}
                              onShuffleTemplate={shuffleTemplateForReview}
                              categories={sharedCategories}
                            />
                          </section>
                        )}
                        {(threeFiltered.length + twoFiltered.length + oneFiltered.length > 0) &&
                          (filters.ratings.has("one") ||
                            filters.ratings.has("two") ||
                            filters.ratings.has("three")) && (
                            <section className="space-y-4" aria-label="1-3 star reviews">
                              <ReviewListVirtual
                                reviews={attentionDisplayed}
                                getComment={(id) => replyDrafts[id] ?? ""}
                                onCommentChange={setDraft}
                                onReplySent={handleReplySent}
                                variant="attention"
                              />
                            </section>
                          )}
                      </>
                    )}
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No reviews match the current filters.
                  </p>
                )}
              </div>
            </div>
          )}

          {total === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <p className="text-muted-foreground">
                  {syncing ? "Fetching reviews…" : "No reviews loaded."}
                </p>
                {!syncing && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      Using Google account{" "}
                      <span className="font-medium text-foreground">
                        {user?.email ?? "unknown"}
                      </span>
                      .
                    </p>
                    <p>
                      Click &quot;Sync reviews&quot; to fetch unreplied reviews from all locations this
                      account manages.
                    </p>
                  </div>
                )}
                <SyncButton
                  onSynced={handleSynced}
                  syncing={syncing}
                  setSyncing={setSyncing}
                  userEmail={user?.email}
                />
              </CardContent>
            </Card>
          )}
        </>
  );
}
