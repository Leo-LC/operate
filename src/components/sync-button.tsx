"use client";

import { useCallback, useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReviewWithLocation } from "@/types/review";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import {
  dashboardStateStorageKey,
  selectedLocationsStorageKey,
} from "@/lib/storage-keys";

interface SyncButtonProps {
  onSynced: (reviews: ReviewWithLocation[]) => void;
  syncing: boolean;
  setSyncing: (v: boolean) => void;
  size?: "default" | "sm" | "lg";
  /** Must match Config “Locations” tab so sync uses the same saved selection */
  userEmail?: string | null;
}

async function loadSelectedLocationIds(userEmail?: string | null): Promise<string[] | null> {
  if (typeof window === "undefined") return null;
  const tryKey = (k: string): string[] | null => {
    try {
      const raw = window.localStorage.getItem(k);
      if (!raw) return null;
      const arr = JSON.parse(raw) as string[];
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const ids = arr.filter((x) => typeof x === "string" && x.trim().length > 0);
      return ids.length > 0 ? ids : null;
    } catch {
      return null;
    }
  };
  const key = selectedLocationsStorageKey(userEmail);
  const scoped = tryKey(key);
  if (scoped) return scoped;
  if (key !== "capybara-selected-locations") {
    return tryKey("capybara-selected-locations");
  }
  return null;
}

async function saveSelectedLocationIds(
  ids: string[],
  userEmail?: string | null
): Promise<void> {
  if (typeof window === "undefined") return;
  const key = selectedLocationsStorageKey(userEmail);
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function SyncButton({
  onSynced,
  syncing,
  setSyncing,
  size = "lg",
  userEmail,
}: SyncButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<
    { id: string; title: string }[] | null
  >(null);
  const [tempSelection, setTempSelection] = useState<Set<string>>(new Set());

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      let selectedIds = await loadSelectedLocationIds(userEmail);

      // First-time: no stored selection, open in-app picker modal instead of window.prompt.
      if (!selectedIds || selectedIds.length === 0) {
        const resLoc = await fetch("/api/locations");
        if (!resLoc.ok) {
          const data = await resLoc.json().catch(() => ({}));
          const message = (data as { error?: string }).error ?? "Failed to load locations";
          toast.error(message);
          setSyncing(false);
          return;
        }
        const locData = (await resLoc.json()) as {
          locations?: { id: string; title: string }[];
        };
        const locations = (locData.locations ?? []).filter(
          (l) => typeof l.id === "string" && l.id.length > 0
        );
        if (locations.length === 0) {
          toast.error("No locations found for this account.");
          setSyncing(false);
          return;
        }
        setAvailableLocations(locations);
        setTempSelection(new Set(locations.map((l) => l.id)));
        setPickerOpen(true);
        // Let the modal handle the rest; don't proceed with sync yet.
        return;
      }

      const query =
        selectedIds && selectedIds.length > 0
          ? `?locations=${encodeURIComponent(selectedIds.join(","))}`
          : "";

      const res = await fetch(`/api/reviews/sync${query}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error ?? "Sync failed";
        if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
          // Best-effort: clear any cached dashboard state so UI doesn't look “logged in”
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(dashboardStateStorageKey(userEmail));
          }
          await signOut({ callbackUrl: "/" });
          return;
        }
        toast.error(message);
        return;
      }
      const data = (await res.json()) as { reviews: ReviewWithLocation[] };
      onSynced(data.reviews ?? []);
      const count = (data.reviews ?? []).length;
      toast.success(`Synced ${count} unreplied review${count === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [onSynced, setSyncing, userEmail]);

  const toggleTemp = (id: string) => {
    setTempSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmPicker = async () => {
    const ids = Array.from(tempSelection);
    if (ids.length === 0) {
      toast.error("Please select at least one location.");
      return;
    }
    await saveSelectedLocationIds(ids, userEmail);
    setPickerOpen(false);
    // Now that we have a selection, trigger sync again.
    void handleSync();
  };

  return (
    <>
      <Button onClick={handleSync} disabled={syncing} size={size} className="gap-2 rounded-md">
        {syncing ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Fetching reviews…
          </>
        ) : (
          <>
            <RefreshCwIcon className="size-4" />
            Sync reviews
          </>
        )}
      </Button>
      {pickerOpen && availableLocations && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-4 shadow-xl">
            <h2 className="mb-1 text-sm font-semibold">Choose locations to sync</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Select which locations you want to include when fetching unreplied reviews.
            </p>
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Select:</span>
              <button
                type="button"
                className="rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] hover:bg-muted/60"
                onClick={() => setTempSelection(new Set(availableLocations.map((l) => l.id)))}
              >
                All
              </button>
              <button
                type="button"
                className="rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] hover:bg-muted/60"
                onClick={() => setTempSelection(new Set())}
              >
                None
              </button>
            </div>
            <div className="max-h-64 space-y-2 overflow-auto pr-1">
              {availableLocations.map((loc) => {
                const selected = tempSelection.has(loc.id);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => toggleTemp(loc.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "border-border/60 bg-muted hover:bg-muted/70"
                        : "border-border/30 bg-muted/20 hover:border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    <span className="truncate">{loc.title}</span>
                    <span
                      className={`ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                        selected
                          ? "border-primary/70 bg-primary/10 text-primary"
                          : "border-border/50 text-muted-foreground"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs border-border/60 bg-background/70 hover:bg-background/95"
                onClick={() => {
                  setPickerOpen(false);
                  setAvailableLocations(null);
                  setTempSelection(new Set());
                  setSyncing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg gap-1.5 text-xs border-border/60 bg-background/80 hover:bg-background/95"
                onClick={confirmPicker}
              >
                Save &amp; sync
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

