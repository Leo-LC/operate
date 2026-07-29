import type { TaxArticle } from "../types";
import { SOURCES } from "../sources";

export const VAT_ARTICLES: TaxArticle[] = [
  {
    id: "vat-pp30",
    slug: "vat-pp30",
    category: "vat",
    priority: "P1",
    status: "active",
    cadence: "monthly",
    audience: ["manager", "accounting"],
    tags: ["monthly", "cashflow", "important", "sales-tax"],
    forms: ["PP.30"],
    title: { fr: "TVA — PP.30 mensuel", en: "VAT — Monthly PP.30" },
    summary: {
      fr: "La déclaration mensuelle de TVA sur les ventes taxables, récupérable sur les achats valides.",
      en: "The monthly VAT return on taxable sales, recoverable on valid business purchases.",
    },
    overview: {
      fr: [
        "La TVA est une taxe indirecte collectée sur les ventes taxables et récupérable sur les achats valides.",
        "Une entreprise qui dépasse 1,8 million THB de chiffre d'affaires annuel taxable doit s'enregistrer à la TVA.",
        "Le taux effectif standard est 7% jusqu'au 30 septembre 2026, sauf nouvelle extension.",
        "PP.30 est la déclaration mensuelle de TVA, même si le mois est à zéro.",
      ],
      en: [
        "VAT is an indirect tax collected on taxable sales and recoverable on valid business purchases.",
        "A business exceeding THB 1.8 million of annual taxable turnover must register for VAT.",
        "The effective standard rate is 7% until 30 September 2026 unless extended again.",
        "PP.30 is the monthly VAT return, even when the month is nil.",
      ],
    },
    details: {
      fr: [
        "TVA à payer = TVA collectée sur les ventes − TVA récupérable sur les achats avec tax invoice valide.",
        "Deadline pratique : papier généralement le 15 du mois suivant ; e-filing bénéficie d'une extension de 8 jours, généralement jusqu'au 23.",
        "Les exports peuvent être à 0% ; certaines activités sont exemptées. Ne pas confondre zéro-rated et exempt.",
        "Les tax invoices doivent être conservées et rapprochées avec les paiements et les ventes Loyverse/banque.",
      ],
      en: [
        "VAT payable = output VAT on sales − input VAT on valid purchases supported by tax invoices.",
        "Practical deadline: paper filing is generally due on the 15th of the following month; e-filing currently has an 8-day extension, usually to the 23rd.",
        "Exports may be zero-rated; some activities are exempt. Do not confuse zero-rated and exempt.",
        "Tax invoices must be retained and reconciled with payments and Loyverse/bank sales.",
      ],
    },
    example: {
      fr: "Si le shop collecte 70 000 THB de VAT sur les ventes et possède 18 000 THB de VAT récupérable sur les achats, la TVA nette à payer est 52 000 THB. Cette somme doit être provisionnée en treasury.",
      en: "If the shop collects THB 70,000 output VAT and has THB 18,000 valid input VAT, net VAT payable is THB 52,000. Treasury should reserve this amount.",
    },
    commonMistakes: {
      fr: ["Confondre chiffre d'affaires et TVA collectée", "Confondre zéro-rated et exempt", "Déduire de la TVA sans tax invoice valide"],
      en: ["Confusing revenue with output VAT", "Confusing zero-rated and exempt", "Deducting VAT without a valid tax invoice"],
    },
    relatedArticles: ["vat-registration-tax-invoice", "pp36-imported-services", "fiscal-calendar", "treasury-tax-planning"],
    prerequisites: ["tax-flow-basics"],
    nextArticles: ["vat-registration-tax-invoice", "fiscal-calendar"],
    aliases: ["TVA", "VAT", "PP.30", "PP30"],
    sources: [SOURCES.S1, SOURCES.S5, SOURCES.S6],
  },
  {
    id: "vat-registration-tax-invoice",
    slug: "vat-registration-tax-invoice",
    category: "vat",
    priority: "P1",
    status: "active",
    cadence: "occasional",
    audience: ["owner", "accounting", "manager"],
    tags: ["vat", "setup", "evidence", "tax-invoice"],
    forms: ["VAT registration docs", "Tax invoices"],
    title: { fr: "Enregistrement TVA & Tax Invoice", en: "VAT registration and tax invoices" },
    summary: {
      fr: "Quand s'enregistrer à la TVA et quels justificatifs sont nécessaires pour récupérer la TVA sur achats.",
      en: "When to register for VAT and what evidence is required to recover input VAT.",
    },
    overview: {
      fr: [
        "Cet article explique quand l'entreprise doit s'enregistrer à la TVA et quels justificatifs sont nécessaires pour récupérer la TVA sur achats.",
        "Le seuil de référence est 1,8 million THB de chiffre d'affaires annuel taxable.",
        "Sans tax invoice valide au nom de la société, la TVA d'achat risque de ne pas être récupérable.",
      ],
      en: [
        "This article explains when the company must register for VAT and what evidence is required to recover input VAT.",
        "The reference threshold is THB 1.8 million annual taxable turnover.",
        "Without a valid tax invoice in the company name, input VAT may not be recoverable.",
      ],
    },
    details: {
      fr: [
        "Créer une checklist : nom légal, tax ID, adresse fiscale, date, numéro invoice, description, base HT, TVA, total TTC.",
        "Former les shops : une receipt simple n'est pas toujours une tax invoice.",
        "Les gros fournisseurs récurrents doivent être configurés avec les informations société correctes dès le départ.",
      ],
      en: [
        "Create a checklist: legal name, tax ID, registered address, date, invoice number, description, VAT-exclusive base, VAT, VAT-inclusive total.",
        "Train shops: a simple receipt is not always a tax invoice.",
        "Recurring major suppliers must use the correct company details from day one.",
      ],
    },
    example: {
      fr: "Un achat de matériel à 10 700 THB TTC sans tax invoice valide peut perdre 700 THB de TVA récupérable. Répété chaque mois, cela devient une fuite cashflow invisible.",
      en: "A THB 10,700 VAT-inclusive equipment purchase without a valid tax invoice may lose THB 700 of recoverable VAT. Repeated monthly, this becomes hidden cash leakage.",
    },
    relatedArticles: ["accounting-records-evidence", "vat-pp30", "treasury-tax-planning"],
    prerequisites: ["vat-pp30"],
    nextArticles: ["accounting-records-evidence"],
    aliases: ["tax invoice", "enregistrement TVA", "VAT registration"],
    sources: [SOURCES.S1, SOURCES.S5],
  },
  {
    id: "pp36-imported-services",
    slug: "pp36-imported-services",
    category: "vat",
    priority: "P1",
    status: "active",
    cadence: "monthly",
    audience: ["accounting", "manager"],
    tags: ["monthly", "vat", "foreign-suppliers", "common-mistake"],
    forms: ["PP.36"],
    title: { fr: "PP.36 — TVA sur services étrangers", en: "PP.36 — VAT on imported services" },
    summary: {
      fr: "TVA auto-déclarée sur certains services achetés à l'étranger et utilisés en Thaïlande (Google Ads, Meta Ads, SaaS).",
      en: "Self-assessed VAT on foreign services purchased from abroad and used in Thailand (Google Ads, Meta Ads, SaaS).",
    },
    overview: {
      fr: [
        "PP.36 concerne la TVA auto-déclarée sur certains services achetés à l'étranger et utilisés en Thaïlande.",
        "Exemples fréquents : Google Ads, Meta Ads, logiciel SaaS, plateformes étrangères, abonnements utilisés pour le business thaïlandais.",
        "C'est important pour Capybara Coffee car le marketing digital et les outils SaaS sont récurrents.",
      ],
      en: [
        "PP.36 covers self-assessed VAT on certain foreign services purchased from abroad and used in Thailand.",
        "Common examples: Google Ads, Meta Ads, SaaS tools, foreign platforms and subscriptions used for the Thai business.",
        "It matters for Capybara Coffee because digital marketing and SaaS tools are recurring.",
      ],
    },
    details: {
      fr: [
        "L'entreprise thaïlandaise peut devoir déclarer et payer la TVA elle-même si le fournisseur étranger ne facture pas correctement la VAT thaïlandaise.",
        "À rapprocher avec les relevés de carte bancaire, abonnements, factures Google/Meta/Canva/Adobe/booking tools.",
        "Doit apparaître dans le calendrier mensuel accounting.",
      ],
      en: [
        "The Thai company may need to declare and pay VAT itself when the foreign supplier does not correctly charge Thai VAT.",
        "Reconcile it with card statements, subscriptions and invoices from Google, Meta, Canva, Adobe and booking tools.",
        "It should be included in the monthly accounting calendar.",
      ],
    },
    example: {
      fr: "Si Meta facture 30 000 THB de publicité sans VAT thaïlandaise correctement collectée, il faut vérifier si PP.36 s'applique et provisionner la TVA correspondante.",
      en: "If Meta invoices THB 30,000 of advertising without properly charging Thai VAT, accounting should check whether PP.36 applies and reserve the VAT amount.",
    },
    relatedArticles: ["vat-pp30", "accounting-records-evidence", "fiscal-calendar"],
    prerequisites: ["vat-pp30"],
    nextArticles: ["fiscal-calendar"],
    aliases: ["PP.36", "PP36", "imported services", "services étrangers"],
    sources: [SOURCES.S1, SOURCES.S4],
  },
];
