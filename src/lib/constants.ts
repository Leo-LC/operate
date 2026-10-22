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
  "locations/246504010509373862": "Silom",
  "locations/1605645991793886964": "Pattaya",
  "locations/1389494344977514093": "Chiang Mai",
  "locations/5348429606642712133": "Laguna",
  "locations/18305472203516651414": "Karon",
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
    label: "Generic Positive Experience",
    description: "Safe, all-purpose thank you message for positive experiences.",
    ratings: [4, 5],
  },
  {
    id: "staff",
    label: "Staff & Service",
    description: "When guests mention friendly or helpful staff.",
    ratings: [4, 5],
  },
  {
    id: "animal_care",
    label: "Animals & Interaction",
    description: "When guests comment about the animals and their interaction.",
    ratings: [4, 5],
  },
  {
    id: "environment",
    label: "Atmosphere & Environment",
    description: "When guests talk about space, vibe, or cleanliness.",
    ratings: [4, 5],
  },
  {
    id: "family_kids",
    label: "Family & Kids Experience",
    description: "When guests visit with family and children.",
    ratings: [4, 5],
  },
];

export const REPLY_TEMPLATES: {
  [rating in ReplyRatingBucket]: Record<ReplyCategoryId, string[]>;
} = {
  5: {
    generic: [
      "Thank you so much for your wonderful review! We're delighted you enjoyed your visit to Capybara Coffee. We hope to welcome you back again soon!",
      "We're so happy to hear you had a great time with us! Thank you for taking the time to share your experience. See you again at Capybara Coffee!",
      "Thank you for your lovely review! It means a lot to our team to know you enjoyed your time with us. We hope to see you again someday!",
      "What a pleasure to receive your kind review! Thank you for visiting Capybara Coffee and sharing your experience. You're always welcome back!",
      "Thanks a million for your kind words! We're glad we could make your visit a lovely one. Wishing you many more happy moments in Thailand!",
      "Thank you for your support! We're happy you enjoyed your visit and hope to make your next experience even more special!",
      "We really appreciate your feedback and your visit! It's great to know you had a good time with us. We look forward to welcoming you again!",
      "Thank you for sharing your experience! We're glad you had an enjoyable visit and hope to see you again at Capybara Coffee.",
      "Thanks for taking the time to leave us a review! Your support means a lot to our team, and we hope your next visit will be just as enjoyable.",
      "We're happy to hear you enjoyed your time with us! Thank you for the kind review, and we hope to welcome you back soon!",
    ],
    staff: [
      "Thank you for your wonderful words about our team! Our staff love making every visit special, and your feedback will mean so much to them. We hope to see you again soon!",
      "We're delighted you felt well taken care of during your visit! Our team works hard to create a friendly and welcoming experience. Thank you for recognizing their efforts!",
      "Your kind comments about our staff truly made our day! We'll be happy to share your feedback with the team. Thank you for visiting Capybara Coffee!",
      "Thank you for your kind feedback about our staff! We're glad our team helped make your visit enjoyable, and we hope to welcome you back again!",
      "It's lovely to hear you appreciated our team's service! Thank you for sharing your experience. We'll keep working to make every visit as welcoming as possible!",
      "We appreciate your review and your kind words about our staff! We'll be sure to pass them along to the team. Hope to see you again soon!",
    ],
    animal_care: [
      "We're so happy you enjoyed meeting our capybaras! They're the heart of Capybara Coffee, and sharing these special moments with our visitors is what we love most. Thank you for visiting!",
      "Thank you for your amazing review! There's something truly special about spending time with these gentle animals, and we're delighted you got to experience it. Hope to see you again!",
      "We're thrilled you loved your animal experience! Creating enjoyable interactions while respecting our animals' comfort and well-being is very important to us. Thank you for your kind words!",
      "Your lovely feedback means a lot to us! Our team is dedicated to caring for our animals and helping visitors enjoy meaningful encounters with them. We're so glad you had a wonderful time!",
      "Thank you for sharing your experience with our capybaras! We're glad you enjoyed meeting them and hope you'll have another lovely visit with us soon!",
      "We're happy to hear you had a good time with our animals! Their well-being is always important to us, and we appreciate you taking the time to share your feedback.",
      "Thank you for your kind review! Spending time with our capybaras is a unique experience, and we're glad you had the chance to enjoy it. Hope to see you again!",
      "We appreciate your feedback about our animals and their care! Our team strives to provide a comfortable environment for them and a pleasant experience for our guests. Thank you for visiting!",
    ],
    environment: [
      "Thank you for your beautiful review! We're so glad you enjoyed the relaxing atmosphere at Capybara Coffee. We love creating a place where visitors can slow down and enjoy a special moment!",
      "It's wonderful to hear you loved the setting and atmosphere! We want every visit to feel like a little escape from the everyday rush. Thank you for spending time with us!",
      "We're delighted you enjoyed our little corner of tranquility! Creating a warm and welcoming environment for both our guests and animals is very important to us. We hope to welcome you again!",
      "Thank you for your kind words about our atmosphere! We're glad you enjoyed spending time in our space and hope your next visit will be even more relaxing!",
      "We're happy you appreciated the environment at Capybara Coffee! Thank you for visiting and taking the time to share your experience with us.",
      "Thank you for your lovely feedback! We aim to create a comfortable and welcoming place for everyone, and we're glad you enjoyed the atmosphere. Hope to see you again!",
    ],
    family_kids: [
      "We're so happy your family had a wonderful time with us! Seeing children enjoy meeting our capybaras and discovering the animals is always a joy. Thank you for sharing these special family moments with us!",
      "Thank you for bringing your family to Capybara Coffee! We're delighted the little ones enjoyed their visit. We hope you all left with lovely memories and look forward to seeing you again!",
      "Thank you for visiting with your family! We're happy to hear you and the children enjoyed spending time with our animals. We hope to welcome you all back again!",
      "We appreciate your lovely review! It's always a pleasure to welcome families and see children discovering our capybaras. Thank you for sharing your experience with us!",
    ],
  },
  4: {
    generic: [
      "Thank you for your 4-star review! We appreciate your feedback. If there's anything we can improve for a 5-star experience next time, feel free to reach out at contact@capybaracoffeethailand.com",
      "Thanks a lot for the 4 stars! We're glad you had a good experience and we're always trying to improve—if you have suggestions, we'd love to hear them.",
      "We really appreciate your 4-star rating. Knowing what you enjoyed (and what we can do better) helps us keep improving. Thank you for visiting us.",
      "Thank you for taking the time to leave a 4-star review! We hope your next visit can be a full 5-star experience. Feel free to share any ideas with us.",
      "Thanks for the 4 stars! We're happy you had a nice time and we're always working on the little details to make every visit even better.",
      "Thank you for your 4-star review! We appreciate your feedback and hope to see you again soon!",
      "Thanks a lot for the 4 stars! We're glad you had a good experience and we're always trying to improve—if you have suggestions, we'd love to hear them.",
      "We really appreciate your 4-star rating. Knowing what you enjoyed (and what we can do better) helps us keep improving. Thank you for visiting us.",
      "Thank you for taking the time to leave a 4-star review! We hope your next visit can be a full 5-star experience. Feel free to share any ideas with us.",
      "Thanks for the 4 stars! We're happy you had a nice time and we're always working on the little details to make every visit even better.",
    ],
    staff: [
      "Thank you for your 4-star review and for mentioning our staff. We're happy to hear they helped make your visit enjoyable and we'll keep doing our best for next time.",
    ],
    animal_care: [
      "Thank you for the 4 stars and for your kind words about the animals. Their care is very important to us, and we appreciate that you took the time to notice and share that.",
    ],
    environment: [
      "Thanks for your 4-star review and your comments about the environment and atmosphere. We're glad you enjoyed it and we'll keep improving to reach that 5-star feeling.",
    ],
    family_kids: [
      "Thank you for bringing your family to Capybara Coffee! We're delighted the little ones enjoyed their visit. We hope you all left with lovely memories and look forward to seeing you again!",
      "Thank you for visiting with your family! We're happy to hear you and the children enjoyed spending time with our animals. We hope to welcome you all back again!",
      "We appreciate your lovely review! It's always a pleasure to welcome families and see children discovering our capybaras. Thank you for sharing your experience with us!",
      "Thank you for your family review! We're glad you had a lovely time with us and hope to welcome you all back again soon!",
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