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

export default function PayrollPage() {
  return (
    <WikiDetailLayout
      breadcrumbs={[
        { label: "Wiki", href: "/dashboard/wiki" },
        { label: "Thai Taxes", href: "/dashboard/wiki/thai-taxes" },
        { label: "Payroll" },
      ]}
      hero={{
        rate: "5% + 5%",
        name: "Payroll — Charges sociales & retenue PIT",
        subtitle:
          "Obligations de l’employeur : sécurité sociale (SSF), retenue de l’impôt sur le revenu (PIT) et fonds d’indemnisation du travail (WCF).",
        tags: [
          { label: "SSF", variant: "muted" },
          { label: "PND.1", variant: "muted" },
          { label: "5% + 5%", variant: "amber" },
          { label: "Avant le 15", variant: "blue" },
        ],
      }}
    >
      {/* 1. Social Security Fund — SSF */}
      <DetailSection title="Social Security Fund — SSF">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          La sécurité sociale thaïlandaise (SSF) est gérée par le Social Security Office (SSO). Elle
          couvre les salariés pour 6 prestations principales. Cotisation : 5% du salarié + 5% de
          l’employeur, sur un salaire plafonné à 15 000 THB (max 750 THB/mois chacun).
        </p>
        <FormulaBlock>
          Cotisation max = 15 000 THB × 5% = 750 THB/mois (salarié ET employeur)
        </FormulaBlock>
        <ThresholdTable
          headers={["Prestation", "Couverture", "Condition"]}
          rows={[
            ["Maladie", "Soins médicaux dans établissements SSO agréés", "Cotisation ≥ 3 mois"],
            ["Maternité", "Forfait accouchement + 90j d’indemnités", "Cotisation ≥ 5 mois / 15 mois"],
            ["Invalidité", "Indemnité mensuelle si incapacité permanente", "Cotisation ≥ 3 mois"],
            ["Chômage", "50% du salaire, max 180j/an", "Cotisation ≥ 6 mois / 15 mois"],
            ["Retraite", "Pension mensuelle dès 55 ans (taux variable)", "Cotisation ≥ 180 mois"],
            ["Décès", "Indemnité funéraire + rente aux ayants droit", "Cotisation ≥ 1 mois"],
          ]}
        />
      </DetailSection>

      {/* 2. Retenue PIT — Personal Income Tax */}
      <DetailSection title="Retenue PIT employeur">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          L’employeur calcule chaque mois une estimation de l’impôt sur le revenu annuel de chaque
          salarié et en retient 1/12 sur le salaire mensuel. La déclaration PND.1 est déposée avant le
          7 du mois suivant.
        </p>
        <ThresholdTable
          headers={["Tranche de revenu net/an", "Taux", "Déductions courantes"]}
          rows={[
            ["0 — 150 000 THB", "0%", "Exonération de base"],
            ["150 001 — 300 000 THB", "5%", "—"],
            ["300 001 — 500 000 THB", "10%", "—"],
            ["500 001 — 750 000 THB", "15%", "—"],
            ["750 001 — 1 000 000 THB", "20%", "—"],
            ["1 000 001 — 2 000 000 THB", "25%", "—"],
            ["2 000 001 — 5 000 000 THB", "30%", "—"],
            ["> 5 000 000 THB", "35%", "—"],
          ]}
        />
        <NoteBox icon="💡">
          Déductions courantes : 50% du revenu salarial (max 100 000 THB), abattement personnel
          60 000 THB, conjoint 60 000 THB, assurance-vie jusqu’à 100 000 THB. À calculer avant
          d’appliquer les tranches.
        </NoteBox>
      </DetailSection>

      {/* 3. Workmen's Compensation Fund — WCF */}
      <DetailSection title="Workmen’s Compensation Fund — WCF">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          Le WCF est une assurance accident du travail financée uniquement par l’employeur. Le taux
          dépend du secteur d’activité et du niveau de risque. Paiement annuel avant le 31 janvier de
          l’année suivante.
        </p>
        <ExampleBlock label="Exemple — Entreprise de services (taux 0,2%)">
          <ExampleFlow
            items={[
              "Masse salariale annuelle : 2 400 000 THB",
              "Taux WCF secteur services : 0,2%",
              "Cotisation WCF : 2 400 000 × 0,2% = 4 800 THB/an",
            ]}
          />
        </ExampleBlock>
        <ThresholdTable
          headers={["Secteur", "Taux WCF"]}
          rows={[
            ["Commerce & services de bureau", "0,2%"],
            ["Industrie légère & manufacture", "0,5%"],
            ["Construction & BTP", "1,0%"],
            ["Industrie lourde & chimique", "1,0%"],
          ]}
        />
      </DetailSection>

      {/* 4. Calendrier des déclarations */}
      <DetailSection title="Calendrier des déclarations">
        <DeadlineCards
          items={[
            { label: "SSF mensuel", value: "Avant le 15", sub: "Du mois suivant" },
            { label: "PIT salariés (PND.1)", value: "Avant le 7", sub: "Du mois suivant" },
            { label: "PIT annuel (PND.1 Kor)", value: "Fin février", sub: "Récapitulatif annuel" },
            { label: "WCF annuel", value: "31 janvier", sub: "Année suivante" },
          ]}
        />
      </DetailSection>

      {/* 5. Concepts liés */}
      <DetailSection title="Concepts liés">
        <RelatedCards
          items={[
            { icon: "🔒", label: "Retenues WHT", href: "/dashboard/wiki/thai-taxes/wht" },
            { icon: "🏢", label: "Impôt sociétés (CIT)", href: "/dashboard/wiki/thai-taxes/cit" },
            { icon: "📅", label: "Calendrier fiscal", href: "/dashboard/wiki/thai-taxes/declarations" },
          ]}
        />
      </DetailSection>
    </WikiDetailLayout>
  );
}
