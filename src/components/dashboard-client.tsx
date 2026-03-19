"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
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
  REPLY_TEMPLATES,
  type Rating,
  type RatingRule,
  type ReplyCategoryId,
  type ReplyTemplateMap,
  pickRandomTemplate,
} from "@/lib/constants";
import { dashboardStateStorageKey, selectedLocationsStorageKey } from "@/lib/storage-keys";
import type { ReviewWithLocation } from "@/types/review";
import { LogOutIcon, Loader2Icon, SlidersHorizontalIcon, SettingsIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
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
  const [filters, setFilters] = useState<DashboardFiltersState>(() => getDefaultFilters());
  const [syncing, setSyncing] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const LIMIT_OPTIONS = [50, 100] as const;

  const RATING_RULES_KEY = "capybara-rating-rules-v1";
  const TEMPLATE_CONFIG_KEY = "capybara-template-config-v1";
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
  }, [reviews.length]);

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

  // Hydrate rating rules and template overrides from config screen
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawRules = window.localStorage.getItem(RATING_RULES_KEY);
      if (rawRules) {
        const parsed = JSON.parse(rawRules) as Record<Rating, RatingRule>;
        setRatingRules((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
    try {
      const rawTemplates = window.localStorage.getItem(TEMPLATE_CONFIG_KEY);
      if (rawTemplates) {
        const parsed = JSON.parse(rawTemplates) as ReplyTemplateMap;
        setTemplateConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

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
        })
      );
    }
  }, [ratingRules, templateConfig, setFilters, DASHBOARD_STATE_KEY, SELECTED_LOCATIONS_KEY]);

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
        })
      );
    }, 400);
    return () => window.clearTimeout(handle);
  }, [reviews, replyDrafts, replyCategories, DASHBOARD_STATE_KEY]);

  const setDraft = useCallback((reviewId: string, comment: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: comment }));
  }, []);

  const setCategory = useCallback((reviewId: string, category: ReplyCategoryId) => {
    setReplyCategories((prev) => ({ ...prev, [reviewId]: category }));
  }, []);

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
      if (typeof window !== "undefined") {
        const count = list.length;
        if (
          count === 0 ||
          !window.confirm(
            `Send bulk replies to ${count} review${count === 1 ? "" : "s"}?`
          )
        ) {
          return;
        }
      }
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

  const moodEmoji =
    total === 0 ? "🥳" : total <= 25 ? "🙂" : total <= 150 ? "😅" : "😬";

  const filtersSidebar = (
    <div className="flex w-56 shrink-0 flex-col px-4 pt-6 pb-10">
      <h2 className="mb-3 text-sm font-medium">Filters</h2>
      <DashboardFilters filters={filters} onChange={setFilters} locations={filterLocationOptions} />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">Capybara Coffee</span>
            <span className="text-muted-foreground hidden text-sm sm:inline">GBP Review Manager</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-2 py-1">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">
                  {user?.email?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[160px] truncate text-[11px] text-muted-foreground">
                {user?.email ?? "unknown"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="gap-1.5 rounded-full px-3 text-xs sm:text-sm transition-colors hover:bg-muted/70"
            >
              <LogOutIcon className="size-4" />
              Sign out
            </Button>
          </nav>
        </div>
        {/* Secondary navbar */}
        <div className="border-t border-border bg-background/95">
          <div className="mx-auto flex h-9 max-w-6xl items-center gap-2 px-4 text-xs">
            <Link href="/dashboard">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 rounded-full px-3 text-xs"
                aria-current="page"
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/config">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-full px-3 text-xs"
              >
                Reply templates
              </Button>
            </Link>
            <Link href="/dashboard/config?tab=rules">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-full px-3 text-xs"
              >
                Rating rules
              </Button>
            </Link>
            <Link href="/dashboard/config?tab=locations">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-full px-3 text-xs"
              >
                Locations
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-6xl flex-1">
        {/* Desktop sidebar: sticky under navbar, only after sync */}
        {total > 0 && (
          <aside className="dashboard-sidebar hidden border-r border-border md:block">
            {filtersSidebar}
          </aside>
        )}

        <main className="min-w-0 flex-1 px-4 pt-6 pb-32">
          <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <>
              <div className="dashboard-stats-wrapper rounded-lg border border-border bg-card px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
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

              {bulkSending && bulkProgress && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                  <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  <span>
                    Sending reply {bulkProgress.current} of {bulkProgress.total}…
                  </span>
                  <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="max-w-[120px]" />
                </div>
              )}

              <div className="space-y-6">
                {hasAnyFiltered ? (
                  <>
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
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 rounded-md h-8"
                        onClick={() =>
                          setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
                        }
                      >
                        <ArrowUpDownIcon className="size-4" />
                        <span className="text-xs">
                          {sortOrder === "desc" ? "Newest first" : "Oldest first"}
                        </span>
                      </Button>
                      <span className="text-muted-foreground text-sm">
                        Limit:
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant={displayLimit === null ? "secondary" : "ghost"}
                          size="sm"
                          className="rounded-md h-8"
                          onClick={() => setDisplayLimit(null)}
                        >
                          All
                        </Button>
                        {LIMIT_OPTIONS.map((n) => (
                          <Button
                            key={n}
                            variant={displayLimit === n ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-md h-8"
                            onClick={() => setDisplayLimit(n)}
                          >
                            {n}
                          </Button>
                        ))}
                      </div>
                      {allRatingsMode && (
                        <div className="flex flex-wrap items-center gap-2">
                          {fiveInDisplay.length > 0 && ratingRules[5]?.allowBulk && (
                            <Button
                              onClick={() => handleBulkSend(fiveInDisplay)}
                              disabled={bulkSending}
                              size="sm"
                              className="rounded-md gap-1.5 bg-[var(--success)] text-primary-foreground hover:opacity-90"
                            >
                              Send all {fiveInDisplay.length} (5★)
                            </Button>
                          )}
                          {fourInDisplay.length > 0 && ratingRules[4]?.allowBulk && (
                            <Button
                              onClick={() => handleBulkSend(fourInDisplay)}
                              disabled={bulkSending}
                              size="sm"
                              className="rounded-md gap-1.5 bg-[var(--amber)] text-black/90 hover:opacity-90"
                            >
                              Send all {fourInDisplay.length} (4★)
                            </Button>
                          )}
                          <Button
                            onClick={() => handleBulkSend(attentionWithRepliesInDisplay)}
                            disabled={bulkSending || attentionWithRepliesInDisplay.length === 0}
                            size="sm"
                            className="rounded-md gap-1.5 bg-[color-mix(in oklch, var(--destructive) 18%, transparent)] text-[var(--destructive)] hover:opacity-95 disabled:opacity-50"
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
                          onClick={() => handleBulkSend(fiveDisplayed)}
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
                          onClick={() => handleBulkSend(fourDisplayed)}
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
                          onClick={() => handleBulkSend(attentionWithRepliesInDisplay)}
                          disabled={bulkSending || attentionWithRepliesInDisplay.length === 0}
                          size="sm"
                          className="rounded-md gap-1.5 bg-[color-mix(in oklch, var(--destructive) 18%, transparent)] text-[var(--destructive)] hover:opacity-95 disabled:opacity-50"
                        >
                          Send all {attentionWithRepliesInDisplay.length} replies
                        </Button>
                      )}
                    </div>

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
                                const category =
                                  replyCategories[id] ?? DEFAULT_REPLY_CATEGORY_ID;
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
                                const category =
                                  replyCategories[id] ?? DEFAULT_REPLY_CATEGORY_ID;
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
            </>
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
        </main>
      </div>
      {/* Bottom fade when there are reviews */}
      {total > 0 && <div className="dashboard-list-fade" aria-hidden />}
      {/* Scroll to top */}
      {showScrollTop && (
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-6 right-6 z-20 h-10 w-10 rounded-full shadow-lg transition-opacity hover:opacity-90"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
        >
          <ArrowUpIcon className="size-5" />
        </Button>
      )}
    </div>
  );
}
