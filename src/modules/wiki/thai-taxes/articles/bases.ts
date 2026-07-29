import type { TaxArticle } from "../types";
import { SOURCES } from "../sources";

export const BASES_ARTICLES: TaxArticle[] = [
  {
    id: "tax-flow-basics",
    slug: "tax-flow-basics",
    category: "bases",
    priority: "P1",
    status: "active",
    cadence: "permanent",
    audience: ["manager", "owner", "accounting"],
    tags: ["beginner", "overview", "company-tax", "cashflow"],
    forms: [],
    title: {
      fr: "Logique générale des taxes société",
      en: "Company tax flow basics",
    },
    summary: {
      fr: "Le point de départ de la wiki : comprendre le flux chiffre d'affaires → TVA → charges → profit → impôt.",
      en: "The wiki's starting point: understanding the revenue → VAT → expenses → profit → tax flow.",
    },
    overview: {
      fr: [
        "Explique la différence entre chiffre d'affaires, TVA collectée, charges, bénéfice imposable et impôt sur les sociétés.",
        "C'est la porte d'entrée de la wiki : personne ne devrait lire CIT, VAT ou WHT sans comprendre ce flux.",
        "Le point clé : le chiffre d'affaires n'est pas le bénéfice, et la TVA collectée n'est pas de l'argent disponible pour l'entreprise.",
      ],
      en: [
        "Explains the difference between revenue, output VAT, expenses, taxable profit and corporate income tax.",
        "This should be the entry point of the wiki before reading CIT, VAT or WHT articles.",
        "Key point: revenue is not profit, and collected VAT is not free cash for the company.",
      ],
    },
    details: {
      fr: [
        "Flux recommandé : ventes → TVA collectée → dépenses → charges déductibles → bénéfice imposable → CIT → dividendes éventuels.",
        "La WHT intervient au moment de payer certains fournisseurs : l'entreprise retient une partie du paiement et la reverse au Revenue Department.",
        "La paie crée deux obligations distinctes : retenue PIT salarié et contributions sociales SSF/WCF.",
      ],
      en: [
        "Recommended flow: sales → output VAT → expenses → deductible expenses → taxable profit → CIT → possible dividends.",
        "WHT happens when paying certain vendors: the company withholds part of the payment and remits it to the Revenue Department.",
        "Payroll creates separate obligations: employee PIT withholding and social contributions.",
      ],
    },
    example: {
      fr: "Un shop encaisse 1 070 000 THB TTC. Si tout est soumis à TVA 7%, 70 000 THB correspondent à de la TVA collectée. Ce montant ne doit pas être confondu avec la marge ou la trésorerie réellement disponible.",
      en: "A shop collects THB 1,070,000 VAT-inclusive. If all sales are subject to 7% VAT, THB 70,000 is output VAT. It should not be treated as margin or available cash.",
    },
    relatedArticles: ["vat-pp30", "wht-overview", "cit-overview", "payroll-overview", "treasury-tax-planning"],
    prerequisites: [],
    nextArticles: ["vat-pp30", "cit-overview", "fiscal-calendar"],
    aliases: ["tax flow basics", "flux fiscal"],
    sources: [SOURCES.S1, SOURCES.S2, SOURCES.S3, SOURCES.S4],
  },
];
