export const DEFAULT_ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export const ACCOUNTING_EXCLUDED_LOCATION_IDS = new Set<string>([]);

export const EXCLUDED_LOCATION_IDS = new Set([
  // "locations/787493951104592729", // Olives Bar Tapas (France)
  "locations/5898853216563266426", // Capybara Coffee Chiang Mai (unverified duplicate)
]);

// Google Business Profile locations that have no row in the `locations` table
// (so they're invisible to accounting, challenges, scheduling, etc. by default)
// but should still be reachable from the reviews module specifically.
export const REVIEWS_ONLY_LOCATION_IDS = new Set([
  "locations/17423194230027303735", // Capybara Coffee & Zen Resort Spa Chiang Mai
]);

export const LOCATION_NAMES: Record<string, string> = {
  "locations/16151596174163473059": "Phangan",
  "locations/10878815915536987618": "Ekkamai",
  "locations/10753238730025479271": "Samui",
  "locations/2465044010509373862": "Silom",
  "locations/1605645991793886964": "Pattaya",
  "locations/1389494344977514093": "Chiang Mai",
};

export type ReplyRatingBucket = 4 | 5;

export type ReplyCategoryId = string;

export interface ReplyCategory {
  id: ReplyCategoryId;
  label: string;
  description?: string;
  ratings: ReplyRatingBucket[];
}

export const REPLY_CATEGORIES: ReplyCategory[] = [
  {
    id: "generic",
    label: "Generic",
    description: "Safe, all-purpose thank you message.",
    ratings: [4, 5],
  },
  {
    id: "staff",
    label: "Staff & service",
    description: "When guests mention friendly or helpful staff.",
    ratings: [4, 5],
  },
  {
    id: "animal_care",
    label: "Animal care & welfare",
    description: "When guests comment about the animals and their care.",
    ratings: [4, 5],
  },
  {
    id: "environment",
    label: "Environment & atmosphere",
    description: "When guests talk about space, vibe, or cleanliness.",
    ratings: [4, 5],
  },
];

export const REPLY_TEMPLATES: {
  [rating in ReplyRatingBucket]: Record<ReplyCategoryId, string[]>;
} = {
  5: {
    generic: [
      "Thank you so much for your 5-star review! We're really glad you enjoyed your visit and hope to welcome you back again soon. 🫶",
      "Wow, 5 stars! That means a lot to us. Thank you for taking the time to share your experience and we hope to see you again soon. 🌟",
      "Thank you for the wonderful 5-star rating! It makes our day to know you had a great time here with us. 🤎",
      "We really appreciate your 5-star review! Thanks for choosing us and we hope your next visit is just as good (or even better!). 🙏",
      "Huge thanks for the 5 stars! We're thrilled you enjoyed your time with us and we’d love to welcome you back anytime. 🐹☕️",
    ],
    staff: [
      "Thank you for the 5-star review and for mentioning our staff! We’re very proud of our team and it means a lot when guests notice their effort and kindness. 🤎",
    ],
    animal_care: [
      "Thank you so much for the 5 stars and for noticing how we care for the animals. Their wellbeing is our top priority, so your feedback really means a lot to us. 🐹🌿",
    ],
    environment: [
      "Thank you for the 5-star review and your kind words about the space and atmosphere. We’re happy you felt comfortable here and hope to welcome you back soon. ✨",
    ],
  },
  4: {
    generic: [
      "Thank you for your 4-star review! We appreciate your feedback. If there's anything we can improve for a 5-star experience next time, feel free to reach out at contact@capybaracoffeethailand.com 🙏",
      "Thanks a lot for the 4 stars! We're glad you had a good experience and we’re always trying to improve—if you have suggestions, we’d love to hear them. 🤎",
      "We really appreciate your 4-star rating. Knowing what you enjoyed (and what we can do better) helps us keep improving. Thank you for visiting us. ☕️",
      "Thank you for taking the time to leave a 4-star review! We hope your next visit can be a full 5-star experience. Feel free to share any ideas with us. 🙏",
      "Thanks for the 4 stars! We're happy you had a nice time and we’re always working on the little details to make every visit even better. 🌟",
    ],
    staff: [
      "Thank you for your 4-star review and for mentioning our staff. We’re happy to hear they helped make your visit enjoyable and we’ll keep doing our best for next time. 🤎",
    ],
    animal_care: [
      "Thank you for the 4 stars and for your kind words about the animals. Their care is very important to us, and we appreciate that you took the time to notice and share that. 🐹🌿",
    ],
    environment: [
      "Thanks for your 4-star review and your comments about the environment and atmosphere. We’re glad you enjoyed it and we’ll keep improving to reach that 5-star feeling. ✨",
    ],
  },
};

export const DEFAULT_REPLY_CATEGORY_ID: ReplyCategoryId = "generic";

export type ReplyTemplateMap = typeof REPLY_TEMPLATES;

export function pickRandomTemplate(
  rating: ReplyRatingBucket,
  category: ReplyCategoryId = DEFAULT_REPLY_CATEGORY_ID,
  templates: ReplyTemplateMap = REPLY_TEMPLATES,
): string {
  const byRating = templates[rating];
  const list = byRating?.[category] ?? byRating?.[DEFAULT_REPLY_CATEGORY_ID] ?? [];
  if (!list || list.length === 0) return "";
  const index = Math.floor(Math.random() * list.length);
  return list[index] ?? "";
}

export type Rating = 1 | 2 | 3 | 4 | 5;

export type RatingRuleMode = "template" | "custom";

export interface RatingRule {
  mode: RatingRuleMode;
  allowBulk: boolean;
}

export const DEFAULT_RATING_RULES: Record<Rating, RatingRule> = {
  5: { mode: "template", allowBulk: true },
  4: { mode: "template", allowBulk: true },
  3: { mode: "custom", allowBulk: false },
  2: { mode: "custom", allowBulk: false },
  1: { mode: "custom", allowBulk: false },
};

export const LOCATIONS_BASE =
  "https://mybusinessbusinessinformation.googleapis.com/v1";
export const REVIEWS_BASE = "https://mybusiness.googleapis.com/v4";
