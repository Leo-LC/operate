import {
  WikiDetailLayout,
  DetailSection,
  FormulaBlock,
  ExampleBlock,
  ExampleFlow,
  ThresholdTable,
  DeadlineCards,
  RelatedCards,
} from "@/modules/wiki/components/WikiDetailLayout";
import { NoteBox } from "@/modules/wiki/components/NoteBox";

export default function CITPage() {
  return (
    <WikiDetailLayout
      breadcrumbs={[
        { label: "Wiki", href: "/dashboard/wiki" },
        { label: "Thai Taxes", href: "/dashboard/wiki/thai-taxes" },
        { label: "CIT" },
      ]}
      hero={{
        rate: "20%",
        name: "Corporate Income Tax — Impôt sur les sociétés",
        subtitle:
          "Impôt sur les bénéfices nets des sociétés thaïlandaises. Taux unique de 20% pour les grandes entreprises, taux progressifs pour les PME.",
        tags: [
          { label: "PND.50", variant: "muted" },
          { label: "PND.51", variant: "muted" },
          { label: "0–20%", variant: "amber" },
          { label: "150j après clôture", variant: "blue" },
        ],
      }}
    >
      {/* 1. Taux applicables */}
      <DetailSection title="Taux applicables">
        <NoteBox icon="⚠️">
          Les deux conditions PME doivent être remplies simultanément : capital libéré ≤ 5 millions THB
          ET chiffre d&apos;affaires ≤ 30 millions THB. Il suffit que l&apos;une soit dépassée pour
          relever du taux fixe de 20%.
        </NoteBox>
        <ThresholdTable
          headers={["Tranche de bénéfice", "Taux PME", "Condition PME"]}
          rows={[
            ["0 — 300 000 THB", "0%", "Capital ≤ 5M THB ET CA ≤ 30M THB"],
            ["300 001 — 3 000 000 THB", "15%", "Capital ≤ 5M THB ET CA ≤ 30M THB"],
            ["> 3 000 000 THB", "20%", "Capital ≤ 5M THB ET CA ≤ 30M THB"],
            ["Toute la base (grande entreprise)", "20% fixe", "Capital > 5M THB OU CA > 30M THB"],
          ]}
        />
      </DetailSection>

      {/* 2. Base imposable */}
      <DetailSection title="Base imposable">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          La base imposable est le bénéfice net comptable ajusté selon les règles fiscales thaïlandaises.
          Certaines charges sont déductibles, d&apos;autres ne le sont pas.
        </p>
        <FormulaBlock>
          Bénéfice imposable = Chiffre d&apos;affaires − Charges déductibles − Amortissements
        </FormulaBlock>
        <div className="grid grid-cols-2 gap-4 text-[12px] text-[#5c4d3c]">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
              Charges déductibles
            </p>
            <ul className="space-y-1">
              <li className="flex gap-1.5">
                <span aria-hidden="true">✓</span>
                <span>Salaires et charges sociales</span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">✓</span>
                <span>Loyers et charges locatives</span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">✓</span>
                <span>Matières premières et marchandises</span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">✓</span>
                <span>Frais marketing (sous conditions)</span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">✓</span>
                <span>Amortissements (taux fixés par le fisc)</span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">✓</span>
                <span>Cotisation employeur SSF</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-red-700">
              Non déductibles
            </p>
            <ul className="space-y-1">
              <li className="flex gap-1.5">
                <span aria-hidden="true">✗</span>
                <span>Amendes et pénalités</span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">✗</span>
                <span>L&apos;impôt sur les sociétés lui-même</span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">✗</span>
                <span>Dépenses personnelles du dirigeant</span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">✗</span>
                <span>Provisions non autorisées</span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">✗</span>
                <span>Intérêts excédentaires (thin cap)</span>
              </li>
            </ul>
          </div>
        </div>
      </DetailSection>

      {/* 3. Acompte mi-année — PND.51 */}
      <DetailSection title="Acompte mi-année — PND.51">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          À mi-exercice, la société doit estimer son bénéfice annuel et verser 50% de l&apos;impôt
          estimé. Cet acompte est déduit de l&apos;impôt final lors de la déclaration annuelle (PND.50).
        </p>
        <FormulaBlock>PND.51 = 50% × CIT annuel estimé</FormulaBlock>
        <NoteBox icon="⚠️">
          Si l&apos;estimation est inférieure de plus de 25% à l&apos;impôt réel, une pénalité de 20%
          s&apos;applique sur la différence. Mieux vaut légèrement surestimer que sous-estimer.
        </NoteBox>
      </DetailSection>

      {/* 4. Exemple concret — PME */}
      <DetailSection title="Exemple concret">
        <ExampleBlock label="PME avec bénéfice net de 2 500 000 THB">
          <ExampleFlow
            items={[
              "Tranche 0–300 000 THB → 0% = 0 THB",
              "Tranche 300 001–2 500 000 THB (= 2 200 000 THB) → 15% = 330 000 THB",
              "CIT total = 330 000 THB",
            ]}
          />
          <p className="mt-2 text-[11.5px] text-[#7a6a5a]">
            Vs. taux plein : 2 500 000 × 20% = 500 000 THB. Économie PME : 170 000 THB/an.
          </p>
        </ExampleBlock>
      </DetailSection>

      {/* 5. Déclaration annuelle — PND.50 */}
      <DetailSection title="Déclaration annuelle — PND.50">
        <DeadlineCards
          items={[
            { label: "Acompte", value: "PND.51", sub: "2 mois après le 6e mois de l'exercice" },
            { label: "Déclaration annuelle", value: "PND.50", sub: "150 jours après clôture" },
            { label: "Exemple (clôture déc.)", value: "30 mai", sub: "PND.50 dû avant le 30 mai" },
            { label: "États financiers (DBD)", value: "5 mois", sub: "Après clôture de l'exercice" },
          ]}
        />
      </DetailSection>

      {/* 6. Concepts liés */}
      <DetailSection title="Concepts liés">
        <RelatedCards
          items={[
            { icon: "🔒", label: "Retenues WHT", href: "/dashboard/wiki/thai-taxes/wht" },
            { icon: "💰", label: "Dividendes", href: "/dashboard/wiki/thai-taxes/dividends" },
            { icon: "📅", label: "Calendrier fiscal", href: "/dashboard/wiki/thai-taxes/declarations" },
          ]}
        />
      </DetailSection>
    </WikiDetailLayout>
  );
}
