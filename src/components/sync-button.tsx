"use client";

import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReviewWithLocation } from "@/types/review";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";

interface SyncButtonProps {
  onSynced: (reviews: ReviewWithLocation[]) => void;
  syncing: boolean;
  setSyncing: (v: boolean) => void;
  size?: "default" | "sm" | "lg";
}

export function SyncButton({ onSynced, syncing, setSyncing, size = "lg" }: SyncButtonProps) {
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/reviews/sync");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error ?? "Sync failed";
        if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
          // Best-effort: clear any cached dashboard state so UI doesn't look “logged in”
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("capybara-dashboard-state");
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
  };

  return (
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
  );
}
