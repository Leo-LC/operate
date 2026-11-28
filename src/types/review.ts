export type StarRating = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";

/** Media attached to a review by the reviewer (GBP API `reviewMediaItems[]`).
 *  We only keep the type — the files themselves are never fetched. */
export interface ReviewMedia {
  type?: string; // "PHOTO" | "VIDEO" | …
}

export interface Review {
  reviewId: string;
  reviewer: {
    profilePhotoUrl?: string;
    displayName: string;
  };
  starRating: StarRating;
  comment?: string;
  createTime: string;
  updateTime: string;
  name: string;
  /** Media items (photos/videos) attached by the reviewer. */
  reviewMediaItems?: ReviewMedia[];
  /** Google-provided deep link to this review in the Business Profile UI
   *  (where replying / reporting happens). */
  reviewReplyUrl?: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export interface Location {
  name: string;
  title?: string;
  storefrontAddress?: { addressLines?: string[]; locality?: string };
  metadata?: { placeId?: string };
}

export interface ReviewWithLocation extends Review {
  locationName: string;
  locationTitle: string;
  placeId?: string;
}
