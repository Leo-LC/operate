import { TaxCard } from "@/modules/wiki/components/TaxCard";
import { SectionHeader } from "@/modules/wiki/components/SectionHeader";
import { NoteBox } from "@/modules/wiki/components/NoteBox";
import { ThaiTaxFormulaHero } from "@/modules/wiki/components/FormulaHero";
import { ThaiTaxCalendarStrip } from "@/modules/wiki/components/CalendarStrip";

export default function ThaiTaxesPage() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#B9854E]">
            Guide comptable · Thaïlande
          </p>
          <h1 className="text-3xl font-bold text-[#2F2823]">
            Comptabilité &amp; Taxes en Thaïlande
          </h1>
          <p className="text-sm text-[#7a6a5a]">
            Vue d&apos;ensemble de tous les impôts et obligations déclaratives pour une société thaïlandaise.
          </p>
        </div>
        <time dateTime="2026-05-21" className="shrink-0 text-[11px] text-[#7a6a5a]">
          Mis à jour le 21 mai 2026
        </time>
      </div>

      {/* Formula hero */}
      <ThaiTaxFormulaHero />

      {/* Section 1 — Taxes sur les ventes & les achats */}
      <section className="space-y-4">
        <SectionHeader title="Taxes sur les ventes & les achats" count={3} />
        <div className="grid grid-cols-3 gap-3">
          <TaxCard
            icon="🧾"
            rate="7%"
            name="TVA — Taxe sur la valeur ajoutée"
            subtitle="(VAT)"
            description="Collectée sur chaque vente, déductible sur chaque achat. Seuil d'enregistrement : 1,8M THB/an."
            tags={[
              { label: "PP.30", variant: "muted" },
              { label: "Mensuel", variant: "blue" },
              { label: "Seuil 1.8M THB", variant: "amber" },
            ]}
            deadline="15 du mois (23 e-filing)"
            href="/wiki/thai-taxes/vat"
          />
          <TaxCard
            icon="🏦"
            rate="3–3.3%"
            name="Taxe sur les affaires spécifiques"
            subtitle="(SBT)"
            description="Remplace la VAT pour banques, immobilier et assurance-vie. Non récupérable."
            tags={[
              { label: "PP.40", variant: "muted" },
              { label: "Secteurs spécifiques", variant: "amber" },
            ]}
            deadline="15 du mois"
            href="/wiki/thai-taxes"
          />
          <TaxCard
            icon="📋"
            rate="0.05–0.1%"
            name="Droit de timbre"
            subtitle="(Stamp Duty)"
            description="Applicable aux prêts, transferts d'actions, baux et contrats de service."
            tags={[
              { label: "À l'acte", variant: "muted" },
              { label: "Instruments variés", variant: "blue" },
            ]}
            deadline="À la signature"
            href="/wiki/thai-taxes"
          />
        </div>
      </section>

      {/* Section 2 — Retenues à la source */}
      <section className="space-y-4">
        <SectionHeader title="Retenues à la source" count={5} />
        <NoteBox icon="💡">
          Principe : vous déduisez la retenue du paiement brut et la versez au Revenue Department.
          Le bénéficiaire reçoit un certificat de retenue déductible de son CIT ou PIT.
        </NoteBox>
        <div className="grid grid-cols-4 gap-3">
          <TaxCard
            icon="📦"
            rate="1%"
            name="Biens & transport"
            description="Achats de marchandises, transport de sociétés."
            tags={[
              { label: "PP.1", variant: "muted" },
              { label: "Avant le 7", variant: "blue" },
            ]}
            deadline="Avant le 7"
            href="/wiki/thai-taxes/wht"
          />
          <TaxCard
            icon="🤝"
            rate="3%"
            name="Services & honoraires"
            description="Honoraires professionnels, consulting, services."
            tags={[
              { label: "PP.1", variant: "muted" },
              { label: "Avant le 7", variant: "blue" },
            ]}
            deadline="Avant le 7"
            href="/wiki/thai-taxes/wht"
          />
          <TaxCard
            icon="🏠"
            rate="5%"
            name="Loyers"
            description="Loyers versés à des personnes physiques ou morales."
            tags={[
              { label: "PP.1", variant: "muted" },
              { label: "Avant le 7", variant: "blue" },
            ]}
            deadline="Avant le 7"
            href="/wiki/thai-taxes/wht"
          />
          <TaxCard
            icon="💰"
            rate="10%"
            name="Dividendes résidents"
            description="Dividendes versés à des actionnaires thaïlandais."
            tags={[
              { label: "PP.3", variant: "muted" },
              { label: "7 jours", variant: "amber" },
            ]}
            deadline="7 jours"
            href="/wiki/thai-taxes/wht"
          />
        </div>
        <TaxCard
          icon="🌍"
          rate="15–20%"
          name="Non-résidents & étrangers"
          description="Dividendes/royalties/intérêts (15%) ou autres paiements (20%) à des non-résidents. Réduit par les conventions fiscales (DTA)."
          tags={[
            { label: "PND.54", variant: "muted" },
            { label: "Non-résidents", variant: "red" },
            { label: "DTA applicable", variant: "blue" },
          ]}
          deadline="7 jours"
          href="/wiki/thai-taxes/wht"
          variant="highlighted"
        />
      </section>

      {/* Section 3 — Impôt sur les sociétés */}
      <section className="space-y-4">
        <SectionHeader title="Impôt sur les sociétés" count={3} />
        <div className="grid grid-cols-3 gap-3">
          <TaxCard
            icon="🏢"
            rate="20%"
            name="Grande entreprise"
            description="Taux unique de 20% sur la totalité du bénéfice net. S'applique si capital > 5M THB OU chiffre d'affaires > 30M THB."
            tags={[
              { label: "PND.50", variant: "muted" },
              { label: "150j après clôture", variant: "blue" },
            ]}
            href="/wiki/thai-taxes/cit"
          />
          <TaxCard
            icon="🌱"
            rate="0–15–20%"
            name="PME — Taux progressifs"
            description="Capital ≤ 5M THB ET CA ≤ 30M THB : 0% jusqu'à 300k, 15% de 300k à 3M, 20% au-delà."
            tags={[
              { label: "PME", variant: "green" },
              { label: "Double condition", variant: "amber" },
            ]}
            href="/wiki/thai-taxes/cit"
          />
          <TaxCard
            icon="📅"
            rate="50%"
            name="Acompte mi-année"
            subtitle="(PND.51)"
            description="Versement anticipé de 50% de l'impôt annuel estimé, dû 2 mois après le 6e mois de l'exercice."
            tags={[
              { label: "PND.51", variant: "muted" },
              { label: "Mi-exercice", variant: "amber" },
            ]}
            href="/wiki/thai-taxes/cit"
          />
        </div>
      </section>

      {/* Section 4 — Charges sociales & Payroll */}
      <section className="space-y-4">
        <SectionHeader title="Charges sociales & Payroll" count={3} />
        <div className="grid grid-cols-3 gap-3">
          <TaxCard
            icon="🏥"
            rate="5% + 5%"
            name="Sécurité sociale"
            subtitle="(SSF)"
            description="5% salarié + 5% employeur, plafonné à 750 THB/mois chacun (base max 15 000 THB)."
            tags={[
              { label: "SSO", variant: "muted" },
              { label: "Avant le 15", variant: "blue" },
              { label: "Cap 750 THB", variant: "green" },
            ]}
            href="/wiki/thai-taxes/payroll"
          />
          <TaxCard
            icon="👤"
            rate="0–35%"
            name="Retenue PIT salariés"
            description="L'employeur calcule et retient l'impôt sur le revenu mensuel de chaque salarié. 8 tranches de 0% à 35%."
            tags={[
              { label: "PND.1", variant: "muted" },
              { label: "Avant le 7", variant: "blue" },
            ]}
            href="/wiki/thai-taxes/payroll"
          />
          <TaxCard
            icon="⚠️"
            rate="0.2–1%"
            name="Fonds d'indemnisation"
            subtitle="(WCF)"
            description="Charge employeur uniquement, selon le secteur d'activité (risque). Paiement annuel."
            tags={[
              { label: "Annuel", variant: "muted" },
              { label: "Employeur seul", variant: "amber" },
            ]}
            href="/wiki/thai-taxes/payroll"
          />
        </div>
      </section>

      {/* Section 5 — Dividendes & distributions */}
      <section className="space-y-4">
        <SectionHeader title="Dividendes & distributions" count={3} />
        <div className="grid grid-cols-3 gap-3">
          <TaxCard
            icon="🇹🇭"
            rate="10%"
            name="Actionnaires résidents"
            description="Retenue libératoire de 10% pour les personnes physiques thaïlandaises. Pas d'impôt supplémentaire."
            tags={[
              { label: "PP.3", variant: "muted" },
              { label: "7 jours", variant: "amber" },
              { label: "Libératoire", variant: "green" },
            ]}
            href="/wiki/thai-taxes/dividends"
          />
          <TaxCard
            icon="🔗"
            rate="0%"
            name="Exonération inter-sociétés"
            description="Dividendes exemptés si participation ≥ 25% détenue depuis ≥ 3 mois consécutifs avant la distribution."
            tags={[
              { label: "≥25% + 3 mois", variant: "green" },
              { label: "Deux conditions", variant: "amber" },
            ]}
            href="/wiki/thai-taxes/dividends"
          />
          <TaxCard
            icon="🌍"
            rate="10–20%"
            name="Actionnaires étrangers"
            description="10% à 20% selon la convention fiscale (DTA). Sans DTA : 20% pour les sociétés, 15% pour les particuliers."
            tags={[
              { label: "DTA", variant: "blue" },
              { label: "PND.54", variant: "muted" },
            ]}
            href="/wiki/thai-taxes/dividends"
          />
        </div>
      </section>

      {/* Section 6 — Calendrier des déclarations */}
      <section className="space-y-4">
        <SectionHeader title="Calendrier des déclarations" />
        <ThaiTaxCalendarStrip />
      </section>
    </div>
  );
}
