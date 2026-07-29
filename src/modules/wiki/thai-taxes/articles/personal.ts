import type { TaxArticle } from "../types";
import { SOURCES } from "../sources";

export const PERSONAL_ARTICLES: TaxArticle[] = [
  {
    id: "personal-tax-residency-pit",
    slug: "personal-tax-residency-pit",
    category: "personal",
    priority: "linked-personal",
    status: "active",
    cadence: "annual",
    audience: ["foreign-employee", "owner"],
    tags: ["personal", "pit", "foreigners", "separate-section"],
    forms: ["PND.90", "PND.91"],
    title: { fr: "Perso — Résidence fiscale & PIT", en: "Personal — Tax residency and PIT" },
    summary: {
      fr: "Quand une personne physique peut être résidente fiscale thaïlandaise. À ne pas mélanger avec les obligations société.",
      en: "When an individual may be Thai tax resident. Should not be mixed with company obligations.",
    },
    overview: {
      fr: [
        "Placé dans la page séparée « Personnel / Visa / Work Permit », pas dans le cœur Company Tax.",
        "Explique quand une personne physique peut être résidente fiscale thaïlandaise et imposable sur revenus thaïlandais/étrangers selon règles applicables.",
        "Important pour dirigeants ou employés étrangers, mais à ne pas mélanger avec les obligations société.",
      ],
      en: [
        "Placed in a separate \"Personal / Visa / Work Permit\" page, not in the core Company Tax section.",
        "Explains when an individual may be Thai tax resident and taxable on Thai/foreign income under applicable rules.",
        "Important for foreign owners or employees, but should not be mixed with company obligations.",
      ],
    },
    details: {
      fr: [
        "La résidence fiscale et le traitement des revenus étrangers sont sensibles et doivent être confirmés par un fiscaliste.",
        "Les salariés déclarent généralement via PND.91 si emploi seulement ; PND.90 pour revenus plus larges.",
        "La page doit être informative, pas une recommandation personnalisée.",
      ],
      en: [
        "Tax residence and foreign-income treatment are sensitive and must be confirmed with a tax advisor.",
        "Employees generally use PND.91 if employment income only; PND.90 for broader income.",
        "The page should be informational, not personalized advice.",
      ],
    },
    example: {
      fr: "Un employé étranger payé par une société thaïlandaise aura une retenue PIT mensuelle et peut devoir faire une déclaration annuelle personnelle selon sa situation.",
      en: "A foreign employee paid by a Thai company will have monthly PIT withholding and may need an annual personal tax return depending on their situation.",
    },
    relatedArticles: ["annual-pit-pnd90-91", "foreign-employee-work-permit"],
    prerequisites: ["employee-pit-pnd1"],
    nextArticles: ["annual-pit-pnd90-91"],
    aliases: ["résidence fiscale", "tax residency"],
    sources: [SOURCES.S10, SOURCES.S17],
  },
  {
    id: "annual-pit-pnd90-91",
    slug: "annual-pit-pnd90-91",
    category: "personal",
    priority: "linked-personal",
    status: "active",
    cadence: "annual",
    audience: ["foreign-employee", "owner"],
    tags: ["personal", "annual", "pit", "separate-section"],
    forms: ["PND.90", "PND.91"],
    title: { fr: "Perso — Déclaration annuelle PIT (PND.90/91)", en: "Personal — Annual PIT return (PND.90/91)" },
    summary: {
      fr: "PND.91 pour revenus d'emploi uniquement ; PND.90 pour revenus plus larges.",
      en: "PND.91 for employment income only; PND.90 for broader income types.",
    },
    overview: {
      fr: [
        "PND.91 concerne généralement les personnes avec revenus d'emploi uniquement ; PND.90 couvre des revenus plus larges.",
        "Deadline générale : fin mars suivant l'année fiscale, avec e-filing pouvant prolonger selon règles en vigueur.",
        "À lier avec les certificats de retenue employeur.",
      ],
      en: [
        "PND.91 generally applies to employment income only; PND.90 covers broader income types.",
        "General deadline: end of March following the tax year, with possible e-filing extension under current rules.",
        "Link this to employer withholding certificates.",
      ],
    },
    details: {
      fr: [
        "Le calcul utilise revenu annuel, déductions, allowances, retenues déjà payées et barème progressif.",
        "Les étrangers doivent vérifier statut de résidence fiscale, source des revenus et règles de remittance si concerné.",
        "À séparer de la comptabilité société.",
      ],
      en: [
        "Calculation uses annual income, deductions, allowances, tax already withheld and progressive PIT rates.",
        "Foreigners should check tax residence, income source and remittance rules if relevant.",
        "Keep separate from company accounting.",
      ],
    },
    example: {
      fr: "Un manager salarié reçoit un certificat annuel de retenue. Il l'utilise pour sa déclaration PND.91 et paie ou récupère selon le calcul final.",
      en: "A salaried manager receives an annual withholding certificate. They use it for PND.91 and either pay or receive a refund based on final calculation.",
    },
    relatedArticles: ["employee-pit-pnd1", "pnd1-kor-annual-payroll"],
    prerequisites: ["personal-tax-residency-pit"],
    nextArticles: [],
    aliases: ["PND.90", "PND.91", "PND90", "PND91"],
    sources: [SOURCES.S10],
  },
  {
    id: "foreign-employee-work-permit",
    slug: "foreign-employee-work-permit",
    category: "personal",
    priority: "linked-personal",
    status: "active",
    cadence: "occasional",
    audience: ["owner", "hr", "foreign-employee"],
    tags: ["visa", "work-permit", "hr", "separate-section"],
    forms: ["Work permit docs", "Visa docs"],
    title: { fr: "Perso/RH — Visa, permis de travail & obligations employeur", en: "Personal/HR — Visa, work permit and employer obligations" },
    summary: {
      fr: "Les liens entre statut de séjour, droit de travailler, payroll, PIT et documents société. Checklist interne, pas un substitut d'avocat.",
      en: "The links between stay status, right to work, payroll, PIT and company documents. Internal checklist, not a lawyer substitute.",
    },
    overview: {
      fr: [
        "À traiter dans la section liée « Personnel / Visa / Work Permit ».",
        "Explique les liens entre statut de séjour, droit de travailler, payroll, PIT et documents société.",
        "Ne doit pas remplacer un avocat/agent visa ; c'est une checklist interne.",
      ],
      en: [
        "Handle in the linked \"Personal / Visa / Work Permit\" section.",
        "Explains the links between stay status, right to work, payroll, PIT and company documents.",
        "It must not replace a lawyer/visa agent; it is an internal checklist.",
      ],
    },
    details: {
      fr: [
        "Inclure : documents société, ratio employés thaï/étranger si applicable, salaire minimum selon nationalité/poste si applicable, adresse de travail, renouvellements.",
        "Relier au payroll : un employé étranger légalement payé doit être cohérent avec payroll, PIT et potentiellement SSF.",
        "Mettre en garde contre les zones grises.",
      ],
      en: [
        "Include: company documents, Thai/foreign employee ratio if applicable, minimum salary by nationality/role if applicable, workplace address, renewals.",
        "Link to payroll: a legally paid foreign employee must be consistent with payroll, PIT and potentially SSF.",
        "Warn against grey zones.",
      ],
    },
    example: {
      fr: "Avant d'embaucher ou transférer un manager étranger, vérifier visa/work permit, société sponsor, adresse de travail, payroll déclaré et calendrier de renouvellement.",
      en: "Before hiring or transferring a foreign manager, check visa/work permit, sponsoring company, workplace address, declared payroll and renewal calendar.",
    },
    relatedArticles: ["employee-pit-pnd1", "ssf", "annual-pit-pnd90-91"],
    prerequisites: ["personal-tax-residency-pit"],
    nextArticles: [],
    aliases: ["work permit", "permis de travail", "visa"],
    sources: ["Needs legal/accounting validation"],
  },
];
