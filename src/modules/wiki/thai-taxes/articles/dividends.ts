import type { TaxArticle } from "../types";
import { SOURCES } from "../sources";

export const DIVIDENDS_ARTICLES: TaxArticle[] = [
  {
    id: "dividends-overview",
    slug: "dividends-overview",
    category: "dividends",
    priority: "P2",
    status: "active",
    cadence: "occasional",
    audience: ["owner", "accounting"],
    tags: ["owners", "dividends", "cashflow", "legal"],
    forms: ["Dividend WHT forms", "Minutes", "Shareholder documentation"],
    title: { fr: "Dividendes & distributions", en: "Dividends and distributions" },
    summary: {
      fr: "Distribution de bénéfices aux actionnaires après respect des règles comptables, fiscales et corporate.",
      en: "Distributions of profits to shareholders after accounting, tax and corporate requirements are met.",
    },
    overview: {
      fr: [
        "Les dividendes sont une distribution de bénéfices aux actionnaires après respect des règles comptables, fiscales et corporate.",
        "Ils ne doivent pas être confondus avec un remboursement de frais, salaire ou retrait libre de trésorerie.",
        "À traiter seulement après validation des bénéfices distribuables, CIT, WHT et documents sociaux.",
      ],
      en: [
        "Dividends are distributions of profits to shareholders after accounting, tax and corporate requirements are met.",
        "They should not be confused with expense reimbursement, salary or free cash withdrawal.",
        "Handle only after checking distributable profit, CIT, WHT and corporate documents.",
      ],
    },
    details: {
      fr: [
        "Distribution implique décisions, procès-verbal, vérification des bénéfices et retenue à la source selon bénéficiaire.",
        "Résidents : souvent WHT 10% ; non-résidents : vérifier PND.54 et convention fiscale.",
        "À connecter à treasury car une distribution peut assécher le cash nécessaire aux taxes futures.",
      ],
      en: [
        "Distribution involves decisions, minutes, profit verification and withholding tax depending on the beneficiary.",
        "Residents: often 10% WHT; non-residents: check PND.54 and tax treaty.",
        "Connect to treasury because a dividend can drain cash needed for future taxes.",
      ],
    },
    example: {
      fr: "Une société avec 2M THB de cash ne devrait pas distribuer 2M si TVA, payroll, PND.51 et rent sont dus bientôt. Treasury doit bloquer les réserves avant dividendes.",
      en: "A company with THB 2M cash should not distribute THB 2M if VAT, payroll, PND.51 and rent are due soon. Treasury must reserve obligations before dividends.",
    },
    relatedArticles: ["wht-dividends-resident", "wht-non-residents-pnd54", "treasury-tax-planning"],
    prerequisites: ["cit-overview", "dbd-financial-statements"],
    nextArticles: ["treasury-tax-planning"],
    aliases: ["dividendes", "dividends", "distributions"],
    sources: [SOURCES.S2, SOURCES.S11],
  },
];
