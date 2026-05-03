"use client";
import { Button } from "@/components/ui/button";
import { ArrowUpDownIcon } from "lucide-react";
import type { ReviewWithLocation } from "@/types/review";

const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

interface ReviewsControlsBarProps {
  displayCount: number;
  sortOrder: "desc" | "asc";
  onSortToggle: () => void;
  displayLimit: number | null;
  onLimitChange: (limit: number | null) => void;
  allRatingsMode: boolean;
  singleRatingMode: boolean;
  bulkSending: boolean;
  fiveAllowBulk: boolean;
  fourAllowBulk: boolean;
  activeRatings: Set<string>;
  fiveInDisplay: ReviewWithLocation[];
  fourInDisplay: ReviewWithLocation[];
  attentionWithRepliesInDisplay: ReviewWithLocation[];
  fiveDisplayed: ReviewWithLocation[];
  fourDisplayed: ReviewWithLocation[];
  onBulkConfirm: (list: ReviewWithLocation[], label: string) => void;
}

export function ReviewsControlsBar({
  displayCount,
  sortOrder,
  onSortToggle,
  displayLimit,
  onLimitChange,
  allRatingsMode,
  singleRatingMode,
  bulkSending,
  fiveAllowBulk,
  fourAllowBulk,
  activeRatings,
  fiveInDisplay,
  fourInDisplay,
  attentionWithRepliesInDisplay,
  fiveDisplayed,
  fourDisplayed,
  onBulkConfirm,
}: ReviewsControlsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-muted-foreground text-sm">
          Reply to {displayCount} reviews
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-md border-border bg-card text-foreground hover:bg-card/80"
          onClick={onSortToggle}
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
            onLimitChange(value === "all" ? null : Number(value));
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
          {fiveInDisplay.length > 0 && fiveAllowBulk && (
            <Button
              onClick={() => onBulkConfirm(fiveInDisplay, "5★")}
              disabled={bulkSending}
              size="sm"
              className="rounded-md gap-1.5 bg-[var(--success)] text-primary-foreground hover:opacity-90"
            >
              Send all {fiveInDisplay.length} (5★)
            </Button>
          )}
          {fourInDisplay.length > 0 && fourAllowBulk && (
            <Button
              onClick={() => onBulkConfirm(fourInDisplay, "4★")}
              disabled={bulkSending}
              size="sm"
              className="rounded-md gap-1.5 bg-[var(--amber)] text-black/90 hover:opacity-90"
            >
              Send all {fourInDisplay.length} (4★)
            </Button>
          )}
          <Button
            onClick={() => onBulkConfirm(attentionWithRepliesInDisplay, "1–3★")}
            disabled={bulkSending || attentionWithRepliesInDisplay.length === 0}
            size="sm"
            className="rounded-md gap-1.5 bg-[color-mix(in oklch, var(--destructive) 16%, transparent)] text-[var(--destructive)] transition-colors hover:bg-[color-mix(in oklch, var(--destructive) 26%, transparent)] hover:text-[color-mix(in oklch, var(--destructive) 88%, black)] disabled:opacity-50"
          >
            Send all {attentionWithRepliesInDisplay.length} (1–3★)
          </Button>
        </div>
      )}

      {singleRatingMode && activeRatings.has("five") && fiveDisplayed.length > 0 && fiveAllowBulk && (
        <Button
          onClick={() => onBulkConfirm(fiveDisplayed, "5★")}
          disabled={bulkSending}
          size="sm"
          className="rounded-md gap-1.5 bg-[var(--success)] text-primary-foreground hover:opacity-90"
        >
          Send all {fiveDisplayed.length} replies
        </Button>
      )}
      {singleRatingMode && activeRatings.has("four") && fourDisplayed.length > 0 && fourAllowBulk && (
        <Button
          onClick={() => onBulkConfirm(fourDisplayed, "4★")}
          disabled={bulkSending}
          size="sm"
          className="rounded-md gap-1.5 bg-[var(--amber)] text-black/90 hover:opacity-90"
        >
          Send all {fourDisplayed.length} replies
        </Button>
      )}
      {singleRatingMode &&
        (activeRatings.has("one") || activeRatings.has("two") || activeRatings.has("three")) && (
          <Button
            onClick={() => onBulkConfirm(attentionWithRepliesInDisplay, "1–3★")}
            disabled={bulkSending || attentionWithRepliesInDisplay.length === 0}
            size="sm"
            className="rounded-md gap-1.5 bg-[color-mix(in oklch, var(--destructive) 16%, transparent)] text-[var(--destructive)] transition-colors hover:bg-[color-mix(in oklch, var(--destructive) 26%, transparent)] hover:text-[color-mix(in oklch, var(--destructive) 88%, black)] disabled:opacity-50"
          >
            Send all {attentionWithRepliesInDisplay.length} replies
          </Button>
        )}
    </div>
  );
}
