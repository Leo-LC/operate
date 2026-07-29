import type { TaxArticle } from "../types";
import { SOURCES } from "../sources";

export const CIT_ARTICLES: TaxArticle[] = [
  {
    id: "cit-overview",
    slug: "cit-overview",
    category: "cit",
    priority: "P1",
    status: "active",
    cadence: "half-year",
    audience: ["owner", "accounting", "manager"],
    tags: ["annual", "half-year", "cashflow", "important"],
    forms: ["PND.50", "PND.51"],
    title: { fr: "Impôt sur les sociétés (CIT)", en: "Corporate Income Tax (CIT)" },
    summary: {
      fr: "L'impôt sur le bénéfice net imposable de la société, avec deux échéances : acompte mi-exercice et déclaration annuelle.",
      en: "Tax on the company's taxable net profit, with two main milestones: half-year prepayment and annual return.",
    },
    overview: {
      fr: [
        "Le CIT est l'impôt sur le bénéfice net imposable de la société, pas sur le chiffre d'affaires.",
        "Taux standard : 20% du bénéfice net. Les PME qualifiées peuvent appliquer 0% / 15% / 20% par tranches.",
        "Deux échéances principales : acompte mi-exercice PND.51 et déclaration annuelle PND.50.",
      ],
      en: [
        "CIT is tax on the company's taxable net profit, not revenue.",
        "Standard rate: 20% of net profit. Qualified SMEs may apply progressive 0% / 15% / 20% brackets.",
        "Two main milestones: half-year prepayment PND.51 and annual return PND.50.",
      ],
    },
    details: {
      fr: [
        "Bénéfice imposable = revenus fiscaux − charges fiscalement déductibles − amortissements/ajustements autorisés.",
        "Double condition PME : capital payé ≤ 5M THB et revenus ventes/services ≤ 30M THB.",
        "Les WHT subies par la société peuvent devenir des crédits d'impôt dans la déclaration annuelle.",
        "La sous-estimation PND.51 peut déclencher une surcharge de 20% sur le shortfall si l'écart dépasse 25% sans raison valable.",
      ],
      en: [
        "Taxable profit = taxable income − tax-deductible expenses − allowed depreciation/adjustments.",
        "SME double condition: paid-up capital ≤ THB 5M and revenue from sales/services ≤ THB 30M.",
        "WHT suffered by the company may become a tax credit in the annual return.",
        "PND.51 underestimation may trigger a 20% surcharge on the shortfall if the estimate is more than 25% below actual profit without justifiable reason.",
      ],
    },
    example: {
      fr: "PME avec bénéfice net 2 500 000 THB : 0% sur 300 000 puis 15% sur 2 200 000 = 330 000 THB. Hors PME : 20% x 2 500 000 = 500 000 THB.",
      en: "SME with THB 2,500,000 net profit: 0% on THB 300,000 then 15% on THB 2,200,000 = THB 330,000. Outside SME: 20% x THB 2,500,000 = THB 500,000.",
    },
    commonMistakes: {
      fr: ["Confondre CA et bénéfice", "Oublier la double condition PME", "Sous-estimer le PND.51"],
      en: ["Confusing revenue and profit", "Forgetting the SME double condition", "Underestimating PND.51"],
    },
    relatedArticles: ["pnd51", "pnd50", "sme-progressive-rates", "dividends-overview", "dbd-financial-statements", "treasury-tax-planning"],
    prerequisites: ["tax-flow-basics", "deductible-expenses"],
    nextArticles: ["pnd51", "pnd50", "sme-progressive-rates"],
    aliases: ["CIT", "impôt sur les sociétés", "corporate income tax"],
    sources: [SOURCES.S2, SOURCES.S3, SOURCES.S4, SOURCES.S12],
  },
  {
    id: "sme-progressive-rates",
    slug: "sme-progressive-rates",
    category: "cit",
    priority: "P1",
    status: "active",
    cadence: "annual",
    audience: ["owner", "accounting"],
    tags: ["cit", "sme", "rates", "common-mistake"],
    forms: ["PND.50", "PND.51"],
    title: { fr: "PME — Taux progressifs CIT", en: "SME progressive CIT rates" },
    summary: {
      fr: "Article dédié aux conditions et tranches PME : capital ≤ 5M THB, revenus ≤ 30M THB, tranches 0% / 15% / 20%.",
      en: "Dedicated article for SME conditions and brackets: capital ≤ THB 5M, revenue ≤ THB 30M, 0% / 15% / 20% brackets.",
    },
    overview: {
      fr: [
        "Article distinct du CIT : il explique uniquement les conditions et tranches PME.",
        "Conditions principales : capital payé ≤ 5M THB et revenus ventes/services ≤ 30M THB.",
        "Tranches actuelles : 0% jusqu'à 300 000 THB de bénéfice net, 15% de 300 001 à 3 000 000 THB, 20% au-dessus.",
      ],
      en: [
        "Separate article from CIT: it only explains SME conditions and brackets.",
        "Main conditions: paid-up capital ≤ THB 5M and sales/services revenue ≤ THB 30M.",
        "Current brackets: 0% up to THB 300,000 net profit, 15% from THB 300,001 to THB 3,000,000, 20% above.",
      ],
    },
    details: {
      fr: [
        "Les deux conditions doivent être remplies ; si une condition échoue, l'entreprise revient au taux standard 20%.",
        "Ne pas confondre revenue/CA et bénéfice : le seuil 30M THB concerne le revenu ventes/services, les tranches concernent le bénéfice net.",
        "Cet article corrige le bug historique de la wiki : le clic sur « PME — Taux progressifs » ouvrait la page CIT générale au lieu de cet article dédié.",
      ],
      en: [
        "Both conditions must be met; if one condition fails, the company falls back to the standard 20% rate.",
        "Do not confuse revenue and profit: the THB 30M threshold is revenue, while brackets apply to net profit.",
        "This article fixes the wiki's historical bug: clicking SME progressive rates used to open the generic CIT page instead of this dedicated article.",
      ],
    },
    example: {
      fr: "Société avec capital 2M THB, CA 25M THB, bénéfice 2,5M THB : éligible PME. Si CA 35M THB, elle perd l'éligibilité et applique 20% sur tout le bénéfice imposable.",
      en: "Company with THB 2M capital, THB 25M revenue and THB 2.5M profit: SME eligible. If revenue is THB 35M, it loses eligibility and applies 20% to all taxable profit.",
    },
    commonMistakes: {
      fr: ["Confondre le seuil de revenu (30M) avec les tranches de bénéfice", "Oublier de revérifier l'éligibilité chaque année"],
      en: ["Confusing the revenue threshold (30M) with profit brackets", "Forgetting to re-check eligibility every year"],
    },
    relatedArticles: ["pnd50", "pnd51", "tax-flow-basics"],
    prerequisites: ["cit-overview"],
    nextArticles: ["pnd51", "pnd50"],
    aliases: ["PME", "SME", "taux progressifs", "progressive rates"],
    sources: [SOURCES.S3, SOURCES.S12],
  },
  {
    id: "pnd51",
    slug: "pnd51",
    category: "cit",
    priority: "P1",
    status: "active",
    cadence: "half-year",
    audience: ["owner", "accounting"],
    tags: ["half-year", "cashflow", "penalty-risk", "important"],
    forms: ["PND.51"],
    title: { fr: "PND.51 — Acompte CIT mi-exercice", en: "PND.51 — Half-year CIT prepayment" },
    summary: {
      fr: "Acompte de Corporate Income Tax basé sur une estimation du bénéfice annuel, à déposer à mi-exercice.",
      en: "Corporate Income Tax prepayment based on estimated annual profit, due at the half-year mark.",
    },
    overview: {
      fr: [
        "PND.51 est l'acompte de Corporate Income Tax à déposer à mi-exercice.",
        "Il se base sur une estimation du bénéfice annuel et non simplement sur le bénéfice réel des 6 premiers mois.",
        "Deadline générale : dans les 2 mois suivant la fin des 6 premiers mois de l'exercice.",
      ],
      en: [
        "PND.51 is the half-year Corporate Income Tax prepayment return.",
        "It is based on estimated annual profit, not simply the actual first-half profit.",
        "General deadline: within 2 months after the end of the first 6 months of the accounting period.",
      ],
    },
    details: {
      fr: [
        "Calcul typique : estimer le CIT annuel, payer 50% en acompte, puis déduire cet acompte du PND.50 annuel.",
        "Pour exercice 1 Jan – 31 Déc, les 6 premiers mois finissent au 30 Juin, donc deadline papier généralement 31 Août ; e-filing peut ajouter 8 jours.",
        "Risque critique : sous-estimer de plus de 25% le bénéfice annuel réel peut entraîner une surcharge de 20% sur le manque à payer, sauf justification.",
      ],
      en: [
        "Typical calculation: estimate annual CIT, pay 50% as a prepayment, then credit it against the annual PND.50.",
        "For a Jan 1 – Dec 31 year, the first six months end on June 30, so paper deadline is generally August 31; e-filing may add 8 days.",
        "Critical risk: underestimating annual profit by more than 25% may trigger a 20% surcharge on the shortfall unless justified.",
      ],
    },
    example: {
      fr: "CIT annuel estimé 400 000 THB → PND.51 environ 200 000 THB. Si la société finit l'année avec un CIT réel beaucoup plus élevé et une estimation non justifiable, pénalité possible.",
      en: "Estimated annual CIT THB 400,000 → PND.51 around THB 200,000. If the year-end CIT is much higher and the estimate is not justifiable, penalties may apply.",
    },
    relatedArticles: ["pnd50", "sme-progressive-rates", "fiscal-calendar"],
    prerequisites: ["cit-overview", "treasury-tax-planning"],
    nextArticles: ["pnd50"],
    aliases: ["PND.51", "PND51", "acompte CIT"],
    sources: [SOURCES.S4, SOURCES.S12, SOURCES.S13],
  },
  {
    id: "pnd50",
    slug: "pnd50",
    category: "cit",
    priority: "P1",
    status: "active",
    cadence: "annual",
    audience: ["owner", "accounting"],
    tags: ["annual", "cit", "financial-statements", "important"],
    forms: ["PND.50"],
    title: { fr: "PND.50 — Déclaration annuelle CIT", en: "PND.50 — Annual CIT return" },
    summary: {
      fr: "La déclaration annuelle qui détermine le CIT final après résultat fiscal, crédits WHT et acompte PND.51.",
      en: "The annual return that determines final CIT after taxable result, WHT credits and PND.51 prepayment.",
    },
    overview: {
      fr: [
        "PND.50 est la déclaration annuelle de Corporate Income Tax.",
        "Elle détermine le CIT final après résultat fiscal, crédits WHT et acompte PND.51.",
        "Deadline générale : dans les 150 jours suivant la clôture de l'exercice.",
      ],
      en: [
        "PND.50 is the annual Corporate Income Tax return.",
        "It determines the final CIT after taxable result, WHT credits and PND.51 prepayment.",
        "General deadline: within 150 days from the accounting period closing date.",
      ],
    },
    details: {
      fr: [
        "La déclaration utilise les états financiers, ajustements fiscaux, amortissements, charges non déductibles, WHT credits et acomptes.",
        "Pour clôture 31 décembre, le délai tombe généralement fin mai ; l'e-filing peut prolonger de quelques jours selon règles en vigueur.",
        "À connecter avec DBD financial statements et AGM : ne pas traiter PND.50 comme une tâche isolée.",
      ],
      en: [
        "The return uses financial statements, tax adjustments, depreciation, non-deductible expenses, WHT credits and prepayments.",
        "For a 31 December year-end, the deadline is generally late May; e-filing may extend by a few days depending on current rules.",
        "Connect it with DBD financial statements and AGM: do not treat PND.50 as an isolated task.",
      ],
    },
    example: {
      fr: "Si CIT final = 600 000 THB et PND.51 déjà payé = 200 000 THB, solde CIT annuel à payer = 400 000 THB, avant prise en compte d'éventuels crédits WHT.",
      en: "If final CIT = THB 600,000 and PND.51 paid = THB 200,000, annual CIT balance payable = THB 400,000, before any WHT credits.",
    },
    relatedArticles: ["pnd51", "sme-progressive-rates", "deductible-expenses", "fiscal-calendar"],
    prerequisites: ["cit-overview", "dbd-financial-statements"],
    nextArticles: ["dividends-overview", "dbd-financial-statements"],
    aliases: ["PND.50", "PND50", "déclaration annuelle CIT"],
    sources: [SOURCES.S2, SOURCES.S4],
  },
  {
    id: "deductible-expenses",
    slug: "deductible-expenses",
    category: "cit",
    priority: "P1",
    status: "active",
    cadence: "permanent",
    audience: ["manager", "accounting"],
    tags: ["cit", "evidence", "expenses", "common-mistake"],
    forms: ["PND.50 working papers"],
    title: { fr: "Charges déductibles & non déductibles", en: "Deductible and non-deductible expenses" },
    summary: {
      fr: "Les charges réduisent le bénéfice imposable uniquement si elles sont business-related, justifiées et fiscalement acceptées.",
      en: "Expenses reduce taxable profit only when business-related, supported and tax-allowable.",
    },
    overview: {
      fr: [
        "Les charges réduisent le bénéfice imposable uniquement si elles sont business-related, justifiées et fiscalement acceptées.",
        "Les dépenses personnelles ou mal documentées peuvent être rejetées.",
        "Cet article est essentiel pour que les managers comprennent pourquoi les justificatifs sont obligatoires.",
      ],
      en: [
        "Expenses reduce taxable profit only when business-related, supported and tax-allowable.",
        "Personal or poorly documented expenses may be disallowed.",
        "This article is essential so managers understand why supporting evidence is mandatory.",
      ],
    },
    details: {
      fr: [
        "Déductibles fréquents : salaires, loyers, marchandises, marketing sous conditions, amortissements, cotisations employeur.",
        "Non déductibles fréquents : CIT lui-même, amendes/pénalités, dépenses personnelles du dirigeant, provisions non autorisées, dépenses sans justificatif suffisant.",
        "Créer un flux : achat → justificatif → catégorie comptable → déductibilité → impact CIT.",
      ],
      en: [
        "Common deductible items: salaries, rent, goods, marketing under conditions, depreciation, employer contributions.",
        "Common non-deductible items: CIT itself, fines/penalties, personal expenses of directors, unauthorized provisions, insufficiently supported expenses.",
        "Create a flow: purchase → evidence → accounting category → deductibility → CIT impact.",
      ],
    },
    example: {
      fr: "Une dépense de 50 000 THB avec facture correcte peut réduire le bénéfice imposable. La même dépense sans justificatif ou à usage personnel peut être rejetée et augmenter le CIT.",
      en: "A THB 50,000 expense with proper invoice may reduce taxable profit. The same expense without support or for personal use may be rejected and increase CIT.",
    },
    relatedArticles: ["cit-overview", "accounting-records-evidence", "pnd50"],
    prerequisites: ["tax-flow-basics"],
    nextArticles: ["cit-overview"],
    aliases: ["charges déductibles", "deductible expenses"],
    sources: [SOURCES.S2, SOURCES.S14],
  },
];
