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
import { REPLY_TEMPLATE_5, REPLY_TEMPLATE_4 } from "@/lib/constants";
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

function partitionReviews(reviews: ReviewWithLocation[]) {
  const five: ReviewWithLocation[] = [];
  const four: ReviewWithLocation[] = [];
  const needsAttention: ReviewWithLocation[] = [];
  for (const r of reviews) {
    const n = starNum(r);
    if (n === 5) five.push(r);
    else if (n === 4) four.push(r);
    else needsAttention.push(r);
  }
  return { five, four, needsAttention };
}

interface DashboardClientProps {
  user: Session["user"] | null;
}

export function DashboardClient({ user }: DashboardClientProps) {
  const [reviews, setReviews] = useState<ReviewWithLocation[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<DashboardFiltersState>(() => getDefaultFilters());
  const [syncing, setSyncing] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const LIMIT_OPTIONS = [50, 100] as const;

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
      const raw = window.localStorage.getItem("capybara-dashboard-state");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        reviews: ReviewWithLocation[];
        replyDrafts: Record<string, string>;
        timestamp: number;
      };
      const maxAgeMs = 30 * 60 * 1000;
      if (!parsed.timestamp || Date.now() - parsed.timestamp > maxAgeMs) return;
      if (!Array.isArray(parsed.reviews) || parsed.reviews.length === 0) return;
      setReviews(parsed.reviews);
      setReplyDrafts(parsed.replyDrafts ?? {});
      const locationIds = Array.from(
        new Set(parsed.reviews.map((r) => r.locationName))
      );
      setFilters((prev) => ({ ...prev, locations: new Set(locationIds) }));
    } catch {
      // ignore bad data
    }
  }, [reviews.length, setFilters]);

  const handleSynced = useCallback((data: ReviewWithLocation[]) => {
    const sorted = [...data].sort((a, b) => {
      const aTime = a.createTime ? Date.parse(a.createTime as string) : 0;
      const bTime = b.createTime ? Date.parse(b.createTime as string) : 0;
      return bTime - aTime;
    });
    setReviews(sorted);
    const initial: Record<string, string> = {};
    for (const r of sorted) {
      const n = starNum(r);
      initial[r.reviewId] = n === 5 ? REPLY_TEMPLATE_5 : n === 4 ? REPLY_TEMPLATE_4 : "";
    }
    setReplyDrafts(initial);
    const locationIds = Array.from(new Set(sorted.map((r) => r.locationName)));
    setFilters((prev) => ({ ...prev, locations: new Set(locationIds) }));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "capybara-dashboard-state",
        JSON.stringify({
          reviews: sorted,
          replyDrafts: initial,
          timestamp: Date.now(),
        })
      );
    }
  }, [setFilters]);

  const handleReplySent = useCallback((reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.reviewId !== reviewId));
    setReplyDrafts((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });
  }, []);

  // Persist whenever reviews or drafts change (e.g. after sending replies)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reviews.length === 0) return;
    window.localStorage.setItem(
      "capybara-dashboard-state",
      JSON.stringify({
        reviews,
        replyDrafts,
        timestamp: Date.now(),
      })
    );
  }, [reviews, replyDrafts]);

  const setDraft = useCallback((reviewId: string, comment: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: comment }));
  }, []);

  const uniqueLocations = useMemo((): LocationOption[] => {
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

  const { five, four, needsAttention } = useMemo(
    () => partitionReviews(chronologicalList),
    [chronologicalList]
  );

  const fiveFiltered = filters.ratings.has("five") ? five : [];
  const fourFiltered = filters.ratings.has("four") ? four : [];
  const attentionFiltered = filters.ratings.has("attention") ? needsAttention : [];

  const allRatingsMode = filters.ratings.size === 3;
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
    () => displayedChronological.filter((r) => starNum(r) >= 1 && starNum(r) <= 3),
    [displayedChronological]
  );

  const fiveDisplayed = singleRatingMode ? applyLimit(fiveFiltered) : fiveInDisplay;
  const fourDisplayed = singleRatingMode ? applyLimit(fourFiltered) : fourInDisplay;
  const attentionDisplayed = singleRatingMode
    ? applyLimit(attentionFiltered)
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
      return n === 5 ? REPLY_TEMPLATE_5 : n === 4 ? REPLY_TEMPLATE_4 : "";
    },
    [replyDrafts, displayedChronological]
  );

  const hasAnyFiltered =
    fiveFiltered.length + fourFiltered.length + attentionFiltered.length > 0;


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
    <div className="flex w-56 shrink-0 flex-col px-4 py-6">
      <h2 className="mb-3 text-sm font-medium">Filters</h2>
      <DashboardFilters filters={filters} onChange={setFilters} locations={uniqueLocations} />
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
            <Link href="/dashboard">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 rounded-full px-3 text-xs sm:text-sm transition-colors hover:bg-muted/80"
                aria-current="page"
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/config">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full px-3 text-xs sm:text-sm transition-colors hover:bg-muted/70"
              >
                <SettingsIcon className="size-4" />
                Config
              </Button>
            </Link>
            <ThemeToggle />
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
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
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-6xl flex-1">
        {/* Desktop sidebar: sticky under navbar, only after sync */}
        {total > 0 && (
          <aside className="dashboard-sidebar hidden border-r border-border md:block">
            {filtersSidebar}
          </aside>
        )}

        <main className="min-w-0 flex-1 px-4 py-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                    <DashboardFilters filters={filters} onChange={setFilters} locations={uniqueLocations} />
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
                    1–3★ <strong>{needsAttention.length.toLocaleString()}</strong>
                  </span>
                </div>
                <SyncButton onSynced={handleSynced} syncing={syncing} setSyncing={setSyncing} size="sm" />
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
                          {fiveInDisplay.length > 0 && (
                            <Button
                              onClick={() => handleBulkSend(fiveInDisplay)}
                              disabled={bulkSending}
                              size="sm"
                              className="rounded-md gap-1.5 bg-[var(--success)] text-primary-foreground hover:opacity-90"
                            >
                              Send all {fiveInDisplay.length} (5★)
                            </Button>
                          )}
                          {fourInDisplay.length > 0 && (
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
                      {singleRatingMode && filters.ratings.has("five") && fiveDisplayed.length > 0 && (
                        <Button
                          onClick={() => handleBulkSend(fiveDisplayed)}
                          disabled={bulkSending}
                          size="sm"
                          className="rounded-md gap-1.5 bg-[var(--success)] text-primary-foreground hover:opacity-90"
                        >
                          Send all {fiveDisplayed.length} replies
                        </Button>
                      )}
                      {singleRatingMode && filters.ratings.has("four") && fourDisplayed.length > 0 && (
                        <Button
                          onClick={() => handleBulkSend(fourDisplayed)}
                          disabled={bulkSending}
                          size="sm"
                          className="rounded-md gap-1.5 bg-[var(--amber)] text-black/90 hover:opacity-90"
                        >
                          Send all {fourDisplayed.length} replies
                        </Button>
                      )}
                      {singleRatingMode && filters.ratings.has("attention") && (
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
                        defaultTemplate={REPLY_TEMPLATE_5}
                        getVariant={(r) =>
                          starNum(r) === 5
                            ? "success"
                            : starNum(r) === 4
                              ? "amber"
                              : "attention"
                        }
                      />
                    ) : (
                      <>
                        {fiveFiltered.length > 0 && filters.ratings.has("five") && (
                          <section className="space-y-4" aria-label="5 star reviews">
                            <ReviewListVirtual
                              reviews={fiveDisplayed}
                              getComment={(id) => replyDrafts[id] ?? REPLY_TEMPLATE_5}
                              onCommentChange={setDraft}
                              onReplySent={handleReplySent}
                              variant="success"
                              defaultTemplate={REPLY_TEMPLATE_5}
                            />
                          </section>
                        )}
                        {fourFiltered.length > 0 && filters.ratings.has("four") && (
                          <section className="space-y-4" aria-label="4 star reviews">
                            <ReviewListVirtual
                              reviews={fourDisplayed}
                              getComment={(id) => replyDrafts[id] ?? REPLY_TEMPLATE_4}
                              onCommentChange={setDraft}
                              onReplySent={handleReplySent}
                              variant="amber"
                              defaultTemplate={REPLY_TEMPLATE_4}
                            />
                          </section>
                        )}
                        {attentionFiltered.length > 0 && filters.ratings.has("attention") && (
                          <section className="space-y-4" aria-label="1-3 star reviews">
                            <ReviewListVirtual
                              reviews={attentionDisplayed}
                              getComment={(id) => replyDrafts[id] ?? ""}
                              onCommentChange={setDraft}
                              onReplySent={handleReplySent}
                              variant="attention"
                              defaultTemplate=""
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
                <SyncButton onSynced={handleSynced} syncing={syncing} setSyncing={setSyncing} />
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
