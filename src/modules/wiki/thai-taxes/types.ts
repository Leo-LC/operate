export type TaxCategory =
  | "bases"
  | "vat"
  | "wht"
  | "cit"
  | "payroll"
  | "dividends"
  | "calendar-treasury"
  | "personal";

export type TaxPriority = "P1" | "P2" | "P3" | "linked-personal";

export type TaxStatus =
  | "active"
  | "coming-soon"
  | "internal-only"
  | "needs-accountant-validation";

export type TaxCadence =
  | "monthly"
  | "quarterly"
  | "half-year"
  | "annual"
  | "occasional"
  | "permanent";

export type TaxAudience =
  | "manager"
  | "accounting"
  | "owner"
  | "hr"
  | "foreign-employee";

export interface Localized<T> {
  fr: T;
  en: T;
}

export interface TaxArticle {
  id: string;
  slug: string;
  category: TaxCategory;
  priority: TaxPriority;
  status: TaxStatus;
  cadence: TaxCadence;
  audience: TaxAudience[];
  /** Free-form tags, including impact tags: cashflow, legal-risk, payroll, tax-return, payment-required */
  tags: string[];
  forms: string[];
  title: Localized<string>;
  summary: Localized<string>;
  overview: Localized<string[]>;
  details: Localized<string[]>;
  example: Localized<string>;
  commonMistakes?: Localized<string[]>;
  relatedArticles: string[];
  prerequisites: string[];
  nextArticles: string[];
  /** Term aliases that should be auto-linked to this article's slug when found in other articles' body text */
  aliases: string[];
  sources: string[];
}
