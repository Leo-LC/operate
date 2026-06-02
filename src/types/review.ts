export type StarRating = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";

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
