"use client";

import { useEffect, useState } from "react";
import React from "react";
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
          `Synced ${sorted.length} unreplied review${sorted.length === 1 ? "" : "s"}. Redirecting…`
        );
        router.push("/reviews/inbox");
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

  const CARD_STYLE: React.CSSProperties = {
    borderRadius: "var(--r-lg)",
    border: "1px solid var(--line)",
    background: "var(--surface)",
    overflow: "hidden",
  };
  const CARD_HEADER: React.CSSProperties = {
    padding: "16px 20px 12px",
    borderBottom: "1px solid var(--line)",
  };
  const CARD_BODY: React.CSSProperties = { padding: "16px 20px 20px" };
  const MODAL_PANEL: React.CSSProperties = {
    width: "100%", maxWidth: 400,
    borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
    background: "var(--surface)", padding: 20,
    boxShadow: "var(--shadow-drawer)",
  };
  const MODAL_BACKDROP: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 50,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
    padding: "0 16px",
  };
  const GHOST_BTN: React.CSSProperties = {
    display: "inline-flex", height: 28, alignItems: "center", justifyContent: "center",
    borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
    background: "var(--bg-2)", padding: "0 8px",
    fontSize: 11, color: "var(--fg-4)", cursor: "pointer",
    transition: "background var(--dur) var(--ease)",
  };
  const SELECT_SM: React.CSSProperties = {
    height: 28, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
    background: "var(--bg)", color: "var(--fg)", padding: "0 8px",
    fontSize: 12, outline: "none", cursor: "pointer",
  };
  const MODAL_INPUT: React.CSSProperties = {
    width: "100%", height: 32, borderRadius: "var(--r-sm)",
    border: "1px solid var(--line-strong)", background: "var(--bg)",
    color: "var(--fg)", padding: "0 10px", fontSize: 13, outline: "none",
    boxSizing: "border-box", marginBottom: 12,
  };

  return (
    <>
      <main style={{ width: "100%", paddingTop: 8, paddingBottom: 8 }}>
        {activeSection === "templates" ? (
          <section aria-label="Reply templates" className="config-section-animate" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={CARD_STYLE}>
              <div style={CARD_HEADER}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>Pre-written messages</h2>
                <p style={{ fontSize: 13, color: "var(--fg-4)", marginTop: 4 }}>
                  Default reply text per rating &amp; theme. Staff can still edit each reply before sending.
                </p>
              </div>
              <div style={CARD_BODY}>
                <div style={{ display: "grid", gridTemplateColumns: "12rem 1px 1fr", alignItems: "start", gap: 16 }}>
                  <div>
                    <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 6 }}>Themes</p>
                    <p style={{ fontSize: 12, color: "var(--fg-4)" }}>
                      Choose the theme used for your 4★ and 5★ template sets.
                    </p>
                  </div>
                  <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} aria-hidden="true" />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>5★ templates</p>
                    <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 4 }}>
                      These are used for 5-star reviews when &quot;Use templates&quot; is enabled for 5 stars.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryId(cat.id)}
                        style={{
                          width: "100%", borderRadius: "var(--r-sm)",
                          border: `1px solid ${activeCategoryId === cat.id ? "var(--line)" : "var(--line)"}`,
                          padding: "6px 10px", textAlign: "left", fontSize: 12, cursor: "pointer",
                          background: activeCategoryId === cat.id ? "var(--bg-2)" : "transparent",
                          color: activeCategoryId === cat.id ? "var(--fg)" : "var(--fg-4)",
                          transition: "background var(--dur) var(--ease)",
                        }}
                      >
                        <span style={{ display: "block", fontWeight: 500, fontSize: 13 }}>{cat.label}</span>
                        {cat.description && (
                          <span style={{ display: "block", fontSize: 11, color: "var(--fg-4)" }}>
                            {cat.description}
                          </span>
                        )}
                      </button>
                    ))}
                    {isOwner && (
                      <button type="button" onClick={addCategory} style={{ ...GHOST_BTN, marginTop: 4, alignSelf: "flex-start" }}>
                        + Add theme
                      </button>
                    )}
                  </div>
                  <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} aria-hidden="true" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingLeft: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(templateConfig[5]?.[activeCategoryId] ?? []).map((t, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Textarea
                            rows={2}
                            data-autogrow="true"
                            style={{ minHeight: 64, resize: "none", overflow: "hidden", fontSize: 13, flex: 1 }}
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
                              style={{ width: 28, height: 28, color: "var(--fg-4)", borderRadius: "var(--r-pill)" }}
                              onClick={() => setDeleteConfirm({ rating: 5, index: idx })}
                              aria-label="Delete this template"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {isOwner && (
                        <button type="button" style={{ ...GHOST_BTN, alignSelf: "flex-start" }} onClick={() => openAddMessage(5)} disabled={syncingFromConfig}>
                          + Add message
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ marginBottom: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>4★ templates</p>
                        <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 4 }}>
                          These are used for 4-star reviews when &quot;Use templates&quot; is enabled for 4 stars.
                        </p>
                      </div>
                      {(templateConfig[4]?.[activeCategoryId] ?? []).map((t, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Textarea
                            rows={2}
                            data-autogrow="true"
                            style={{ minHeight: 64, resize: "none", overflow: "hidden", fontSize: 13, flex: 1 }}
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
                              style={{ width: 28, height: 28, color: "var(--fg-4)", borderRadius: "var(--r-pill)" }}
                              onClick={() => setDeleteConfirm({ rating: 4, index: idx })}
                              aria-label="Delete this template"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {isOwner && (
                        <button type="button" style={{ ...GHOST_BTN, alignSelf: "flex-start" }} onClick={() => openAddMessage(4)} disabled={syncingFromConfig}>
                          + Add message
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, marginTop: 16, borderTop: "1px solid var(--line)" }}>
                  <p style={{ fontSize: 12, color: "var(--fg-4)" }}>
                    Only owners can change templates. Staff always see the latest version when replying.
                  </p>
                  <Button type="button" size="sm" onClick={saveTemplates} disabled={!isOwner || sharedConfigLoading}>
                    Save templates
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : activeSection === "rules" ? (
          <section aria-label="Rating rules" className="config-section-animate" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={CARD_STYLE}>
              <div style={CARD_HEADER}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>Rating rules</h2>
                <p style={{ fontSize: 13, color: "var(--fg-4)", marginTop: 4 }}>
                  For each rating, choose whether to pre-fill with templates or require custom replies, and whether bulk sending is allowed.
                </p>
              </div>
              <div style={CARD_BODY}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const rule = ratingRules[rating as Rating];
                    return (
                      <div
                        key={rating}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg-2)", padding: "8px 12px", fontSize: 12 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ display: "inline-flex", width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: "var(--r-pill)", background: "var(--bg)", fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>
                            {rating}★
                          </span>
                          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>
                            {rating >= 4 ? "Positive" : "Needs attention"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Reply mode</span>
                            <select
                              style={SELECT_SM}
                              value={rule?.mode ?? "custom"}
                              onChange={(e) => updateRule(rating as Rating, "mode", e.target.value as RatingRule["mode"])}
                              disabled={!isOwner}
                            >
                              <option value="template">Use templates</option>
                              <option value="custom">Custom replies only</option>
                            </select>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Checkbox
                              id={`bulk-${rating}`}
                              checked={rule?.allowBulk ?? false}
                              onCheckedChange={(checked) => updateRule(rating as Rating, "allowBulk", Boolean(checked) as RatingRule["allowBulk"])}
                              disabled={!isOwner}
                            />
                            <Label htmlFor={`bulk-${rating}`} style={{ fontSize: 11, color: "var(--fg-4)", cursor: "pointer" }}>
                              Allow bulk send
                            </Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginTop: 12, borderTop: "1px solid var(--line)" }}>
                  <p style={{ fontSize: 12, color: "var(--fg-4)" }}>
                    Rating rules affect which reviews are pre-filled and which can be bulk-sent on the dashboard.
                  </p>
                  <Button type="button" size="sm" onClick={saveRules} disabled={!isOwner || sharedConfigLoading}>
                    Save rules
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section aria-label="Locations" className="config-section-animate" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={CARD_STYLE}>
              <div style={CARD_HEADER}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>Locations</h2>
                <p style={{ fontSize: 13, color: "var(--fg-4)", marginTop: 4 }}>
                  Choose which locations to include when syncing unreplied reviews.
                </p>
              </div>
              <div style={CARD_BODY}>
                {loadingLocations ? (
                  <p style={{ fontSize: 13, color: "var(--fg-4)" }}>Loading locations…</p>
                ) : locations.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--fg-4)" }}>No locations found for this account.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <AllNoneToggle
                      className="mt-0.5 justify-start"
                      allSelected={selectedIds.size === locations.length}
                      noneSelected={selectedIds.size === 0}
                      disabled={syncingFromConfig}
                      onSelectAll={() => setSelectedIds(new Set(locations.map((l) => l.id)))}
                      onSelectNone={() => setSelectedIds(new Set())}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {locations.map((loc) => {
                        const isSelected = selectedIds.has(loc.id);
                        return (
                          <button
                            type="button"
                            key={loc.id}
                            onClick={() => toggleLocation(loc.id)}
                            disabled={syncingFromConfig}
                            style={{
                              display: "flex", width: "100%", alignItems: "flex-start", gap: 8,
                              borderRadius: "var(--r-sm)",
                              border: `1px solid ${isSelected ? "var(--line)" : "var(--line)"}`,
                              padding: "8px 12px", textAlign: "left", fontSize: 13, cursor: "pointer",
                              background: isSelected ? "var(--bg-2)" : "transparent",
                              color: "var(--fg)",
                              transition: "background var(--dur) var(--ease)",
                            }}
                          >
                            <span style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 500 }}>{loc.title}</span>
                              <span style={{ fontSize: 12, color: "var(--fg-4)" }}>
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 12, marginTop: 12, borderTop: "1px solid var(--line)" }}>
                  <p style={{ fontSize: 12, color: "var(--fg-4)" }}>
                    Save your selection, then sync unreplied reviews for these locations.
                  </p>
                  <Button size="sm" onClick={openConfirm} disabled={locations.length === 0 || syncingFromConfig}>
                    Save &amp; sync
                  </Button>
                </div>
                {syncingFromConfig && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, borderRadius: "var(--r-sm)", background: "var(--bg-2)", padding: "8px 12px", fontSize: 12, color: "var(--fg-4)" }}>
                    <Loader2Icon className="size-3 animate-spin" />
                    <span>Syncing reviews and preparing your dashboard. You’ll be redirected in a moment…</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {confirmOpen && !syncingFromConfig && (
        <div style={MODAL_BACKDROP}>
          <div style={MODAL_PANEL}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Save locations &amp; sync reviews?</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
              We’ll use the currently selected locations to fetch all unreplied reviews and prepare your dashboard. This may take a few seconds.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={() => { setConfirmOpen(false); performSaveAndSync(); }}>Continue &amp; sync</Button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && isOwner && !syncingFromConfig && (
        <div style={MODAL_BACKDROP}>
          <div style={MODAL_PANEL}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Delete this template?</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
              Are you sure you want to delete this reply template? This action only affects this browser and can’t be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button size="sm" variant="danger" onClick={() => { handleRemoveTemplate(deleteConfirm.rating, activeCategoryId, deleteConfirm.index); }}>
                Delete template
              </Button>
            </div>
          </div>
        </div>
      )}
      {addThemeOpen && (
        <div style={MODAL_BACKDROP}>
          <div style={MODAL_PANEL}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Add a new theme</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 16 }}>
              For example: &quot;Drinks&quot;, &quot;Food&quot;, &quot;Events&quot; or any other common topic you reply to often.
            </p>
            <input
              type="text"
              style={MODAL_INPUT}
              placeholder="Theme name"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => { setAddThemeOpen(false); setNewThemeName(""); }}>Cancel</Button>
              <Button size="sm" onClick={confirmAddCategory}>Add theme</Button>
            </div>
          </div>
        </div>
      )}
      {addMessageOpen && (
        <div style={MODAL_BACKDROP}>
          <div style={{ ...MODAL_PANEL, maxWidth: 520 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Add a new message</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 16 }}>
              This will be added to the {addMessageRating}★ templates for the current theme.
            </p>
            <Textarea
              rows={4}
              style={{ minHeight: 96, resize: "none", fontSize: 13, marginBottom: 16, width: "100%" }}
              placeholder="Write the reply message…"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              disabled={syncingFromConfig}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => { setAddMessageOpen(false); setNewMessageText(""); }} disabled={syncingFromConfig}>Cancel</Button>
              <Button size="sm" onClick={confirmAddMessage} disabled={syncingFromConfig}>Add message</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
