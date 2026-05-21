import {
  WikiDetailLayout,
  DetailSection,
  FormulaBlock,
  ThresholdTable,
  DeadlineCards,
  RelatedCards,
} from "@/modules/wiki/components/WikiDetailLayout";
import { NoteBox } from "@/modules/wiki/components/NoteBox";

export default function DividendsPage() {
  return (
    <WikiDetailLayout
      breadcrumbs={[
        { label: "Wiki", href: "/dashboard/wiki" },
        { label: "Thai Taxes", href: "/dashboard/wiki/thai-taxes" },
        { label: "Dividendes" },
      ]}
      hero={{
        rate: "10%",
        name: "Dividendes — Distribution aux actionnaires",
        subtitle:
          "Les dividendes sont distribués sur le bénéfice net après CIT. La retenue à la source (WHT) s'applique à la distribution et varie selon le type d'actionnaire.",
        tags: [
          { label: "PP.3", variant: "muted" },
          { label: "WHT 10%", variant: "amber" },
          { label: "7 jours", variant: "blue" },
          { label: "Post-CIT", variant: "green" },
        ],
      }}
    >
      {/* 1. Principe */}
      <DetailSection title="Principe">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          Les dividendes sont prélevés sur le bénéfice net de la société après paiement de l&apos;impôt
          sur les sociétés (CIT). Ils nécessitent une approbation : l&apos;assemblée générale annuelle
          pour les dividendes annuels, ou une résolution du conseil d&apos;administration pour les
          dividendes intérimaires.
        </p>
        <FormulaBlock>
          Dividende net reçu = Dividende brut − WHT (10%)
        </FormulaBlock>
      </DetailSection>

      {/* 2. Taux WHT par type d'actionnaire */}
      <DetailSection title="Taux WHT par type d'actionnaire">
        <ThresholdTable
          headers={["Type d'actionnaire", "Taux WHT", "Formulaire", "Caractère"]}
          rows={[
            [
              "Personne physique thaïlandaise",
              "10%",
              "PP.3",
              "Libératoire (pas d'IS supplémentaire)",
            ],
            [
              "Société thaïlandaise < 25% de participation",
              "10%",
              "PP.3",
              "Déductible du CIT",
            ],
            [
              "Société thaïlandaise ≥ 25% détenue ≥ 3 mois",
              "0%",
              "PP.3",
              "Exonérée",
            ],
            [
              "Personne physique étrangère",
              "10–15%",
              "PND.54",
              "Selon DTA applicable",
            ],
            [
              "Société étrangère sans DTA",
              "20%",
              "PND.54",
              "Taux standard",
            ],
            [
              "Société étrangère avec DTA",
              "10%",
              "PND.54",
              "Taux DTA courant",
            ],
          ]}
        />
      </DetailSection>

      {/* 3. Exonération inter-sociétés */}
      <DetailSection title="Exonération inter-sociétés">
        <NoteBox icon="✅">
          Deux conditions cumulatives requises pour l&apos;exonération : (1) la société bénéficiaire
          détient au moins 25% du capital de la société distributrice ET (2) cette participation est
          détenue depuis au moins 3 mois consécutifs avant la date de distribution. Des règles
          spécifiques peuvent s&apos;appliquer aux sociétés cotées (SET).
        </NoteBox>
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          L&apos;exonération s&apos;applique automatiquement si les deux conditions sont remplies au
          moment de la distribution. Pas de demande d&apos;agrément préalable.
        </p>
      </DetailSection>

      {/* 4. Conventions fiscales DTA */}
      <DetailSection title="Conventions fiscales — DTA">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          La Thaïlande a signé des conventions de non double imposition (DTA) avec plus de 60 pays.
          Ces conventions peuvent réduire le taux WHT sur les dividendes en dessous du taux standard.
        </p>
        <ThresholdTable
          headers={["Pays", "Taux réduit si seuil atteint", "Taux standard DTA", "Seuil de participation"]}
          rows={[
            ["France", "10%", "15%", "≥ 10% du capital"],
            ["Royaume-Uni", "10%", "15%", "≥ 25% du capital"],
            ["Singapour", "10%", "10%", "Pas de seuil"],
            ["Allemagne", "10%", "15%", "≥ 25% du capital"],
            ["Japon", "10%", "15%", "≥ 25% du capital"],
          ]}
        />
        <NoteBox icon="💡">
          Pour bénéficier d&apos;un taux DTA réduit, la société étrangère doit fournir un certificat
          de résidence fiscale (Certificate of Residence) avant la date de paiement. Sans ce document,
          le taux standard (10–20%) s&apos;applique.
        </NoteBox>
      </DetailSection>

      {/* 5. Processus de distribution */}
      <DetailSection title="Processus de distribution">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          La distribution de dividendes suit un processus réglementé avec des délais stricts.
        </p>
        <ol className="space-y-1.5 list-decimal list-inside text-[12px] text-[#5c4d3c]">
          <li>Résolution du conseil d&apos;administration ou de l&apos;AG approuvant la distribution</li>
          <li>Paiement du dividende au plus tard 30 jours après la résolution</li>
          <li>Déduction de la WHT au moment du paiement</li>
          <li>
            Dépôt de la déclaration PP.3 (ou PND.54 pour non-résidents) dans les 7 jours du mois
            de paiement
          </li>
          <li>
            Remise du certificat de retenue{" "}
            (ภ.ง.ด.1 ก) au(x) bénéficiaire(s)
          </li>
        </ol>
      </DetailSection>

      {/* 6. Déclaration */}
      <DetailSection title="Déclaration">
        <DeadlineCards
          items={[
            {
              label: "Formulaire résidents",
              value: "PP.3",
              sub: "Personnes physiques & sociétés thaïlandaises",
            },
            {
              label: "Formulaire non-résidents",
              value: "PND.54",
              sub: "Actionnaires étrangers",
            },
            {
              label: "Délai de dépôt",
              value: "7 jours",
              sub: "Du mois de paiement des dividendes",
            },
            {
              label: "Résolution → Paiement",
              value: "≤ 30 jours",
              sub: "Délai maximum légal",
            },
          ]}
        />
      </DetailSection>

      {/* 7. Concepts liés */}
      <DetailSection title="Concepts liés">
        <RelatedCards
          items={[
            { icon: "🏢", label: "Impôt sociétés (CIT)", href: "/dashboard/wiki/thai-taxes/cit" },
            { icon: "🔒", label: "Retenues WHT", href: "/dashboard/wiki/thai-taxes/wht" },
            { icon: "📅", label: "Calendrier fiscal", href: "/dashboard/wiki/thai-taxes/declarations" },
          ]}
        />
      </DetailSection>
    </WikiDetailLayout>
  );
}
