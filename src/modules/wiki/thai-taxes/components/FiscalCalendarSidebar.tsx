"use client";
import Link from "next/link";
import { FISCAL_CALENDAR_COLUMNS } from "../calendar-data";
import { useWikiLang } from "./LanguageProvider";

export function FiscalCalendarSidebar() {
  const { lang, t } = useWikiLang();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="eyebrow" style={{ color: "var(--bronze)" }}>{t({ fr: "Calendrier des échéances", en: "Deadline calendar" })}</p>
        <Link href="/wiki/thai-taxes/fiscal-calendar" style={{ fontSize: 10, fontWeight: 600, color: "var(--bronze)", textDecoration: "none" }}>
          {t({ fr: "Voir tout →", en: "View all →" })}
        </Link>
      </div>
      {FISCAL_CALENDAR_COLUMNS.map((col) => (
        <div key={col.key}>
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", marginBottom: 4 }}>
            {col.label[lang]}
          </p>
          {col.entries.map((entry) => (
            <Link
              key={entry.code}
              href={`/wiki/thai-taxes/${entry.slug}`}
              style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0", textDecoration: "none" }}
            >
              <span className="mono" style={{ fontSize: 10, color: "var(--fg-2)" }}>{entry.code}</span>
              <span style={{ fontSize: 9.5, color: "var(--fg-4)", textAlign: "right" }}>{entry.description[lang]}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
