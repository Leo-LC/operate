import { describe, expect, it } from "vitest";
import { formatReviewForCopy, formatReviewsForCopy } from "./review-copy";
import type { ReviewCopyInput } from "./review-copy";

function review(overrides: Partial<ReviewCopyInput> = {}): ReviewCopyInput {
  return {
    starRating: "THREE",
    comment: "Le café était froid.",
    reviewer: { displayName: "Jean Dupont" },
    ...overrides,
  };
}

describe("formatReviewForCopy", () => {
  it("formats a written review as stars, name, then text in parentheses", () => {
    expect(formatReviewForCopy(review())).toBe(
      "3 étoiles — Jean Dupont (Le café était froid.)"
    );
  });

  it("uses the singular for one-star reviews", () => {
    expect(formatReviewForCopy(review({ starRating: "ONE" }))).toBe(
      "1 étoile — Jean Dupont (Le café était froid.)"
    );
  });

  it("drops the parentheses for star-only reviews (no text)", () => {
    expect(formatReviewForCopy(review({ comment: undefined }))).toBe(
      "3 étoiles — Jean Dupont"
    );
  });

  it("treats a whitespace-only comment as no text", () => {
    expect(formatReviewForCopy(review({ comment: "   " }))).toBe(
      "3 étoiles — Jean Dupont"
    );
  });

  it("trims the comment", () => {
    expect(formatReviewForCopy(review({ comment: "  Bon service.  " }))).toBe(
      "3 étoiles — Jean Dupont (Bon service.)"
    );
  });

  it("falls back to Anonymous when the display name is blank", () => {
    expect(
      formatReviewForCopy(review({ reviewer: { displayName: "" } }))
    ).toBe("3 étoiles — Anonymous (Le café était froid.)");
  });

  it("copies the review in its original language, untranslated", () => {
    expect(
      formatReviewForCopy(review({ comment: "กาแฟแย่มาก" }))
    ).toBe("3 étoiles — Jean Dupont (กาแฟแย่มาก)");
  });
});

describe("formatReviewsForCopy", () => {
  it("joins several reviews with a blank line between", () => {
    const text = formatReviewsForCopy([
      review(),
      review({ starRating: "ONE", reviewer: { displayName: "Marie" } }),
    ]);
    expect(text).toBe(
      "3 étoiles — Jean Dupont (Le café était froid.)\n\n1 étoile — Marie (Le café était froid.)"
    );
  });

  it("returns an empty string for an empty list", () => {
    expect(formatReviewsForCopy([])).toBe("");
  });
});
