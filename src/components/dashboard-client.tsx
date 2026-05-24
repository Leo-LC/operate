"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import {
  DashboardFilters,
  getDefaultFilters,
  type DashboardFiltersState,
  type LocationOption,
} from "@/components/dashboard-filters";
import { ReviewListVirtual } from "@/components/review-list-virtual";
import { SyncButton } from "@/components/sync-button";
import {
  DEFAULT_REPLY_CATEGORY_ID,
  LOCATION_NAMES,
  type Rating,
  pickRandomTemplate,
} from "@/lib/constants";
import { selectedLocationsStorageKey } from "@/lib/storage-keys";
import type { ReviewWithLocation } from "@/types/review";
import { ArrowUpIcon } from "lucide-react";
import { useReplyConfig } from "@/modules/reviews/hooks/useReplyConfig";
import { useReviews, starNum, readSavedLocationIds } from "@/modules/reviews/hooks/useReviews";
import { useBulkSend } from "@/modules/reviews/hooks/useBulkSend";
import { BulkReplyPanel } from "@/modules/reviews/components/BulkReplyPanel";
import { ReviewsControlsBar } from "@/modules/reviews/components/ReviewsControlsBar";

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
  const [filters, setFilters] = useState<DashboardFiltersState>(() => getDefaultFilters());
  const [syncing, setSyncing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const SELECTED_LOCATIONS_KEY = selectedLocationsStorageKey(user?.email);

  const [catalogLocations, setCatalogLocations] = useState<LocationOption[]>([]);
  const [selectionRevision, setSelectionRevision] = useState(0);

  const { ratingRules, templateConfig, sharedCategories, sharedConfigVersion } = useReplyConfig();

  const handleLocationsReady = useCallback((locations: Set<string>) => {
    setFilters((prev) => ({ ...prev, locations }));
  }, []);

  const {
    reviews,
    replyDrafts,
    replyCategories,
    handleSynced,
    handleReplySent,
    setDraft,
    setCategory,
    shuffleTemplateForReview,
  } = useReviews({
    email: user?.email,
    ratingRules,
    templateConfig,
    sharedConfigVersion,
    onLocationsReady: handleLocationsReady,
  });

  const {
    bulkSending,
    bulkProgress,
    bulkConfirm,
    openBulkConfirm,
    cancelBulkConfirm,
    handleBulkSend,
  } = useBulkSend({ replyDrafts, onReplySent: handleReplySent });

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

  // Auto-sync once per browser session when saved locations are already configured
  useEffect(() => {
    if (!user?.email) return;
    if (typeof window === "undefined") return;
    const SESSION_FLAG = "capybara-synced-this-session";
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    const savedIds = readSavedLocationIds(SELECTED_LOCATIONS_KEY);
    if (!savedIds || savedIds.length === 0) return;
    sessionStorage.setItem(SESSION_FLAG, "1");
    setSyncing(true);
    const query = `?locations=${encodeURIComponent(savedIds.join(","))}`;
    fetch(`/api/reviews/sync${query}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { reviews: ReviewWithLocation[] };
        handleSynced(data.reviews ?? []);
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

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
    // Bump when window regains focus so we re-read localStorage-backed location prefs
    void selectionRevision;
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
  }, [catalogLocations, locationsFromReviews, SELECTED_LOCATIONS_KEY, selectionRevision]);

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
      // Treat an empty string as a valid user draft. Otherwise clearing the
      // template would immediately fall back to the auto template.
      if (d != null) return d;
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


  const moodEmoji =
    total === 0 ? "🥳" : total <= 25 ? "🙂" : total <= 150 ? "😅" : "😬";

  return (
        <>
          {total > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", gap: "12px 20px", marginTop: 16 }}>
              {/* Row 1: stats spans full width */}
              <div className="dashboard-stats-wrapper" style={{ gridColumn: "span 2", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: "12px 16px" }}>
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
              <div style={{ display: "flex", alignItems: "center" }}>
                <h2 className="eyebrow" style={{ color: "var(--fg-4)" }}>Filters</h2>
              </div>
              <ReviewsControlsBar
                displayCount={
                  allRatingsMode
                    ? displayedChronological.length
                    : fiveDisplayed.length + fourDisplayed.length + attentionDisplayed.length
                }
                sortOrder={sortOrder}
                onSortToggle={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                displayLimit={displayLimit}
                onLimitChange={setDisplayLimit}
                allRatingsMode={allRatingsMode}
                singleRatingMode={singleRatingMode}
                bulkSending={bulkSending}
                fiveAllowBulk={!!ratingRules[5]?.allowBulk}
                fourAllowBulk={!!ratingRules[4]?.allowBulk}
                activeRatings={filters.ratings}
                fiveInDisplay={fiveInDisplay}
                fourInDisplay={fourInDisplay}
                attentionWithRepliesInDisplay={attentionWithRepliesInDisplay}
                fiveDisplayed={fiveDisplayed}
                fourDisplayed={fourDisplayed}
                onBulkConfirm={openBulkConfirm}
              />

              {/* Row 3: actual filter panel + reviews content */}
              <aside>
                <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 12 }}>
                  <DashboardFilters
                    filters={filters}
                    onChange={setFilters}
                    locations={filterLocationOptions}
                  />
                </div>
              </aside>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
                          <section style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-label="5 star reviews">
                            <ReviewListVirtual
                              reviews={fiveDisplayed}
                              getComment={(id) => {
                                const existing = replyDrafts[id];
                                // Treat `""` as a valid saved draft (user cleared the template).
                                if (existing != null) return existing;
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
                          <section style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-label="4 star reviews">
                            <ReviewListVirtual
                              reviews={fourDisplayed}
                              getComment={(id) => {
                                const existing = replyDrafts[id];
                                // Treat `""` as a valid saved draft (user cleared the template).
                                if (existing != null) return existing;
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
                            <section style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-label="1-3 star reviews">
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
                  <p style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>
                    No reviews match the current filters.
                  </p>
                )}
              </div>
            </div>
          )}

          {total === 0 && (
            <div style={{ borderRadius: "var(--r-lg)", border: "1px dashed var(--line-strong)", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "48px 24px", textAlign: "center", marginTop: 16 }}>
              <p style={{ fontSize: 13, color: "var(--fg-4)" }}>
                {syncing ? "Fetching reviews…" : "No reviews loaded."}
              </p>
              {!syncing && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--fg-4)" }}>
                  <p>
                    Using Google account{" "}
                    <span style={{ fontWeight: 500, color: "var(--fg)" }}>
                      {user?.email ?? "unknown"}
                    </span>
                    .
                  </p>
                  <p>
                    Click "Sync reviews" to fetch unreplied reviews from all locations this
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
            </div>
          )}

      {total > 0 && <div className="dashboard-list-fade" aria-hidden />}

      {showScrollTop && (
        <Button
          variant="secondary"
          size="icon"
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: 20, width: 40, height: 40, borderRadius: "var(--r-pill)", boxShadow: "var(--shadow-2)", transition: "opacity var(--dur) var(--ease)" }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
        >
          <ArrowUpIcon className="size-5" />
        </Button>
      )}

      <BulkReplyPanel
        bulkConfirm={bulkConfirm}
        bulkSending={bulkSending}
        bulkProgress={bulkProgress}
        onCancel={cancelBulkConfirm}
        onConfirm={(list) => {
          cancelBulkConfirm();
          void handleBulkSend(list);
        }}
      />
        </>
  );
}
