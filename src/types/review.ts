export type StarRating = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";

/** Media attached to a review by the reviewer (GBP API `media[]`).
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
  media?: ReviewMedia[];
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
