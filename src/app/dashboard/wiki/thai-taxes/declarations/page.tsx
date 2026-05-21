import {
  WikiDetailLayout,
  DetailSection,
  ThresholdTable,
  RelatedCards,
} from "@/modules/wiki/components/WikiDetailLayout";
import { NoteBox } from "@/modules/wiki/components/NoteBox";
import { ThaiTaxCalendarStrip } from "@/modules/wiki/components/CalendarStrip";

export default function DeclarationsPage() {
  return (
    <WikiDetailLayout
      breadcrumbs={[
        { label: "Wiki", href: "/dashboard/wiki" },
        { label: "Thai Taxes", href: "/dashboard/wiki/thai-taxes" },
        { label: "Calendrier fiscal" },
      ]}
      hero={{
        rate: "📅",
        name: "Calendrier fiscal — Toutes les déclarations",
        subtitle:
          "Vue d'ensemble de toutes les obligations déclaratives d'une société thaïlandaise : formulaires, délais et pénalités.",
        tags: [
          { label: "Revenue Dept", variant: "muted" },
          { label: "SSO", variant: "muted" },
          { label: "DBD", variant: "muted" },
          { label: "E-filing +8j", variant: "green" },
        ],
      }}
    >
      {/* 1. Vue d'ensemble */}
      <DetailSection title="Vue d'ensemble">
        <ThaiTaxCalendarStrip />
      </DetailSection>

      {/* 2. Déclarations mensuelles — Revenue Department */}
      <DetailSection title="Déclarations mensuelles — Revenue Department">
        <ThresholdTable
          headers={["Formulaire", "Objet", "Délai standard", "Pénalité retard"]}
          rows={[
            [
              "PP.30",
              "TVA mensuelle (output VAT − input VAT)",
              "15e du mois",
              "2%/mois + 1,5%/mois intérêts",
            ],
            [
              "PP.1",
              "WHT sociétés (1%, 3%, 5%)",
              "7e du mois",
              "Montant + 100% pénalité + intérêts",
            ],
            [
              "PP.3",
              "WHT dividendes — personnes physiques",
              "7e du mois",
              "Montant + 100% pénalité + intérêts",
            ],
            [
              "PND.54",
              "WHT non-résidents (dividendes, royalties)",
              "7 jours après paiement",
              "Montant + 100% pénalité",
            ],
            [
              "PND.1",
              "Retenue PIT salariés",
              "7e du mois",
              "Montant + pénalités",
            ],
          ]}
        />
      </DetailSection>

      {/* 3. Déclarations — Social Security Office */}
      <DetailSection title="Déclarations — Social Security Office">
        <ThresholdTable
          headers={["Cotisation", "Taux", "Délai", "Particularité"]}
          rows={[
            [
              "SSF mensuel",
              "5% salarié + 5% employeur (cap 750 THB)",
              "15e du mois suivant",
              "Formulaire SSO spécifique",
            ],
            [
              "WCF annuel",
              "0,2%–1% employeur uniquement",
              "31 janvier de l'année suivante",
              "Selon secteur d'activité",
            ],
          ]}
        />
      </DetailSection>

      {/* 4. Déclarations annuelles — Revenue Department */}
      <DetailSection title="Déclarations annuelles — Revenue Department">
        <ThresholdTable
          headers={["Formulaire", "Objet", "Délai (exercice décembre)"]}
          rows={[
            ["PND.51", "Acompte CIT (50% impôt estimé)", "31 août"],
            [
              "PND.50",
              "Déclaration CIT annuelle complète",
              "30 mai (150 jours après clôture)",
            ],
            ["PND.1 Kor", "Récapitulatif annuel salaires PIT", "Fin février"],
          ]}
        />
      </DetailSection>

      {/* 5. Obligations DBD */}
      <DetailSection title="Obligations — Department of Business Development">
        <ThresholdTable
          headers={["Document", "Délai après clôture"]}
          rows={[
            [
              "États financiers audités",
              "5 mois (fin mai pour exercice décembre)",
            ],
            [
              "AGM (Assemblée Générale)",
              "4 mois (fin avril pour exercice décembre)",
            ],
            [
              "Liste des actionnaires (BOJ 5)",
              "Si changement de capital ou d'actionnaires",
            ],
          ]}
        />
      </DetailSection>

      {/* 6. Bonus e-filing — standalone NoteBox */}
      <NoteBox icon="🌐">
        Le dépôt électronique accorde 8 jours calendaires supplémentaires pour
        toutes les déclarations du Revenue Department : PP.30 (15→23),
        PP.1/PP.3/PND.1 (7→15). Le dépôt électronique est disponible sur le
        portail e-filing du Revenue Department.
      </NoteBox>

      {/* 7. Concepts liés */}
      <DetailSection title="Concepts liés">
        <RelatedCards
          items={[
            {
              icon: "🧾",
              label: "TVA (VAT)",
              href: "/dashboard/wiki/thai-taxes/vat",
            },
            {
              icon: "🔒",
              label: "Retenues WHT",
              href: "/dashboard/wiki/thai-taxes/wht",
            },
            {
              icon: "🏢",
              label: "Impôt sociétés (CIT)",
              href: "/dashboard/wiki/thai-taxes/cit",
            },
          ]}
        />
      </DetailSection>
    </WikiDetailLayout>
  );
}
