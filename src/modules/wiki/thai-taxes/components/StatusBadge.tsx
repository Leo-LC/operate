import type { TaxStatus } from "../types";
import type { WikiLang } from "./LanguageProvider";

const LABELS: Record<TaxStatus, Record<WikiLang, string>> = {
  active: { fr: "Actif", en: "Active" },
  "coming-soon": { fr: "Contenu à venir", en: "Coming soon" },
  "internal-only": { fr: "Usage interne", en: "Internal only" },
  "needs-accountant-validation": { fr: "À valider par le comptable", en: "Needs accountant validation" },
};

const STYLES: Record<TaxStatus, { bg: string; color: string }> = {
  active: { bg: "var(--good-soft)", color: "var(--good)" },
  "coming-soon": { bg: "var(--bg-2)", color: "var(--fg-3)" },
  "internal-only": { bg: "var(--info-soft)", color: "var(--info)" },
  "needs-accountant-validation": { bg: "var(--warn-soft)", color: "var(--warn)" },
};

export function StatusBadge({ status, lang }: { status: TaxStatus; lang: WikiLang }) {
  if (status === "active") return null;
  const style = STYLES[status];
  return (
    <span
      style={{
        borderRadius: "var(--r-pill)",
        padding: "2px 8px",
        fontSize: 9.5,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
      }}
    >
      {LABELS[status][lang]}
    </span>
  );
}
