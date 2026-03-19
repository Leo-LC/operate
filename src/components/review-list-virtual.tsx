"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { ReviewWithLocation } from "@/types/review";
import { ReviewCard } from "@/components/review-card";
import type { ReplyCategory, ReplyCategoryId } from "@/lib/constants";

const ROW_HEIGHT_ESTIMATE = 280;
const OVERSCAN = 5;
const FIRST_VISIBLE_ANIMATE_COUNT = 12;
const STAGGER_MS = 35;

type Variant = "success" | "amber" | "attention";

interface ReviewListVirtualProps {
  reviews: ReviewWithLocation[];
  getComment: (reviewId: string) => string;
  onCommentChange: (reviewId: string, comment: string) => void;
  onReplySent: (reviewId: string) => void;
  variant: Variant;
  /** When showing a mixed list (e.g. all ratings), pass per-review variant. */
  getVariant?: (review: ReviewWithLocation) => Variant;
  /** Optional: get current template category per review (4★ / 5★ only). */
  getCategory?: (reviewId: string) => ReplyCategoryId;
  /** Optional: change template category per review (4★ / 5★ only). */
  onCategoryChange?: (reviewId: string, category: ReplyCategoryId) => void;
  /** Optional: shuffle current template for a review (4★ / 5★ only). */
  onShuffleTemplate?: (reviewId: string) => void;
  /** Shared reply categories loaded at app-level config. */
  categories?: ReplyCategory[];
}

export function ReviewListVirtual({
  reviews,
  getComment,
  onCommentChange,
  onReplySent,
  variant,
  getVariant,
  getCategory,
  onCategoryChange,
  onShuffleTemplate,
  categories,
}: ReviewListVirtualProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (listRef.current && typeof window !== "undefined") {
      const top = listRef.current.getBoundingClientRect().top + window.scrollY;
      setScrollMargin(top);
    }
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: reviews.length,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: OVERSCAN,
    scrollMargin,
    measureElement: (node) => (node as HTMLElement).getBoundingClientRect().height,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  if (reviews.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No reviews match the current filters.
      </p>
    );
  }

  return (
    <div ref={listRef} className="relative">
      <div
        className="relative w-full"
        style={{
          height: `${totalSize}px`,
          width: "100%",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const r = reviews[virtualRow.index];
          const animate = virtualRow.index < FIRST_VISIBLE_ANIMATE_COUNT;
          return (
            <div
              key={r.reviewId}
              className="absolute left-0 top-0 w-full pb-3"
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              <div
                className={animate ? "review-card-reveal-inner" : ""}
                style={
                  animate
                    ? { animationDelay: `${virtualRow.index * STAGGER_MS}ms` }
                    : undefined
                }
              >
                <ReviewCard
                  review={r}
                  comment={getComment(r.reviewId)}
                  onCommentChange={(c) => onCommentChange(r.reviewId, c)}
                  onReplySent={onReplySent}
                  variant={getVariant ? getVariant(r) : variant}
                  position={virtualRow.index + 1}
                  total={reviews.length}
                  categoryId={getCategory?.(r.reviewId)}
                  onCategoryChange={
                    onCategoryChange
                      ? (category) => onCategoryChange(r.reviewId, category)
                      : undefined
                  }
                  onShuffleTemplate={
                    onShuffleTemplate ? () => onShuffleTemplate(r.reviewId) : undefined
                  }
                  categories={categories}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
