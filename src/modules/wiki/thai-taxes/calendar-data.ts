export interface CalendarEntry {
  code: string;
  description: Record<"fr" | "en", string>;
  slug: string;
}

export interface CalendarColumn {
  key: "monthly" | "half-year" | "annual";
  label: Record<"fr" | "en", string>;
  sub: Record<"fr" | "en", string>;
  entries: CalendarEntry[];
}

export const FISCAL_CALENDAR_COLUMNS: CalendarColumn[] = [
  {
    key: "monthly",
    label: { fr: "Chaque mois", en: "Every month" },
    sub: { fr: "avant le 7 ou le 15", en: "before the 7th or 15th" },
    entries: [
      { code: "PP.30 — TVA", description: { fr: "avant le 15 (23 e-filing)", en: "before the 15th (23rd e-filing)" }, slug: "vat-pp30" },
      { code: "PP.36 — services étrangers", description: { fr: "si applicable, avant le 15", en: "if applicable, before the 15th" }, slug: "pp36-imported-services" },
      { code: "PND.3 / PND.53 — WHT", description: { fr: "avant le 7 (15 e-filing)", en: "before the 7th (15th e-filing)" }, slug: "wht-overview" },
      { code: "PND.1 — PIT salariés", description: { fr: "avant le 7", en: "before the 7th" }, slug: "employee-pit-pnd1" },
      { code: "SSF — Sécurité sociale", description: { fr: "avant le 15", en: "before the 15th" }, slug: "ssf" },
    ],
  },
  {
    key: "half-year",
    label: { fr: "Mi-exercice", en: "Half-year" },
    sub: { fr: "2 mois après le 6e mois", en: "2 months after month 6" },
    entries: [
      { code: "PND.51 — Acompte CIT", description: { fr: "50% de l'impôt estimé", en: "50% of estimated tax" }, slug: "pnd51" },
    ],
  },
  {
    key: "annual",
    label: { fr: "Annuel", en: "Annual" },
    sub: { fr: "150 jours après clôture", en: "150 days after year-end" },
    entries: [
      { code: "PND.50 — Déclaration CIT", description: { fr: "150 jours après clôture", en: "150 days after year-end" }, slug: "pnd50" },
      { code: "PND.1 Kor — Récapitulatif paie", description: { fr: "fin février", en: "end of February" }, slug: "pnd1-kor-annual-payroll" },
      { code: "États financiers / DBD", description: { fr: "5 mois après clôture", en: "5 months after year-end" }, slug: "dbd-financial-statements" },
      { code: "WCF — Fonds d'indemnisation", description: { fr: "avant le 31 janvier", en: "before 31 January" }, slug: "wcf" },
    ],
  },
];
