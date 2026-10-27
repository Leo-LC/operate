"use client";

import { useEffect, useState } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHead, PanelSub, PanelTitle } from "@/components/ui/panel";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { ChevronDownIcon, Loader2Icon, MapPinIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import type { ReviewWithLocation } from "@/types/review";
import {
  DEFAULT_RATING_RULES,
  DEFAULT_REPLY_CATEGORY_ID,
  STAR_ONLY_CATEGORY_ID,
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
  initialSection?: "templates" | "locations";
}

export function ConfigClient({ user, initialSection = "templates" }: ConfigClientProps) {
  const activeSection = initialSection;
  const [locations, setLocations] = useState<
    { id: string; title: string; locality: string | null; missingFromGbp?: boolean }[]
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
  // Templates editor: which star rating's list is on screen (5★ / 4★ pills).
  const [activeRating, setActiveRating] = useState<4 | 5>(5);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
        const res = await fetch("/api/reviews/config");
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
          locations?: { id: string; title: string; locality: string | null; missingFromGbp?: boolean }[];
        };
        if (cancelled) return;
        const mapped =
          (data.locations ?? []).map((l) => ({
            id: l.id,
            title: l.title,
            locality: l.locality ?? null,
            missingFromGbp: l.missingFromGbp ?? false,
          })) ?? [];
        setLocations(mapped);
        // If there is no stored selection yet, default to “all locations selected”.
        // A stored selection is intersected with the fetched ids so ids that
        // no longer exist (e.g. a corrected GBP id) disappear instead of
        // lingering as ghost entries.
        setSelectedIds((prev) => {
          if (prev.size === 0) return new Set(mapped.map((l) => l.id));
          const fetched = new Set(mapped.map((l) => l.id));
          const kept = Array.from(prev).filter((id) => fetched.has(id));
          return kept.length > 0 ? new Set(kept) : new Set(mapped.map((l) => l.id));
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
        const data = (await res.json()) as {
          reviews: ReviewWithLocation[];
          details?: { id: string; title: string; status: string; count: number; error?: string }[];
        };
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
              const initialCategory = !(r.comment ?? "").trim() ? STAR_ONLY_CATEGORY_ID : DEFAULT_REPLY_CATEGORY_ID;
              drafts[r.reviewId] = pickRandomTemplate(n as 4 | 5, initialCategory, templateConfig);
              categories[r.reviewId] = initialCategory;
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
        const problems = (data.details ?? []).filter((d) => d.status !== "ok");
        if (problems.length > 0) {
          toast.warning(
            `No Google data for: ${problems.map((d) => d.title).join(", ")} — check GBP ID / account access.`
          );
        }
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

  const saveSettings = () => {
    if (!isOwner) return;
    setSaving(true);
    void (async () => {
      try {
        const res = await fetch("/api/reviews/config", {
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
          const message = (data as { error?: string }).error ?? "Failed to save reply settings";
          toast.error(message);
          return;
        }
        toast.success("Reply templates saved for all users.");
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(DASHBOARD_STATE_KEY);
        }
      } catch {
        toast.error("Failed to save reply templates.");
      } finally {
        setSaving(false);
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

  const MODAL_BACKDROP: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 50,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--overlay-strong)", backdropFilter: "blur(2px)",
    padding: "0 16px",
  };

  return (
    <>
      <main className="revs-config">
        {activeSection === "templates" ? (
          <section aria-label="Reply templates" className="revs-config config-section-animate">
            {/* Sticky action bar: Save is always in reach — with 30 templates you
                never scroll to the bottom just to save an edit made at the top.
                Rating rules live here too as a small dropdown. */}
            <div className="revs-config-actions">
              <Button type="button" size="sm" onClick={saveSettings} disabled={!isOwner || sharedConfigLoading || saving}>
                {saving ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
                Save
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setRulesOpen((o) => !o)}>
                Rating rules
                <ChevronDownIcon className={`size-4 transition-transform ${rulesOpen ? "rotate-180" : ""}`} />
              </Button>
              {rulesOpen && (
                <div className="revs-rules-popover">
                  <p className="revs-rules-title">Rating rules</p>
                  <p className="revs-rules-sub">
                    Which reviews get pre-filled templates and which can be bulk-sent.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const rule = ratingRules[rating as Rating];
                      return (
                        <div key={rating} className="revs-rules-row">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="revs-rules-badge">
                              {rating}★
                            </span>
                          </div>
                          <div className="revs-rules-controls">
                            <div className="revs-rules-control">
                              <span className="revs-rules-control-label">Reply mode</span>
                              <select
                                className="revs-select"
                                value={rule?.mode ?? "custom"}
                                onChange={(e) => updateRule(rating as Rating, "mode", e.target.value as RatingRule["mode"])}
                                disabled={!isOwner}
                              >
                                <option value="template">Use templates</option>
                                <option value="custom">Custom replies only</option>
                              </select>
                            </div>
                            <div className="revs-rules-control">
                              <Checkbox
                                id={`bulk-${rating}`}
                                checked={rule?.allowBulk ?? false}
                                onCheckedChange={(checked) => updateRule(rating as Rating, "allowBulk", Boolean(checked) as RatingRule["allowBulk"])}
                                disabled={!isOwner}
                              />
                              <Label htmlFor={`bulk-${rating}`} className="revs-rules-control-label" style={{ cursor: "pointer" }}>
                                Bulk send
                              </Label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="revs-rules-foot">
                    On the dashboard these settings change which reviews are pre-filled and which can be bulk-sent.
                  </p>
                </div>
              )}
            </div>

            <Panel>
              <PanelHead>
                <div>
                  <PanelTitle>Reply templates</PanelTitle>
                  <PanelSub>
                    Owner-only. Staff always see the latest saved version when replying.
                  </PanelSub>
                </div>
              </PanelHead>
              <PanelBody>
                {/* Theme pills — labels only, no sidebar */}
                <div className="revs-chip-row">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="revs-chip"
                      data-active={activeCategoryId === cat.id ? "true" : undefined}
                      aria-pressed={activeCategoryId === cat.id}
                      onClick={() => setActiveCategoryId(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                  {isOwner && (
                    <button type="button" className="revs-chip revs-chip-add" onClick={addCategory}>
                      + Add theme
                    </button>
                  )}
                </div>

                {/* Star pills — which rating's list you're editing */}
                <div className="revs-chip-row">
                  {[5, 4].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className="revs-chip"
                      data-active={activeRating === rating ? "true" : undefined}
                      aria-pressed={activeRating === rating}
                      onClick={() => setActiveRating(rating as 4 | 5)}
                    >
                      {rating}★
                    </button>
                  ))}
                </div>

                {/* Template texts for the selected theme + rating */}
                <div className="revs-template-list">
                  {(templateConfig[activeRating]?.[activeCategoryId] ?? []).map((t, idx) => (
                    <div key={idx} className="revs-template-row">
                      <Textarea
                        rows={2}
                        data-autogrow="true"
                        style={{ minHeight: 64, resize: "none", overflow: "hidden", fontSize: 13, flex: 1 }}
                        value={t}
                        onChange={(e) => {
                          handleTemplateChange(activeRating as 4 | 5, activeCategoryId, idx, e.target.value);
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
                          onClick={() => setDeleteConfirm({ rating: activeRating as 4 | 5, index: idx })}
                          aria-label="Delete this template"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {isOwner && (
                    <button type="button" className="revs-ghost-btn" onClick={() => openAddMessage(activeRating as 4 | 5)} disabled={syncingFromConfig}>
                      + Add message
                    </button>
                  )}
                </div>
              </PanelBody>
            </Panel>
          </section>
        ) : (
          <section aria-label="Locations" className="revs-config config-section-animate">
            <Panel>
              <PanelHead>
                <div>
                  <PanelTitle>Locations</PanelTitle>
                  <PanelSub>
                    Choose which locations to include when syncing unreplied reviews.
                  </PanelSub>
                </div>
              </PanelHead>
              <PanelBody>
                {loadingLocations ? (
                  <div className="revs-empty revs-empty-compact" role="status">
                    <Loader2Icon size={18} className="animate-spin" aria-hidden />
                    <div className="revs-empty-copy">
                      <p>Loading locations…</p>
                    </div>
                  </div>
                ) : locations.length === 0 ? (
                  <div className="revs-empty revs-empty-compact">
                    <MapPinIcon size={18} aria-hidden />
                    <div className="revs-empty-copy">
                      <p>
                        <strong>No locations connected.</strong>
                      </p>
                      <p>
                        Sign in with the Google account that manages your Business Profiles, then try
                        again.
                      </p>
                    </div>
                  </div>
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
                    <div className="revs-location-list">
                      {locations.map((loc) => {
                        const isSelected = selectedIds.has(loc.id);
                        return (
                          <button
                            type="button"
                            key={loc.id}
                            onClick={() => toggleLocation(loc.id)}
                            disabled={syncingFromConfig}
                            className="revs-location-row"
                            data-selected={isSelected ? "true" : undefined}
                            aria-pressed={isSelected}
                          >
                            <span className="revs-location-mark" aria-hidden />
                            <span className="revs-location-text">
                              <span className="revs-location-title">
                                {loc.title}
                                {loc.missingFromGbp && (
                                  <span className="revs-location-warn">
                                    Not found on Google — check GBP ID
                                  </span>
                                )}
                              </span>
                              <span className="revs-location-meta">
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
                <div className="revs-panel-foot-row">
                  <p className="revs-panel-foot-note">
                    Save your selection, then sync unreplied reviews for these locations.
                  </p>
                  <Button size="sm" onClick={openConfirm} disabled={locations.length === 0 || syncingFromConfig}>
                    Save &amp; sync
                  </Button>
                </div>
                {syncingFromConfig && (
                  <div className="revs-sync-note">
                    <Loader2Icon className="size-3 animate-spin" />
                    <span>Syncing reviews and preparing your dashboard. You’ll be redirected in a moment…</span>
                  </div>
                )}
              </PanelBody>
            </Panel>
          </section>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {confirmOpen && !syncingFromConfig && (
        <div style={MODAL_BACKDROP}>
          <div className="revs-modal-panel">
            <h2 className="revs-modal-title">Save locations &amp; sync reviews?</h2>
            <p className="revs-modal-copy">
              We’ll use the currently selected locations to fetch all unreplied reviews and prepare your dashboard. This may take a few seconds.
            </p>
            <div className="revs-modal-actions">
              <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={() => { setConfirmOpen(false); performSaveAndSync(); }}>Continue &amp; sync</Button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && isOwner && !syncingFromConfig && (
        <div style={MODAL_BACKDROP}>
          <div className="revs-modal-panel">
            <h2 className="revs-modal-title">Delete this template?</h2>
            <p className="revs-modal-copy">
              The template is removed from this page immediately, and for everyone once you press Save.
            </p>
            <div className="revs-modal-actions">
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
          <div className="revs-modal-panel">
            <h2 className="revs-modal-title">Add a new theme</h2>
            <p className="revs-modal-copy">
              For example: &quot;Drinks&quot;, &quot;Food&quot;, &quot;Events&quot; or any other common topic you reply to often.
            </p>
            <input
              type="text"
              className="revs-modal-input"
              placeholder="Theme name"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
            />
            <div className="revs-modal-actions">
              <Button size="sm" variant="secondary" onClick={() => { setAddThemeOpen(false); setNewThemeName(""); }}>Cancel</Button>
              <Button size="sm" onClick={confirmAddCategory}>Add theme</Button>
            </div>
          </div>
        </div>
      )}
      {addMessageOpen && (
        <div style={MODAL_BACKDROP}>
          <div className="revs-modal-panel revs-modal-panel-wide">
            <h2 className="revs-modal-title">Add a new message</h2>
            <p className="revs-modal-copy">
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
            <div className="revs-modal-actions">
              <Button size="sm" variant="secondary" onClick={() => { setAddMessageOpen(false); setNewMessageText(""); }} disabled={syncingFromConfig}>Cancel</Button>
              <Button size="sm" onClick={confirmAddMessage} disabled={syncingFromConfig}>Add message</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
