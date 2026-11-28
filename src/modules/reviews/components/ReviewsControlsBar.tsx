"use client";
import { Button } from "@/components/ui/button";
import { ArrowUpDownIcon, ShuffleIcon } from "lucide-react";
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
  /** Re-roll every template draft in view (top-level, next to Send all). */
  onShuffleAll: () => void;
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
  onShuffleAll,
}: ReviewsControlsBarProps) {
  return (
    <div className="revs-controls">
      <div className="revs-controls-group">
        <span className="revs-controls-count">
          Reply to {displayCount} reviews
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onSortToggle}
        >
          <ArrowUpDownIcon className="size-4" />
          <span style={{ fontSize: 12 }}>
            {sortOrder === "desc" ? "Newest first" : "Oldest first"}
          </span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onShuffleAll}
          disabled={bulkSending}
          aria-label="Shuffle all template replies to a random template"
        >
          <ShuffleIcon className="size-4" />
          <span style={{ fontSize: 12 }}>Shuffle all</span>
        </Button>
        <span className="revs-controls-limit">
          <span className="revs-controls-label">Limit:</span>
          <select
            className="revs-limit"
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
        </span>
      </div>

      {allRatingsMode && (
        <div className="revs-controls-group">
          {fiveInDisplay.length > 0 && fiveAllowBulk && (
            <Button
              onClick={() => onBulkConfirm(fiveInDisplay, "5★")}
              disabled={bulkSending}
              size="sm"
              style={{ background: "var(--good)", color: "#fff" }}
            >
              Send all {fiveInDisplay.length} (5★)
            </Button>
          )}
          {fourInDisplay.length > 0 && fourAllowBulk && (
            <Button
              onClick={() => onBulkConfirm(fourInDisplay, "4★")}
              disabled={bulkSending}
              size="sm"
              style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
            >
              Send all {fourInDisplay.length} (4★)
            </Button>
          )}
          <Button
            onClick={() => onBulkConfirm(attentionWithRepliesInDisplay, "1–3★")}
            disabled={bulkSending || attentionWithRepliesInDisplay.length === 0}
            size="sm"
            style={{ background: "var(--bad-soft)", color: "var(--bad)" }}
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
          style={{ background: "var(--good)", color: "#fff" }}
        >
          Send all {fiveDisplayed.length} replies
        </Button>
      )}
      {singleRatingMode && activeRatings.has("four") && fourDisplayed.length > 0 && fourAllowBulk && (
        <Button
          onClick={() => onBulkConfirm(fourDisplayed, "4★")}
          disabled={bulkSending}
          size="sm"
          style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
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
            style={{ background: "var(--bad-soft)", color: "var(--bad)" }}
          >
            Send all {attentionWithRepliesInDisplay.length} replies
          </Button>
        )}
    </div>
  );
}
