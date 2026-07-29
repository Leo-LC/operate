import type { TaxCategory } from "./types";

export interface TaxFamily {
  category: TaxCategory;
  icon: string;
  label: Record<"fr" | "en", string>;
  description: Record<"fr" | "en", string>;
  priority: "P1" | "P2";
  /** Ordered slugs belonging to this family, used to render the category card article list */
  slugs: string[];
}

export const TAX_FAMILIES: TaxFamily[] = [
  {
    category: "bases",
    icon: "🧭",
    label: { fr: "Bases fiscales", en: "Tax basics" },
    description: {
      fr: "Comprendre le flux CA → TVA → charges → profit → taxes.",
      en: "Understand the revenue → VAT → expenses → profit → tax flow.",
    },
    priority: "P1",
    slugs: ["tax-flow-basics"],
  },
  {
    category: "vat",
    icon: "🧾",
    label: { fr: "Ventes & taxes indirectes", en: "Sales & indirect taxes" },
    description: {
      fr: "Gérer la TVA mensuelle, les tax invoices et la TVA sur services étrangers.",
      en: "Manage monthly VAT, tax invoices and VAT on foreign services.",
    },
    priority: "P1",
    slugs: ["vat-pp30", "vat-registration-tax-invoice", "pp36-imported-services"],
  },
  {
    category: "wht",
    icon: "🪙",
    label: { fr: "Retenues à la source (WHT)", en: "Withholding tax (WHT)" },
    description: {
      fr: "Payer les fournisseurs correctement et déclarer les retenues.",
      en: "Pay suppliers correctly and file withholding tax returns.",
    },
    priority: "P1",
    slugs: [
      "wht-overview",
      "wht-services-pnd3-53",
      "wht-rent-pnd3-53",
      "wht-goods-transport",
      "wht-dividends-resident",
      "wht-non-residents-pnd54",
    ],
  },
  {
    category: "cit",
    icon: "🏢",
    label: { fr: "Impôt sur les sociétés (CIT)", en: "Corporate income tax (CIT)" },
    description: {
      fr: "Prévoir et déclarer l'impôt sur le bénéfice de la société.",
      en: "Plan and file corporate income tax on company profit.",
    },
    priority: "P1",
    slugs: ["cit-overview", "sme-progressive-rates", "pnd51", "pnd50", "deductible-expenses"],
  },
  {
    category: "payroll",
    icon: "👥",
    label: { fr: "Paie & charges sociales", en: "Payroll & social charges" },
    description: {
      fr: "PIT salarié, sécurité sociale (SSF) et fonds d'indemnisation (WCF).",
      en: "Employee PIT, social security (SSF) and workmen's compensation (WCF).",
    },
    priority: "P1",
    slugs: ["payroll-overview", "ssf", "employee-pit-pnd1", "pnd1-kor-annual-payroll", "wcf"],
  },
  {
    category: "dividends",
    icon: "💰",
    label: { fr: "Dividendes & distributions", en: "Dividends & distributions" },
    description: {
      fr: "Distribuer légalement sans casser la trésorerie.",
      en: "Distribute profits legally without breaking cashflow.",
    },
    priority: "P2",
    slugs: ["dividends-overview"],
  },
  {
    category: "calendar-treasury",
    icon: "📅",
    label: { fr: "Calendrier & Treasury", en: "Calendar & Treasury" },
    description: {
      fr: "Transformer la connaissance en actions et en réserves de cash.",
      en: "Turn knowledge into actions and cash reserves.",
    },
    priority: "P1",
    slugs: [
      "fiscal-calendar",
      "treasury-tax-planning",
      "dbd-financial-statements",
      "accounting-records-evidence",
      "stamp-duty",
      "sbt",
    ],
  },
];

/** Slugs handled outside the main 7 families, surfaced via a dedicated linked card on the home page. */
export const PERSONAL_FAMILY = {
  category: "personal" as TaxCategory,
  icon: "🛂",
  label: { fr: "Personnel / Visa / Permis de travail", en: "Personal / Visa / Work permit" },
  description: {
    fr: "Informations sur les visas, permis de travail et obligations RH pour les employés étrangers.",
    en: "Information on visas, work permits and HR obligations for foreign employees.",
  },
  slugs: ["personal-tax-residency-pit", "annual-pit-pnd90-91", "foreign-employee-work-permit"],
  entrySlug: "personal-tax-residency-pit",
};
