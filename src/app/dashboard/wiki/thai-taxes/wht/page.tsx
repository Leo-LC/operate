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

export default function WHTPage() {
  return (
    <WikiDetailLayout
      breadcrumbs={[
        { label: "Wiki", href: "/dashboard/wiki" },
        { label: "Thai Taxes", href: "/dashboard/wiki/thai-taxes" },
        { label: "WHT" },
      ]}
      hero={{
        rate: "1–15%",
        name: "Withholding Tax — Retenue à la source",
        subtitle:
          "Le payeur déduit la retenue du montant brut et la reverse au Revenue Department. Le bénéficiaire reçoit un certificat de retenue déductible de son impôt.",
        tags: [
          { label: "PP.1 / PP.3", variant: "muted" },
          { label: "1%–15%", variant: "amber" },
          { label: "Avant le 7", variant: "blue" },
          { label: "Certificat de retenue", variant: "green" },
        ],
      }}
    >
      {/* 1. Principe */}
      <DetailSection title="Principe">
        <p className="text-[12.5px] leading-relaxed text-[#5c4d3c]">
          La retenue à la source (WHT) est un mécanisme par lequel le payeur déduit un pourcentage du
          montant brut avant de payer le bénéficiaire. La retenue est versée directement au Revenue
          Department. Pour le bénéficiaire, c&apos;est une avance sur son impôt final (CIT ou PIT).
        </p>
        <FormulaBlock>Paiement net = Montant brut − WHT</FormulaBlock>
        <NoteBox icon="💡">
          La WHT n&apos;est pas une double imposition. Pour le bénéficiaire, elle est déduite de son CIT
          ou PIT annuel grâce au certificat de retenue (หนังสือรับรองการหักภาษี ณ ที่จ่าย) remis par le
          payeur.
        </NoteBox>
      </DetailSection>

      {/* 2. Tableau des taux */}
      <DetailSection title="Tableau des taux WHT">
        <ThresholdTable
          headers={["Type de paiement", "Taux", "Formulaire", "Destinataire"]}
          rows={[
            ["Transport & biens (sociétés)", "1%", "PP.1", "Résidents"],
            ["Services & honoraires (sociétés)", "3%", "PP.1", "Résidents"],
            ["Loyers (personnes morales)", "5%", "PP.1", "Résidents"],
            ["Dividendes — résidents thaïlandais", "10%", "PP.3", "Résidents"],
            ["Dividendes — non-résidents", "10–15%", "PND.54", "Non-résidents"],
            ["Royalties — non-résidents", "15%", "PND.54", "Non-résidents"],
            ["Intérêts — non-résidents", "15%", "PND.54", "Non-résidents"],
            ["Autres paiements — non-résidents (sans DTA)", "20%", "PND.54", "Non-résidents"],
            ["Salaires (PIT retenu par l'employeur)", "0–35%", "PND.1", "Employés"],
          ]}
        />
      </DetailSection>

      {/* 3. Exemples concrets */}
      <DetailSection title="Exemples concrets">
        <ExampleBlock label="Exemple 1 — Consulting 100 000 THB">
          <ExampleFlow
            items={[
              "Facture brute : 100 000 THB",
              "WHT 3% : 3 000 THB",
              "Paiement net au prestataire : 97 000 THB",
              "Versement au Revenue Dept : 3 000 THB",
            ]}
          />
        </ExampleBlock>
        <ExampleBlock label="Exemple 2 — Loyer 50 000 THB à un particulier">
          <ExampleFlow
            items={[
              "Loyer brut : 50 000 THB",
              "WHT 5% : 2 500 THB",
              "Paiement net au propriétaire : 47 500 THB",
              "Versement au Revenue Dept : 2 500 THB",
            ]}
          />
        </ExampleBlock>
      </DetailSection>

      {/* 4. Déclaration */}
      <DetailSection title="Déclaration">
        <DeadlineCards
          items={[
            { label: "WHT sociétés", value: "PP.1", sub: "7e du mois suivant" },
            { label: "WHT dividendes", value: "PP.3", sub: "7e du mois suivant" },
            { label: "Non-résidents", value: "PND.54", sub: "7 jours après paiement" },
            { label: "Salaires (PIT)", value: "PND.1", sub: "7e du mois suivant" },
          ]}
        />
      </DetailSection>

      {/* 5. Points importants */}
      <DetailSection title="Points importants">
        <ul className="space-y-1.5 text-[12px] text-[#5c4d3c]">
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>Seuil de 1 000 THB</strong> : la WHT n&apos;est pas applicable si le paiement
              unique est inférieur à 1 000 THB — sauf pour les dividendes (pas de seuil).
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>Certificat de retenue</strong> : le payeur doit remettre un certificat au
              bénéficiaire, qui peut le déduire de son CIT ou PIT annuel.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>Conventions fiscales (DTA)</strong> : les traités de non double imposition peuvent
              réduire les taux WHT pour les non-résidents (ex. France : 10%, UK : 15%).
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>Omission de retenue</strong> : si vous oubliez de retenir, vous devez payer le
              montant + 100% de pénalité + intérêts de 1,5%/mois.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>
              <strong>E-filing</strong> : le dépôt électronique de PP.1/PP.3 accorde 8 jours
              supplémentaires (délai du 7 au 15 du mois).
            </span>
          </li>
        </ul>
      </DetailSection>

      {/* 6. Concepts liés */}
      <DetailSection title="Concepts liés">
        <RelatedCards
          items={[
            { icon: "🧾", label: "TVA (VAT)", href: "/dashboard/wiki/thai-taxes/vat" },
            { icon: "🏢", label: "Impôt sociétés (CIT)", href: "/dashboard/wiki/thai-taxes/cit" },
            { icon: "💰", label: "Dividendes", href: "/dashboard/wiki/thai-taxes/dividends" },
          ]}
        />
      </DetailSection>
    </WikiDetailLayout>
  );
}
