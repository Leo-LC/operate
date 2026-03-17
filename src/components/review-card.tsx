"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ReviewWithLocation } from "@/types/review";
import { StarIcon, SendIcon, Loader2Icon, ExternalLinkIcon } from "lucide-react";

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
          className={`size-4 ${i <= n ? "fill-[var(--amber)] text-[var(--amber)]" : "text-muted-foreground/40"}`}
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
}: ReviewCardProps) {
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const text = review.comment ?? "";
  const isLong = text.length > TRUNCATE_LEN;

  const toggleExpanded = () => {
    setExpanded((e) => !e);
    onExpandChange?.(!expanded);
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
        toast.error((data as { error?: string }).error ?? "Failed to send reply");
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
                    className="mt-0.5 text-primary text-sm underline-offset-2 hover:underline"
                  >
                    {expanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
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
            className="rounded-md gap-1.5"
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
