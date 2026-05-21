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

export default function VATPage() {
  return (
    <WikiDetailLayout
      breadcrumbs={[
        { label: "Wiki", href: "/wiki" },
        { label: "Thai Taxes", href: "/wiki/thai-taxes" },
        { label: "TVA (VAT)" },
      ]}
      hero={{
        rate: "7%",
        name: "TVA — Taxe sur la valeur ajoutée",
        subtitle:
          "Taxe indirecte collectée sur chaque vente et déductible sur chaque achat. Versée mensuellement au Revenue Department via le formulaire PP.30.",
        tags: [
          { label: "PP.30", variant: "muted" },
          { label: "7%", variant: "amber" },
          { label: "Mensuel", variant: "blue" },
          { label: "Seuil 1.8M THB/an", variant: "green" },
        ],
      }}
    >
      {/* 1. Principe */}
      <DetailSection title="Principe">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          La TVA (Value Added Tax) est une taxe à la consommation de 7% collectée par les entreprises
          pour le compte de l'État. Chaque maillon de la chaîne collecte la TVA sur ses ventes (output
          VAT) et récupère la TVA sur ses achats (input VAT). Seule la différence est versée au Revenue
          Department.
        </p>
        <FormulaBlock>TVA à reverser = Output VAT − Input VAT</FormulaBlock>
        <NoteBox icon="⚠️">
          La TVA n'est pas un revenu de l'entreprise. Elle transite par vos comptes mais appartient à
          l'État. Elle n'est pas incluse dans votre chiffre d'affaires imposable.
        </NoteBox>
      </DetailSection>

      {/* 2. Qui est concerné */}
      <DetailSection title="Qui est concerné">
        <ThresholdTable
          headers={["Situation", "Obligation", "Délai"]}
          rows={[
            [
              "CA > 1 800 000 THB/an",
              "Enregistrement TVA obligatoire",
              "Dans les 30 jours",
            ],
            [
              "CA ≤ 1 800 000 THB/an",
              "Enregistrement volontaire possible",
              "À tout moment",
            ],
            [
              "Exportateurs & services à l'étranger",
              "Taux zéro (0%) — input VAT récupérable",
              "Enregistrement requis",
            ],
            [
              "Activités exonérées",
              "Pas de TVA collectée, pas d'input VAT récupérable",
              "—",
            ],
          ]}
        />
      </DetailSection>

      {/* 3. Catégories exonérées */}
      <DetailSection title="Catégories exonérées de TVA">
        <NoteBox icon="📋">
          Les activités exonérées ne collectent pas de TVA et ne peuvent pas récupérer l'input VAT sur
          leurs achats. Différent du taux zéro (exportations) où l'input VAT reste récupérable.
        </NoteBox>
        <ul className="space-y-1 text-[12px] text-[#5c4d3c]">
          <li className="flex gap-2"><span aria-hidden="true">•</span><span>Produits agricoles non transformés</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span>Médicaments, équipements médicaux</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span>Services éducatifs (établissements agréés)</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span>Soins de santé (hôpitaux, cliniques)</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span>Transport intérieur routier et ferroviaire</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span>Immobilier résidentiel</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span>Services culturels et religieux</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span>Journaux et magazines</span></li>
        </ul>
      </DetailSection>

      {/* 4. Calcul */}
      <DetailSection title="Calcul">
        <FormulaBlock>TVA à reverser = Total output VAT − Total input VAT</FormulaBlock>
        <ExampleBlock label="Exemple concret — Entreprise de services">
          <ExampleFlow
            items={[
              "Ventes du mois : 100 000 THB HT",
              "Output VAT : 7 000 THB (7%)",
              "Achats du mois : 40 000 THB HT",
              "Input VAT : 2 800 THB (7%)",
              "TVA à reverser : 4 200 THB",
            ]}
          />
          <p className="mt-2 text-[11.5px] text-[#7a6a5a]">
            Si l'input VAT dépasse l'output VAT (cas des exportateurs), l'excédent peut être reporté
            sur le mois suivant ou remboursé par le Revenue Department.
          </p>
        </ExampleBlock>
      </DetailSection>

      {/* 5. Déclaration */}
      <DetailSection title="Déclaration — PP.30">
        <DeadlineCards
          items={[
            {
              label: "Formulaire",
              value: "PP.30",
              sub: "Par voie électronique ou papier",
            },
            {
              label: "Délai standard",
              value: "15e du mois",
              sub: "Mois suivant la période",
            },
            {
              label: "Délai e-filing",
              value: "23e du mois",
              sub: "+8 jours calendaires",
            },
            {
              label: "Fréquence",
              value: "Mensuelle",
              sub: "Option trimestrielle pour PME agréées",
            },
          ]}
        />
      </DetailSection>

      {/* 6. Points importants */}
      <DetailSection title="Points importants">
        <ul className="space-y-2 text-[12px] text-[#5c4d3c]">
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>Tax Invoice obligatoire</strong> : pour déduire l'input VAT, vous devez détenir
              une Tax Invoice en bonne et due forme émise par votre fournisseur.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>Conservation 5 ans</strong> : les registres de TVA (output et input) doivent être
              conservés 5 ans.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>Pénalités</strong> : retard de paiement = 2%/mois sur le montant dû + intérêts de
              1,5%/mois.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>SBT</strong> : certains secteurs (banques, immobilier, assurance-vie) sont soumis
              à la Taxe sur les affaires spécifiques (SBT) à la place de la TVA.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>E-filing bonus</strong> : le dépôt électronique accorde 8 jours supplémentaires
              (délai passe du 15 au 23 du mois).
            </span>
          </li>
        </ul>
      </DetailSection>

      {/* 7. Concepts liés */}
      <DetailSection title="Concepts liés">
        <RelatedCards
          items={[
            { icon: "🔒", label: "Retenues WHT", href: "/wiki/thai-taxes/wht" },
            { icon: "📅", label: "Calendrier fiscal", href: "/wiki/thai-taxes/declarations" },
            { icon: "🏠", label: "Vue d'ensemble", href: "/wiki/thai-taxes" },
          ]}
        />
      </DetailSection>
    </WikiDetailLayout>
  );
}
