"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import type { ReviewWithLocation } from "@/types/review";
import {
  DEFAULT_RATING_RULES,
  DEFAULT_REPLY_CATEGORY_ID,
  REPLY_CATEGORIES,
  REPLY_TEMPLATES,
  type Rating,
  type RatingRule,
  type ReplyCategory,
  type ReplyCategoryId,
  type ReplyTemplateMap,
  pickRandomTemplate,
} from "@/lib/constants";
import { AllNoneToggle } from "@/components/all-none-toggle";
import { dashboardStateStorageKey, selectedLocationsStorageKey } from "@/lib/storage-keys";

interface ConfigClientProps {
  user: Session["user"] | null;
  initialSection?: "templates" | "rules" | "locations";
}

export function ConfigClient({ user, initialSection = "templates" }: ConfigClientProps) {
  const activeSection = initialSection;
  const [locations, setLocations] = useState<
    { id: string; title: string; locality: string | null }[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [syncingFromConfig, setSyncingFromConfig] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    rating: 4 | 5;
    index: number;
  } | null>(null);
  const [addThemeOpen, setAddThemeOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [addMessageOpen, setAddMessageOpen] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [addMessageRating, setAddMessageRating] = useState<4 | 5>(5);

  const autoGrowTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const [templateConfig, setTemplateConfig] = useState<ReplyTemplateMap>(REPLY_TEMPLATES);
  const [categories, setCategories] = useState<ReplyCategory[]>(REPLY_CATEGORIES);
  const [activeCategoryId, setActiveCategoryId] = useState<ReplyCategoryId>("generic");
  const [ratingRules, setRatingRules] = useState<Record<Rating, RatingRule>>(DEFAULT_RATING_RULES);
  const [sharedConfigLoading, setSharedConfigLoading] = useState(true);

  const SELECTED_LOCATIONS_KEY = selectedLocationsStorageKey(user?.email);
  const DASHBOARD_STATE_KEY = dashboardStateStorageKey(user?.email);
  const router = useRouter();

  useEffect(() => {
    // Ensure template textareas are correctly sized on first render / theme switch.
    requestAnimationFrame(() => {
      document
        .querySelectorAll<HTMLTextAreaElement>('textarea[data-autogrow="true"]')
        .forEach((el) => autoGrowTextarea(el));
    });
  }, [activeCategoryId, templateConfig]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SELECTED_LOCATIONS_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw) as string[];
      if (!Array.isArray(arr)) return;
      setSelectedIds(new Set(arr.filter((x) => typeof x === "string" && x.length > 0)));
    } catch {
      // ignore
    }
  }, [SELECTED_LOCATIONS_KEY]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config/shared");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = (data as { error?: string }).error ?? "Failed to load shared settings";
          if (!cancelled) toast.error(message);
          return;
        }
        const data = (await res.json()) as {
          templates?: ReplyTemplateMap;
          rules?: Record<Rating, RatingRule>;
          categories?: ReplyCategory[];
        };
        if (cancelled) return;
        if (data.templates) setTemplateConfig(data.templates);
        if (data.rules) setRatingRules(data.rules);
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
          if (!data.categories.some((c) => c.id === activeCategoryId)) {
            setActiveCategoryId(data.categories[0]?.id ?? "generic");
          }
        }
      } catch {
        if (!cancelled) toast.error("Failed to load shared settings");
      } finally {
        if (!cancelled) setSharedConfigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCategoryId]);

  useEffect(() => {
    if (activeSection !== "locations") return;
    let cancelled = false;
    const load = async () => {
      setLoadingLocations(true);
      try {
        const res = await fetch("/api/locations");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = (data as { error?: string }).error ?? "Failed to load locations";
          toast.error(message);
          return;
        }
        const data = (await res.json()) as {
          locations?: { id: string; title: string; locality: string | null }[];
        };
        if (cancelled) return;
        const mapped =
          (data.locations ?? []).map((l) => ({
            id: l.id,
            title: l.title,
            locality: l.locality ?? null,
          })) ?? [];
        setLocations(mapped);
        // If there is no stored selection yet, default to “all locations selected”
        setSelectedIds((prev) => {
          if (prev.size > 0) return prev;
          return new Set(mapped.map((l) => l.id));
        });
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load locations");
        }
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeSection]);

  const toggleLocation = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const performSaveAndSync = () => {
    if (typeof window === "undefined") return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("Please select at least one location.");
      return;
    }
    try {
      window.localStorage.setItem(SELECTED_LOCATIONS_KEY, JSON.stringify(ids));
    } catch {
      toast.error("Failed to save locations in this browser.");
      return;
    }

    const query = `?locations=${encodeURIComponent(ids.join(","))}`;
    setSyncingFromConfig(true);

    (async () => {
      try {
        const res = await fetch(`/api/reviews/sync${query}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = (data as { error?: string }).error ?? "Sync failed";
          toast.error(message);
          setSyncingFromConfig(false);
          return;
        }
        const data = (await res.json()) as { reviews: ReviewWithLocation[] };
        const reviews = Array.isArray(data.reviews) ? data.reviews : [];
        const sorted = [...reviews].sort((a, b) => {
          const aTime = a.createTime ? Date.parse(a.createTime as string) : 0;
          const bTime = b.createTime ? Date.parse(b.createTime as string) : 0;
          return bTime - aTime;
        });
        const drafts: Record<string, string> = {};
        const categories: Record<string, ReplyCategoryId> = {};
        for (const r of sorted) {
          const n =
            r.starRating === "FIVE"
              ? 5
              : r.starRating === "FOUR"
                ? 4
                : r.starRating === "THREE"
                  ? 3
                  : r.starRating === "TWO"
                    ? 2
                    : r.starRating === "ONE"
                      ? 1
                      : 0;
          if (n === 5 || n === 4) {
            const rule = ratingRules[n as Rating];
            if (rule?.mode === "template") {
              drafts[r.reviewId] = pickRandomTemplate(
                n as 4 | 5,
                DEFAULT_REPLY_CATEGORY_ID,
                templateConfig
              );
              categories[r.reviewId] = DEFAULT_REPLY_CATEGORY_ID;
            } else {
              drafts[r.reviewId] = "";
            }
          } else {
            drafts[r.reviewId] = "";
          }
        }
        window.localStorage.setItem(
          DASHBOARD_STATE_KEY,
          JSON.stringify({
            reviews: sorted,
            replyDrafts: drafts,
            replyCategories: categories,
            timestamp: Date.now(),
          })
        );
        toast.success(
          `Synced ${sorted.length} unreplied review${sorted.length === 1 ? "" : "s"}. Redirecting to dashboard…`
        );
        router.push("/dashboard");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Sync failed");
        setSyncingFromConfig(false);
      }
    })();
  };

  const openConfirm = () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one location.");
      return;
    }
    setConfirmOpen(true);
  };

  const isOwner = user?.role === "owner";

  const handleTemplateChange = (
    rating: 4 | 5,
    categoryId: ReplyCategoryId,
    index: number,
    value: string
  ) => {
    setTemplateConfig((prev) => {
      const byRating = prev[rating] ?? {};
      const arr = [...(byRating[categoryId] ?? [])];
      arr[index] = value;
      return {
        ...prev,
        [rating]: {
          ...byRating,
          [categoryId]: arr,
        },
      };
    });
  };

  const openAddMessage = (rating: 4 | 5) => {
    if (!isOwner) return;
    setAddMessageRating(rating);
    setNewMessageText("");
    setAddMessageOpen(true);
  };

  const confirmAddMessage = () => {
    if (!isOwner) return;
    const text = newMessageText.trim();
    if (!text) {
      toast.error("Please enter a message.");
      return;
    }
    setTemplateConfig((prev) => {
      const byRating = prev[addMessageRating] ?? {};
      const arr = [...(byRating[activeCategoryId] ?? [])];
      arr.push(text);
      return {
        ...prev,
        [addMessageRating]: {
          ...byRating,
          [activeCategoryId]: arr,
        },
      };
    });
    setAddMessageOpen(false);
    setNewMessageText("");
    toast.success("Message added. Don't forget to save templates.");
  };

  const handleRemoveTemplate = (rating: 4 | 5, categoryId: ReplyCategoryId, index: number) => {
    setTemplateConfig((prev) => {
      const byRating = prev[rating] ?? {};
      const arr = [...(byRating[categoryId] ?? [])];
      arr.splice(index, 1);
      return {
        ...prev,
        [rating]: {
          ...byRating,
          [categoryId]: arr,
        },
      };
    });
    setDeleteConfirm(null);
  };

  const saveTemplates = () => {
    if (!isOwner) return;
    void (async () => {
      try {
        const res = await fetch("/api/config/shared", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templates: templateConfig,
            rules: ratingRules,
            categories,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = (data as { error?: string }).error ?? "Failed to save templates";
          toast.error(message);
          return;
        }
        toast.success("Reply templates saved for all users.");
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(DASHBOARD_STATE_KEY);
        }
      } catch {
        toast.error("Failed to save templates.");
      }
    })();
  };

  const saveRules = () => {
    if (!isOwner) return;
    void (async () => {
      try {
        const res = await fetch("/api/config/shared", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templates: templateConfig,
            rules: ratingRules,
            categories,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = (data as { error?: string }).error ?? "Failed to save rating rules";
          toast.error(message);
          return;
        }
        toast.success("Rating rules saved for all users.");
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(DASHBOARD_STATE_KEY);
        }
      } catch {
        toast.error("Failed to save rating rules.");
      }
    })();
  };

  const addCategory = () => {
    if (!isOwner) return;
    setNewThemeName("");
    setAddThemeOpen(true);
  };

  const confirmAddCategory = () => {
    const label = newThemeName.trim();
    if (!label) {
      toast.error("Please enter a theme name.");
      return;
    }
    const baseId = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const id =
      baseId.length > 0 ? baseId : `theme_${Math.random().toString(36).slice(2, 8)}`;
    if (categories.some((c) => c.id === id)) {
      toast.error("A theme with that name already exists.");
      return;
    }
    const nextCategory: ReplyCategory = {
      id,
      label,
      ratings: [4, 5],
    };
    setCategories((prev) => [...prev, nextCategory]);
    setTemplateConfig((prev) => ({
      ...prev,
      5: { ...(prev[5] ?? {}), [id]: [] },
      4: { ...(prev[4] ?? {}), [id]: [] },
    }));
    setActiveCategoryId(id);
    setAddThemeOpen(false);
    setNewThemeName("");
    toast.success("Theme added. Don't forget to save templates.");
  };

  const updateRule = <K extends keyof RatingRule>(
    rating: Rating,
    key: K,
    value: RatingRule[K]
  ) => {
    setRatingRules((prev) => ({
      ...prev,
      [rating]: {
        ...prev[rating],
        [key]: value,
      },
    }));
  };

  return (
    <>
      <main className="w-full py-2">
        {activeSection === "templates" ? (
          <section
            aria-label="Reply templates"
            className="space-y-6 config-section-animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Pre-written messages</CardTitle>
                <CardDescription>
                  Default reply text per rating &amp; theme. Staff can still edit each reply before
                  sending.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid items-start gap-4 md:grid-cols-[12rem_1px_minmax(0,1fr)]">
                  <div className="w-full">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Themes</p>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Choose the theme used for your 4★ and 5★ template sets.
                    </p>
                  </div>
                  <div
                    className="hidden md:block w-px self-stretch bg-border"
                    aria-hidden="true"
                  />
                  <div className="w-full">
                    <Label className="text-sm">5★ templates</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      These are used for 5-star reviews when &quot;Use templates&quot; is enabled
                      for 5 stars.
                    </p>
                  </div>

                  <div className="w-full space-y-1.5">
                    <div className="flex flex-col gap-1.5">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategoryId(cat.id)}
                          className={`w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                            activeCategoryId === cat.id
                              ? "border-border/70 bg-muted text-foreground"
                              : "border-border/30 text-muted-foreground hover:border-border/60 hover:bg-muted/40"
                          }`}
                        >
                          <span className="block font-medium text-sm">{cat.label}</span>
                          {cat.description && (
                            <span className="block text-[11px] text-muted-foreground">
                              {cat.description}
                            </span>
                          )}
                        </button>
                      ))}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={addCategory}
                          className="mt-2 inline-flex h-7 items-center justify-center rounded-md border border-border/50 bg-muted/30 px-2 text-[11px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
                        >
                          + Add theme
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="h-px w-full bg-border/80 my-1 md:my-0 md:h-auto md:w-0 md:self-stretch md:border-l md:border-border"
                    aria-hidden="true"
                  />
                  <div className="flex-1 space-y-4 md:pl-4">
                    <div className="space-y-2">
                      <div className="space-y-2">
                        {(templateConfig[5]?.[activeCategoryId] ?? []).map((t, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Textarea
                              rows={2}
                              data-autogrow="true"
                              className="min-h-[64px] resize-none overflow-hidden text-sm"
                              value={t}
                              onChange={(e) => {
                                handleTemplateChange(5, activeCategoryId, idx, e.target.value);
                                autoGrowTextarea(e.currentTarget);
                              }}
                              disabled={!isOwner}
                            />
                            {isOwner && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full"
                                onClick={() => setDeleteConfirm({ rating: 5, index: idx })}
                                aria-label="Delete this template"
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {isOwner && (
                          <button
                            type="button"
                            className="inline-flex h-7 items-center justify-center rounded-md border border-border/50 bg-muted/30 px-2 text-[11px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
                            onClick={() => openAddMessage(5)}
                            disabled={syncingFromConfig}
                          >
                            + Add message
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="mb-2 space-y-1">
                        <Label className="text-sm">4★ templates</Label>
                        <p className="text-xs text-muted-foreground">
                          These are used for 4-star reviews when &quot;Use templates&quot; is enabled
                          for 4 stars.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {(templateConfig[4]?.[activeCategoryId] ?? []).map((t, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Textarea
                              rows={2}
                              data-autogrow="true"
                              className="min-h-[64px] resize-none overflow-hidden text-sm"
                              value={t}
                              onChange={(e) => {
                                handleTemplateChange(4, activeCategoryId, idx, e.target.value);
                                autoGrowTextarea(e.currentTarget);
                              }}
                              disabled={!isOwner}
                            />
                            {isOwner && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full"
                                onClick={() => setDeleteConfirm({ rating: 4, index: idx })}
                                aria-label="Delete this template"
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {isOwner && (
                          <button
                            type="button"
                            className="inline-flex h-7 items-center justify-center rounded-md border border-border/50 bg-muted/30 px-2 text-[11px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
                            onClick={() => openAddMessage(4)}
                            disabled={syncingFromConfig}
                          >
                            + Add message
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Only owners can change templates. Staff always see the latest version when
                    replying.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-lg px-3 text-xs"
                    onClick={saveTemplates}
                    disabled={!isOwner || sharedConfigLoading}
                  >
                    Save templates
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : activeSection === "rules" ? (
          <section
            aria-label="Rating rules"
            className="space-y-6 config-section-animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Rating rules</CardTitle>
                <CardDescription>
                  For each rating, choose whether to pre-fill with templates or require custom
                  replies, and whether bulk sending is allowed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const rule = ratingRules[rating as Rating];
                  return (
                    <div
                      key={rating}
                      className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-semibold">
                          {rating}★
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {rating >= 4 ? "Positive" : "Needs attention"}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">Reply mode</span>
                          <select
                            className="h-7 rounded-md border border-border bg-background px-2 text-xs"
                            value={rule?.mode ?? "custom"}
                            onChange={(e) =>
                              updateRule(
                                rating as Rating,
                                "mode",
                                e.target.value as RatingRule["mode"]
                              )
                            }
                            disabled={!isOwner}
                          >
                            <option value="template">Use templates</option>
                            <option value="custom">Custom replies only</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`bulk-${rating}`}
                            checked={rule?.allowBulk ?? false}
                            onCheckedChange={(checked) =>
                              updateRule(
                                rating as Rating,
                                "allowBulk",
                                Boolean(checked) as RatingRule["allowBulk"]
                              )
                            }
                            disabled={!isOwner}
                          />
                          <Label
                            htmlFor={`bulk-${rating}`}
                            className="text-[11px] text-muted-foreground"
                          >
                            Allow bulk send
                          </Label>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">
                    Rating rules affect which reviews are pre-filled and which can be bulk-sent on
                    the dashboard.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-lg px-3 text-xs"
                    onClick={saveRules}
                    disabled={!isOwner || sharedConfigLoading}
                  >
                    Save rules
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section
            aria-label="Locations"
            className="space-y-6 config-section-animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Locations</CardTitle>
                <CardDescription>
                  Choose which locations to include when syncing unreplied reviews.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingLocations ? (
                  <p className="text-sm text-muted-foreground">Loading locations…</p>
                ) : locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No locations found for this account.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <AllNoneToggle
                      className="mt-0.5 justify-start"
                      allSelected={selectedIds.size === locations.length}
                      noneSelected={selectedIds.size === 0}
                      disabled={syncingFromConfig}
                      onSelectAll={() => setSelectedIds(new Set(locations.map((l) => l.id)))}
                      onSelectNone={() => setSelectedIds(new Set())}
                    />
                    <div className="space-y-2">
                      {locations.map((loc) => {
                        const isSelected = selectedIds.has(loc.id);
                        return (
                          <button
                            type="button"
                            key={loc.id}
                            onClick={() => toggleLocation(loc.id)}
                            disabled={syncingFromConfig}
                            className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? "border-border/60 bg-muted hover:bg-muted/70"
                                : "border-border/30 bg-muted/20 hover:border-border/60 hover:bg-muted/40"
                            }`}
                          >
                            <span className="flex flex-col">
                              <span className="font-medium">{loc.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {loc.locality ? `${loc.locality} · ` : ""}
                                {loc.id}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="pt-2 flex justify-between items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Save your selection, then sync unreplied reviews for these locations.
                  </p>
                  <Button
                    size="sm"
                    className="rounded-lg px-3 text-xs"
                    onClick={openConfirm}
                    disabled={locations.length === 0 || syncingFromConfig}
                  >
                    Save &amp; sync
                  </Button>
                </div>
                {syncingFromConfig && (
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2Icon className="size-3 animate-spin" />
                    <span>Syncing reviews and preparing your dashboard. You’ll be redirected in a moment…</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
      {confirmOpen && !syncingFromConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-4 shadow-xl">
            <h2 className="mb-1 text-sm font-semibold">Save locations &amp; sync reviews?</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              We&apos;ll use the currently selected locations to fetch all unreplied reviews and
              prepare your dashboard. This may take a few seconds.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs border-border/60 bg-background/70 hover:bg-background/95"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg gap-1.5 text-xs border-border/60 bg-background/80 hover:bg-background/95"
                onClick={() => {
                  setConfirmOpen(false);
                  performSaveAndSync();
                }}
              >
                Continue &amp; sync
              </Button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && isOwner && !syncingFromConfig && deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-4 shadow-xl">
            <h2 className="mb-1 text-sm font-semibold">Delete this template?</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Are you sure you want to delete this reply template? This action only affects this
              browser and can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs border-border/60 bg-background/70 hover:bg-background/95"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg gap-1.5 text-xs border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  handleRemoveTemplate(deleteConfirm.rating, activeCategoryId, deleteConfirm.index);
                }}
              >
                Delete template
              </Button>
            </div>
          </div>
        </div>
      )}
      {addThemeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-4 shadow-xl">
            <h2 className="mb-1 text-sm font-semibold">Add a new theme</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              For example: &quot;Drinks&quot;, &quot;Food&quot;, &quot;Events&quot; or any other
              common topic you reply to often.
            </p>
            <input
              type="text"
              className="mb-3 w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Theme name"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs border-border/60 bg-background/70 hover:bg-background/95"
                onClick={() => {
                  setAddThemeOpen(false);
                  setNewThemeName("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg gap-1.5 text-xs border-border/60 bg-background/80 hover:bg-background/95"
                onClick={confirmAddCategory}
              >
                Add theme
              </Button>
            </div>
          </div>
        </div>
      )}
      {addMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-4 shadow-xl">
            <h2 className="mb-1 text-sm font-semibold">Add a new message</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              This will be added to the {addMessageRating}★ templates for the current theme.
            </p>
            <Textarea
              rows={4}
              className="mb-3 min-h-[96px] resize-none text-sm"
              placeholder="Write the reply message…"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              disabled={syncingFromConfig}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs border-border/60 bg-background/70 hover:bg-background/95"
                onClick={() => {
                  setAddMessageOpen(false);
                  setNewMessageText("");
                }}
                disabled={syncingFromConfig}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg gap-1.5 text-xs border-border/60 bg-background/80 hover:bg-background/95"
                onClick={confirmAddMessage}
                disabled={syncingFromConfig}
              >
                Add message
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
