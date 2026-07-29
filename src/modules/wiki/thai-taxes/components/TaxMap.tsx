"use client";
import Link from "next/link";
import { useWikiLang } from "./LanguageProvider";
import { getArticle } from "../articles";

interface MapNode {
  slug: string;
  icon: string;
  label: Record<"fr" | "en", string>;
  defFr: string;
  defEn: string;
}

const MAIN_FLOW: MapNode[] = [
  { slug: "tax-flow-basics", icon: "💵", label: { fr: "Ventes & revenus", en: "Sales & revenue" }, defFr: "Chiffre d'affaires encaissé, hors VAT.", defEn: "Collected revenue, VAT-exclusive." },
  { slug: "vat-pp30", icon: "🧾", label: { fr: "TVA (VAT)", en: "VAT" }, defFr: "Collectée sur les ventes, déductible sur les achats.", defEn: "Collected on sales, deductible on purchases." },
  { slug: "deductible-expenses", icon: "📦", label: { fr: "Dépenses", en: "Expenses" }, defFr: "Achats et charges déductibles.", defEn: "Purchases and deductible charges." },
  { slug: "payroll-overview", icon: "👥", label: { fr: "Paie & salaires", en: "Payroll" }, defFr: "Rémunération du personnel.", defEn: "Staff compensation." },
  { slug: "cit-overview", icon: "🏢", label: { fr: "Profit net → CIT", en: "Net profit → CIT" }, defFr: "Résultat fiscal de l'exercice, base de l'impôt sociétés.", defEn: "The period's taxable result, the base for corporate tax." },
  { slug: "dbd-financial-statements", icon: "📑", label: { fr: "PND.51/50 → DBD", en: "PND.51/50 → DBD" }, defFr: "Déclarations et dépôt des états financiers.", defEn: "Filings and financial statement submission." },
];

const BRANCHES: (MapNode & { fromLabel: Record<"fr" | "en", string> })[] = [
  { slug: "wht-overview", icon: "🪙", label: { fr: "Retenues fournisseurs (WHT)", en: "Supplier withholding (WHT)" }, defFr: "Retenue sur certains paiements fournisseurs.", defEn: "Withheld on certain supplier payments.", fromLabel: { fr: "↳ branché sur Dépenses", en: "↳ branches off Expenses" } },
  { slug: "ssf", icon: "🏥", label: { fr: "Sécurité sociale (SSF)", en: "Social Security (SSF)" }, defFr: "Contribution employeur/employé sur salaire.", defEn: "Employer/employee salary contribution.", fromLabel: { fr: "↳ branché sur Paie", en: "↳ branches off Payroll" } },
  { slug: "employee-pit-pnd1", icon: "👤", label: { fr: "Impôt salarié (PIT)", en: "Employee PIT" }, defFr: "Retenue mensuelle sur le salaire.", defEn: "Monthly withholding on salary." , fromLabel: { fr: "↳ branché sur Paie", en: "↳ branches off Payroll" } },
  { slug: "dividends-overview", icon: "💰", label: { fr: "Dividendes & distributions", en: "Dividends & distributions" }, defFr: "Distribution du bénéfice aux actionnaires.", defEn: "Profit distribution to shareholders.", fromLabel: { fr: "↳ branché sur CIT", en: "↳ branches off CIT" } },
];

function Node({ node, lang, dark }: { node: MapNode; lang: "fr" | "en"; dark?: boolean }) {
  const article = getArticle(node.slug);
  const def = lang === "fr" ? node.defFr : node.defEn;
  return (
    <Link
      href={`/wiki/thai-taxes/${node.slug}`}
      title={article ? `${article.title[lang]} — ${def}` : def}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 110,
        borderRadius: "var(--r-md)",
        border: `1px solid ${dark ? "rgba(255,255,255,0.14)" : "var(--line)"}`,
        background: dark ? "rgba(255,255,255,0.06)" : "var(--surface)",
        padding: "8px 10px",
        textDecoration: "none",
        transition: "border-color 150ms, transform 150ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--bronze)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.14)" : "var(--line)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <span style={{ fontSize: 15 }}>{node.icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: dark ? "var(--sand)" : "var(--fg)", lineHeight: 1.25 }}>
        {node.label[lang]}
      </span>
    </Link>
  );
}

export function TaxMap() {
  const { lang, t } = useWikiLang();

  return (
    <div style={{ borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p className="eyebrow" style={{ color: "var(--fg-4)" }}>
          {t({ fr: "Vue d'ensemble : comment tout s'articule", en: "Overview: how it all fits together" })}
        </p>
      </div>

      {/* Main flow */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {MAIN_FLOW.map((node, i) => (
          <span key={node.slug} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <span style={{ color: "var(--fg-4)" }}>→</span>}
            <Node node={node} lang={lang} dark />
          </span>
        ))}
      </div>

      {/* Branches */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.1)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {BRANCHES.map((node) => (
          <div key={node.slug} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 9, color: "var(--fg-4)" }}>{node.fromLabel[lang]}</span>
            <Node node={node} lang={lang} dark />
          </div>
        ))}
      </div>

      <p style={{ marginTop: 14, fontSize: 10.5, color: "var(--fg-4)" }}>
        {t({
          fr: "Treasury reçoit tous les impacts cashflow de cette carte.",
          en: "Treasury receives every cashflow impact from this map.",
        })}{" "}
        <Link href="/wiki/thai-taxes/treasury-tax-planning" style={{ color: "var(--bronze)", fontWeight: 600 }}>
          {t({ fr: "Voir Treasury →", en: "See Treasury →" })}
        </Link>
      </p>
    </div>
  );
}
