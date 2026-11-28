import type { Review } from "@/types/review";

/** Fields needed to format a review for pasting into an external drafting tool. */
export type ReviewCopyInput = Pick<Review, "starRating" | "comment" | "reviewer">;

const STAR_VALUES: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

/**
 * One-line paste-ready text for the external drafting tool (Custom GPT):
 * "3 étoiles — Name (review text)" in the review's original language.
 * Star-only reviews (no text) drop the parentheses.
 */
export function formatReviewForCopy(review: ReviewCopyInput): string {
  const n = STAR_VALUES[review.starRating] ?? 0;
  const stars = `${n} ${n === 1 ? "étoile" : "étoiles"}`;
  const name = review.reviewer?.displayName?.trim() || "Anonymous";
  const text = (review.comment ?? "").trim();
  return text ? `${stars} — ${name} (${text})` : `${stars} — ${name}`;
}

/** Multi-review paste: one review per block, blank line between for readability. */
export function formatReviewsForCopy(reviews: ReviewCopyInput[]): string {
  return reviews.map(formatReviewForCopy).join("\n\n");
}
