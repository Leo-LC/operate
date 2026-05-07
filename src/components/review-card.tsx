"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ReviewWithLocation } from "@/types/review";
import {
  REPLY_CATEGORIES,
  type ReplyCategory,
  type ReplyCategoryId,
  type ReplyRatingBucket,
} from "@/lib/constants";
import { StarIcon, SendIcon, Loader2Icon, ExternalLinkIcon, ShuffleIcon } from "lucide-react";

const STAR_RATING: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function Stars({ rating }: { rating: string }) {
  const n = STAR_RATING[rating] ?? 0;
  return (
    <div className="flex gap-0.5" aria-label={`${n} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          className={`size-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return iso;
  }
}

const TRUNCATE_LEN = 200;

const REPORT_REVIEW_URL = "https://support.google.com/business/answer/2622994";

interface ReviewCardProps {
  review: ReviewWithLocation;
  comment: string;
  onCommentChange: (comment: string) => void;
  onReplySent: (reviewId: string) => void;
  variant: "success" | "amber" | "attention";
  /** 1-based position in the current list (optional). */
  position?: number;
  /** Total number of items in the list (optional, for "3 / 24" display). */
  total?: number;
  /** Called when expand/collapse changes (for virtual list height measurement). */
  onExpandChange?: (expanded: boolean) => void;
  /** Optional template category identifier (for 4★ / 5★ auto-replies). */
  categoryId?: ReplyCategoryId;
  /** Optional handler when user selects a different template category. */
  onCategoryChange?: (category: ReplyCategoryId) => void;
  /** Optional handler to cycle another template in the current theme. */
  onShuffleTemplate?: () => void;
  /** Shared categories loaded at app level. */
  categories?: ReplyCategory[];
}

export function ReviewCard({
  review,
  comment,
  onCommentChange,
  onReplySent,
  variant,
  position,
  total,
  onExpandChange,
  categoryId,
  onCategoryChange,
  onShuffleTemplate,
  categories = REPLY_CATEGORIES,
}: ReviewCardProps) {
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const text = review.comment ?? "";
  const isLong = text.length > TRUNCATE_LEN;

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      onExpandChange?.(next);
      return next;
    });
  };

  const handleSend = async () => {
    const trimmed = comment.trim();
    if (!trimmed) {
      toast.error("Please enter a reply");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/reviews/reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: review.locationName,
          reviewId: review.reviewId,
          comment: trimmed,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error ?? "Failed to send reply";
        if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("capybara-dashboard-state");
          }
          await import("next-auth/react").then(({ signOut }) =>
            signOut({ callbackUrl: "/" })
          );
          return;
        }
        toast.error(message);
        return;
      }
      toast.success("Reply sent");
      onReplySent(review.reviewId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const initial = review.reviewer?.displayName?.[0]?.toUpperCase() ?? "?";
  const numericRating: ReplyRatingBucket | 0 =
    (STAR_RATING[review.starRating] ?? 0) === 4 || (STAR_RATING[review.starRating] ?? 0) === 5
      ? ((STAR_RATING[review.starRating] as ReplyRatingBucket) ?? 0)
      : 0;

  const availableCategories =
    numericRating === 4 || numericRating === 5
      ? categories.filter((c) => c.ratings.includes(numericRating))
      : [];

  const showCategorySelector =
    (variant === "success" || variant === "amber") && availableCategories.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {position != null && (
            <span className="text-muted-foreground text-xs font-medium tabular-nums">
              {total != null ? `${position} / ${total}` : `#${position}`}
            </span>
          )}
          <span className="text-muted-foreground text-sm">{review.locationTitle}</span>
          <Stars rating={review.starRating} />
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={REPORT_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex rounded p-1 transition-colors"
            title="Open review help (Google Help)"
            aria-label="Open review help"
          >
            <ExternalLinkIcon className="size-4" />
          </a>
          <span className="text-muted-foreground text-xs">{formatDate(review.createTime)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-sm">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-tight">{review.reviewer?.displayName ?? "Anonymous"}</p>
            {text ? (
              <div className="mt-1">
                <p
                  className="text-muted-foreground text-sm transition-[max-height] duration-300 ease-out"
                  style={{
                    maxHeight: isLong && !expanded ? "8.5em" : "2000px",
                    overflow: "hidden",
                  }}
                >
                  {expanded ? text : text.slice(0, TRUNCATE_LEN)}
                  {isLong && !expanded && "…"}
                </p>
                {isLong && (
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="mt-0.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          {showCategorySelector && onCategoryChange && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Template theme</span>
              <div className="flex items-center gap-1.5">
                {onShuffleTemplate && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-md px-2 text-xs"
                    onClick={onShuffleTemplate}
                    title="Shuffle template in current theme"
                    aria-label="Shuffle template"
                  >
                    <ShuffleIcon className="size-3.5" />
                  </Button>
                )}
                <select
                  className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={categoryId ?? "generic"}
                  onChange={(e) => onCategoryChange(e.target.value as ReplyCategoryId)}
                >
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <Textarea
            placeholder={variant === "attention" ? "Write a custom reply…" : undefined}
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !comment.trim()}
            className="rounded-md gap-1.5 transition-transform hover:translate-y-0.5 hover:shadow-sm"
          >
            {sending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
            Send reply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
