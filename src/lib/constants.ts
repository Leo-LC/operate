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
    id: "star_only",
    label: "Star-only / No Comment",
    description: "For 4★/5★ reviews that left just stars and no written text.",
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
      "A big thank you from all of us at Capybara Coffee! We're so glad your visit was a delightful one. Come back and see us (and the capybaras) anytime!",
      "Reviews like yours make our day! Thank you for the support and for spending part of your day with us. We can't wait to welcome you back!",
      "We're grateful for your five stars! It was a pleasure having you, and we hope every visit with us leaves you smiling. See you next time!",
      "Thank you for the kind words! Our whole team is happy you enjoyed your time with us. Wishing you a wonderful day — and hopefully another visit soon!",
      "So glad we could be part of your day! Thank you for the lovely review and for supporting our little café. You're welcome here anytime!",
      "Your review truly brightened our day! Thank you for choosing us. We hope your next cup of coffee is just as enjoyable as your visit!",
      "Thank you for the wonderful five stars! Nothing makes us happier than knowing our guests leave happy. We look forward to seeing you again!",
      "What a lovely surprise to read your review! Thank you for visiting and for the support. The capybaras and the team hope to see you again soon!",
      "We're delighted your visit was an enjoyable one! Thank you for sharing your experience — it means the world to our small team. See you soon!",
      "Thank you for visiting us and for the great review! We hope our coffee, space, and animals made your day a little brighter. Come back anytime!",
      "We appreciate you taking the time to review your visit! Knowing you left happy is the best thank-you our team could ask for. Hope to see you again!",
      "Thank you for the five stars and the kind words! We'll keep doing our best to make every visit special. You're always welcome at Capybara Coffee!",
      "So happy to hear you had a lovely experience! Thanks a million for the review and for supporting what we do. We hope to greet you again soon!",
      "Your kind review is the perfect encouragement for our team! Thank you for visiting, and we hope your next experience is just as good!",
      "We're thrilled you enjoyed your time with us! Thank you for the support — reviews like this keep our little community growing. See you soon!",
      "Thank you for the wonderful words! We hope the relaxed vibe and friendly faces made your visit memorable. Wishing you many more happy café moments!",
      "Delighted to hear everything was to your liking! Thank you for the review and for choosing to spend time with us. You're welcome back any time!",
      "We're grateful for your visit and your review! It's guests like you that make this place special. We look forward to your next visit!",
      "Thank you for spreading the good word! We're happy your time with us was enjoyable and we hope the rest of your day was too. See you again soon!",
      "Thank you for the stars and the support! We hope you'll come say hello again soon — the capybaras will be waiting!",
    ],
    star_only: [
      "Thank you for the five stars! We're so glad your visit earned a full rating — we hope to welcome you back to Capybara Coffee soon!",
      "Thank you for rating us five stars! Short and sweet — just like we hope your visit was. Hope to see you again soon!",
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
      "Thank you for the four stars and your honest feedback! We're always working to make each visit a little better, and yours helps us do exactly that. Hope to see you again!",
      "We appreciate your rating and your visit! Thanks for taking the time to give feedback — it genuinely helps us improve. Hope your next visit is just as pleasant.",
      "Thanks for stopping by and for the four stars! We're glad you enjoyed your time with us and we'd love to welcome you back for an even better one.",
      "Thank you for the positive rating! If there was anything missing from your visit, we'd genuinely like to know — contact@capybaracoffeethailand.com. We hope to see you again!",
      "Really appreciate the four stars! We're always tweaking the little details to make visits smoother. Thanks for your patience and support — see you next time!",
      "Glad you had a nice time with us! Thank you for the rating — feedback like yours helps us polish the whole experience. Hope to welcome you back soon!",
      "Thank you for your rating and your visit! We're happy you enjoyed it overall and we're always keen to hear what could make it five. Every visit is a chance to improve!",
      "Thanks for the solid four stars! We hope to keep earning a little more with every visit. Come back soon and see what's new at the café!",
      "We're glad your visit was a pleasant one! Thank you for the honest rating — we take all feedback on board as we grow. Hope to see you again!",
      "Appreciate you taking the time to rate your visit! If anything fell short, we'd love the chance to get it right next time. Thanks for the support!",
      "Thank you for the four stars and for visiting us! We're always improving, and we hope we can surprise you positively on your next visit.",
      "Thanks a lot for your rating! It's encouraging to know you had a good time. We'll keep working on the details that turn a good visit into a great one.",
      "We value your feedback, thank you! Glad you enjoyed your visit, and we're sorry if anything wasn't perfect. We hope your next experience earns that extra star!",
      "Thank you for spending time with us and for the rating! We're always happy to hear suggestions that would make your visits even better. See you soon!",
      "Thanks for the lovely rating! We hope the atmosphere and company made up for any small shortcomings. Looking forward to welcoming you again!",
      "Four stars — thank you! We're glad you enjoyed your visit and we're always striving to earn that fifth one. Hope you'll come back and check our progress!",
      "We really appreciate your review and your visit! If anything could be improved, we'd love to hear it. Thank you for the support and hope to see you again!",
      "Thank you for rating your visit! We're glad you had a pleasant time, and we're always grateful to know how we can make the next one even better.",
      "Thanks so much for the four stars! Hearing what you enjoyed keeps us going, and knowing what to improve keeps us humble. Hope to welcome you back!",
      "Thank you for your visit and your feedback! We're continuously polishing the experience and would love to show you a five-star visit next time.",
      "We're happy you enjoyed your time with us — thank you for the rating! Your support and suggestions help shape the café we're building. See you again soon!",
      "Thanks for taking the time to leave your rating! We'd love to know anything that would make your visit perfect — reach out anytime. Hope to see you soon!",
      "Glad your visit was a good one, and thank you for the rating! We're always adding small touches to make each visit better than the last.",
      "Thank you for the rating and for supporting us! We hope we can keep improving and welcoming you back again and again.",
      "Thank you for the four stars! Your visit and your feedback matter to us — we'll keep refining the experience so every next visit feels even better.",
    ],
    star_only: [
      "Thank you for the four stars! We'd love to know what would make your next visit a five-star one — feel free to reach out at contact@capybaracoffeethailand.com.",
      "Thank you for the four stars! We're glad you had a good experience and we're always working to make the next one even better. Hope to see you again!",
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
export const STAR_ONLY_CATEGORY_ID: ReplyCategoryId = "star_only";

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