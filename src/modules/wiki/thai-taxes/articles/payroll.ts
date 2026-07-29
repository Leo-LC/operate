import type { TaxArticle } from "../types";
import { SOURCES } from "../sources";

export const PAYROLL_ARTICLES: TaxArticle[] = [
  {
    id: "payroll-overview",
    slug: "payroll-overview",
    category: "payroll",
    priority: "P1",
    status: "active",
    cadence: "monthly",
    audience: ["manager", "hr", "accounting"],
    tags: ["payroll", "monthly", "hr", "important"],
    forms: ["PND.1", "SSO", "WCF", "PND.1 Kor"],
    title: { fr: "Paie — Vue d'ensemble fiscale et sociale", en: "Payroll — Tax and social overview" },
    summary: {
      fr: "Trois familles d'obligations : salaire net, retenue PIT salarié, contributions sociales SSF/WCF.",
      en: "Three main families: net salary, employee PIT withholding and social contributions SSF/WCF.",
    },
    overview: {
      fr: [
        "La paie crée trois familles principales : salaire net, retenue PIT salarié, contributions sociales SSF/WCF.",
        "Le salaire brut n'est pas le coût total employeur, et le salaire net n'est pas le brut.",
        "Les obligations paie doivent être liées au calendrier mensuel.",
      ],
      en: [
        "Payroll creates three main families: net salary, employee PIT withholding and social contributions SSF/WCF.",
        "Gross salary is not the total employer cost, and net salary is not gross salary.",
        "Payroll obligations must be linked to the monthly calendar.",
      ],
    },
    details: {
      fr: [
        "Tous les mois : calculer salaire brut, déduire employee PIT si applicable, employee SSF, payer employer SSF, puis déposer déclarations.",
        "Annuel : récapitulatif PND.1 Kor et documents de revenu pour employés.",
        "WCF est une charge employeur séparée, liée au risque de l'activité.",
      ],
      en: [
        "Monthly: calculate gross salary, deduct employee PIT if applicable, employee SSF, pay employer SSF, then file/pay returns.",
        "Annual: PND.1 Kor summary and income documents for employees.",
        "WCF is a separate employer charge linked to business risk.",
      ],
    },
    example: {
      fr: "Salaire brut 20 000 THB : l'employé peut avoir SSF retenue et PIT selon revenu ; l'employeur paie aussi sa part SSF. Le coût entreprise dépasse donc le net payé.",
      en: "Gross salary THB 20,000: the employee may have SSF and PIT withheld; the employer also pays its SSF share. Company cost is therefore higher than net salary paid.",
    },
    relatedArticles: ["ssf", "employee-pit-pnd1", "pnd1-kor-annual-payroll", "wcf", "fiscal-calendar"],
    prerequisites: ["tax-flow-basics"],
    nextArticles: ["ssf", "employee-pit-pnd1"],
    aliases: ["payroll", "paie"],
    sources: [SOURCES.S7, SOURCES.S8, SOURCES.S10],
  },
  {
    id: "ssf",
    slug: "ssf",
    category: "payroll",
    priority: "P1",
    status: "active",
    cadence: "monthly",
    audience: ["hr", "accounting", "manager"],
    tags: ["payroll", "monthly", "social-security", "cashflow"],
    forms: ["SSO monthly filing"],
    title: { fr: "Sécurité sociale (SSF)", en: "Social Security Fund (SSF)" },
    summary: {
      fr: "Contribution obligatoire employeur/employé, 5% chacun du salaire soumis à plafond.",
      en: "Mandatory employer/employee contribution, 5% each of salary subject to a cap.",
    },
    overview: {
      fr: [
        "La SSF est obligatoire pour les employés couverts par le système social thaïlandais.",
        "Employeur et employé contribuent chacun généralement 5% du salaire soumis à plafond.",
        "À partir de 2026, le plafond de salaire utilisé pour le calcul augmente à 17 500 THB selon les mises à jour publiées, soit contribution max 875 THB par partie.",
      ],
      en: [
        "SSF is mandatory for employees covered by the Thai social security system.",
        "Employer and employee generally each contribute 5% of salary subject to a cap.",
        "From 2026, the wage ceiling used for calculation increases to THB 17,500 according to published updates, making the maximum contribution THB 875 per party.",
      ],
    },
    details: {
      fr: [
        "Vérifier chaque année le plafond et les taux, car ils peuvent être modifiés par phase.",
        "La contribution employé est retenue sur salaire ; la contribution employeur est une charge de l'entreprise.",
        "Doit être réconciliée avec payroll, contrats, entrées/sorties salariés.",
      ],
      en: [
        "Check the ceiling and rates every year because they may be phased or amended.",
        "Employee contribution is withheld from salary; employer contribution is a company expense.",
        "Reconcile with payroll, contracts and employee joiner/leaver records.",
      ],
    },
    example: {
      fr: "Salaire 20 000 THB en 2026 : calcul sur plafond 17 500 THB → 5% = 875 THB employé et 875 THB employeur, sous réserve confirmation comptable.",
      en: "Salary THB 20,000 in 2026: calculation on THB 17,500 cap → 5% = THB 875 employee and THB 875 employer, subject to accountant confirmation.",
    },
    relatedArticles: ["employee-pit-pnd1", "wcf", "fiscal-calendar"],
    prerequisites: ["payroll-overview"],
    nextArticles: ["payroll-overview"],
    aliases: ["SSF", "sécurité sociale", "social security"],
    sources: [SOURCES.S7],
  },
  {
    id: "employee-pit-pnd1",
    slug: "employee-pit-pnd1",
    category: "payroll",
    priority: "P1",
    status: "active",
    cadence: "monthly",
    audience: ["hr", "accounting", "manager"],
    tags: ["payroll", "monthly", "pit", "employee-tax"],
    forms: ["PND.1"],
    title: { fr: "PIT salarié (PND.1)", en: "Employee PIT withholding (PND.1)" },
    summary: {
      fr: "L'employeur retient l'impôt salarié applicable et le reverse au Revenue Department.",
      en: "The employer withholds applicable employee income tax and remits it to the Revenue Department.",
    },
    overview: {
      fr: [
        "PND.1 déclare la retenue d'impôt sur les salaires.",
        "L'employeur retient l'impôt salarié applicable et le reverse au Revenue Department.",
        "Le taux dépend du revenu annuel estimé, exemptions et situation de l'employé.",
      ],
      en: [
        "PND.1 reports withholding tax on employment income.",
        "The employer withholds applicable employee income tax and remits it to the Revenue Department.",
        "The rate depends on estimated annual income, allowances and employee situation.",
      ],
    },
    details: {
      fr: [
        "Ne pas appliquer un taux fixe à tous les employés : le calcul se fait selon règles PIT progressives.",
        "Deadline générale WHT : 7 du mois suivant en papier, e-filing généralement 15 avec extension.",
        "Les employés auront besoin des certificats/relevés pour leur déclaration annuelle personnelle.",
      ],
      en: [
        "Do not apply one flat rate to every employee: calculation follows progressive PIT rules.",
        "General WHT deadline: 7th of following month on paper, usually 15th by e-filing with extension.",
        "Employees need certificates/statements for their annual personal tax return.",
      ],
    },
    example: {
      fr: "Un employé avec salaire bas peut n'avoir aucune PIT mensuelle ; un manager avec salaire plus élevé peut avoir une retenue mensuelle importante. Le calcul doit être individualisé.",
      en: "A low-paid employee may have no monthly PIT, while a higher-paid manager may have significant monthly withholding. The calculation must be individual.",
    },
    relatedArticles: ["pnd1-kor-annual-payroll", "personal-tax-residency-pit", "ssf"],
    prerequisites: ["payroll-overview"],
    nextArticles: ["pnd1-kor-annual-payroll"],
    aliases: ["PND.1", "PND1", "PIT salarié"],
    sources: [SOURCES.S4, SOURCES.S5, SOURCES.S10],
  },
  {
    id: "pnd1-kor-annual-payroll",
    slug: "pnd1-kor-annual-payroll",
    category: "payroll",
    priority: "P2",
    status: "active",
    cadence: "annual",
    audience: ["hr", "accounting"],
    tags: ["payroll", "annual", "employee-tax"],
    forms: ["PND.1 Kor", "Withholding certificates"],
    title: { fr: "PND.1 Kor — Récapitulatif annuel paie", en: "PND.1 Kor — Annual payroll summary" },
    summary: {
      fr: "Le récapitulatif annuel des retenues d'impôt salarié, qui clôture l'année payroll.",
      en: "The annual summary of employee tax withholding, closing the payroll tax year.",
    },
    overview: {
      fr: [
        "PND.1 Kor est le récapitulatif annuel des retenues d'impôt salarié.",
        "Il permet de clôturer l'année payroll et d'aider les employés avec leurs déclarations personnelles.",
        "À ne pas oublier dans le calendrier annuel.",
      ],
      en: [
        "PND.1 Kor is the annual summary of employee tax withholding.",
        "It closes the payroll tax year and helps employees with personal tax returns.",
        "It must be included in the annual calendar.",
      ],
    },
    details: {
      fr: [
        "Doit être cohérent avec les PND.1 mensuels, payroll reports, contrats et certificats remis aux employés.",
        "Deadline souvent fin février papier / début mars e-filing selon extensions applicables.",
        "Risque : erreurs cumulées de payroll découvertes trop tard.",
      ],
      en: [
        "Must reconcile with monthly PND.1 filings, payroll reports, contracts and certificates issued to employees.",
        "Deadline is often end of February on paper / early March by e-filing depending on applicable extensions.",
        "Risk: cumulative payroll errors are discovered too late.",
      ],
    },
    example: {
      fr: "Si un employé a eu 12 retenues PND.1 mensuelles, PND.1 Kor consolide ces montants pour l'année et permet de produire le certificat annuel.",
      en: "If an employee had 12 monthly PND.1 withholdings, PND.1 Kor consolidates those amounts for the year and supports the annual certificate.",
    },
    relatedArticles: ["payroll-overview", "personal-tax-residency-pit"],
    prerequisites: ["employee-pit-pnd1"],
    nextArticles: [],
    aliases: ["PND.1 Kor", "PND1 Kor"],
    sources: [SOURCES.S4, SOURCES.S5],
  },
  {
    id: "wcf",
    slug: "wcf",
    category: "payroll",
    priority: "P2",
    status: "active",
    cadence: "annual",
    audience: ["hr", "accounting", "owner"],
    tags: ["payroll", "annual", "employer-only", "risk"],
    forms: ["WCF filing/payment"],
    title: { fr: "Fonds d'indemnisation (WCF)", en: "Workmen Compensation Fund (WCF)" },
    summary: {
      fr: "Contribution employeur seule, liée aux accidents/maladies du travail, taux 0,2% à 1,0%.",
      en: "Employer-only contribution linked to workplace injury/illness compensation, rate 0.2% to 1.0%.",
    },
    overview: {
      fr: [
        "WCF est une contribution employeur liée aux accidents/maladies du travail.",
        "Elle est payée uniquement par l'employeur, pas retenue sur le salaire employé.",
        "Le taux dépend du type d'activité et du risque, souvent dans une fourchette 0,2% à 1,0%.",
      ],
      en: [
        "WCF is an employer contribution linked to workplace injury/illness compensation.",
        "It is paid only by the employer, not withheld from employees.",
        "The rate depends on business activity and risk, often within a 0.2% to 1.0% range.",
      ],
    },
    details: {
      fr: [
        "La base est liée aux salaires annuels avec un plafond par employé selon règles applicables.",
        "À vérifier avec la classification SSO/WCF de chaque société/shop.",
        "Doit apparaître dans treasury annual planning.",
      ],
      en: [
        "The base is linked to annual wages with a cap per employee under applicable rules.",
        "Confirm with each company/shop's SSO/WCF classification.",
        "It should appear in annual treasury planning.",
      ],
    },
    example: {
      fr: "Si la base annuelle plafonnée est 240 000 THB par employé et le taux 0,2%, contribution indicative 480 THB par employé/an ; à confirmer selon code activité.",
      en: "If the capped annual base is THB 240,000 per employee and the rate is 0.2%, indicative contribution is THB 480 per employee/year; confirm by activity code.",
    },
    relatedArticles: ["ssf", "treasury-tax-planning", "fiscal-calendar"],
    prerequisites: ["payroll-overview"],
    nextArticles: [],
    aliases: ["WCF", "fonds d'indemnisation"],
    sources: [SOURCES.S8],
  },
];
