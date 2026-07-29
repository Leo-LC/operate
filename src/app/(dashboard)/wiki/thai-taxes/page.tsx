import Link from "next/link";
import { QuickStartCards } from "@/modules/wiki/thai-taxes/components/QuickStartCards";
import { TaxMap } from "@/modules/wiki/thai-taxes/components/TaxMap";
import { CategoryCard } from "@/modules/wiki/thai-taxes/components/CategoryCard";
import { WikiFilterProvider, ArticleFilters } from "@/modules/wiki/thai-taxes/components/ArticleFilters";
import { FiscalCalendarSidebar } from "@/modules/wiki/thai-taxes/components/FiscalCalendarSidebar";
import { MostConsultedSidebar } from "@/modules/wiki/thai-taxes/components/MostConsultedSidebar";
import { LanguageToggle } from "@/modules/wiki/thai-taxes/components/LanguageToggle";
import { PageHeader } from "@/modules/wiki/thai-taxes/components/PageHeader";
import { TAX_FAMILIES, PERSONAL_FAMILY } from "@/modules/wiki/thai-taxes/families";

export default function ThaiTaxesHomePage() {
  return (
    <WikiFilterProvider>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <PageHeader />
            <LanguageToggle />
          </div>

          <QuickStartCards />
          <TaxMap />

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {TAX_FAMILIES.map((family) => (
              <CategoryCard key={family.category} family={family} />
            ))}
          </div>

          <Link
            href={`/wiki/thai-taxes/${PERSONAL_FAMILY.entrySlug}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              borderRadius: "var(--r-lg)",
              border: "1px dashed var(--line-strong)",
              background: "var(--bg-2)",
              padding: 16,
              textDecoration: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{PERSONAL_FAMILY.icon}</span>
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)" }}>
                  {PERSONAL_FAMILY.label.fr} <span style={{ fontWeight: 400, color: "var(--fg-4)" }}>/ {PERSONAL_FAMILY.label.en}</span>
                </p>
                <p style={{ marginTop: 2, fontSize: 11, color: "var(--fg-3)" }}>{PERSONAL_FAMILY.description.fr}</p>
              </div>
            </div>
            <span style={{ color: "var(--bronze)", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>→</span>
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>
          <ArticleFilters />
          <FiscalCalendarSidebar />
          <MostConsultedSidebar />
        </div>
      </div>
    </WikiFilterProvider>
  );
}
