interface CalendarEntry {
  code: string;
  description: string;
}

interface CalendarColumn {
  label: string;
  sub: string;
  entries: CalendarEntry[];
}

const columns: CalendarColumn[] = [
  {
    label: "Chaque mois",
    sub: "avant le 7 ou le 15",
    entries: [
      { code: "PP.30 / VAT", description: "avant le 15 (23 si e-filing)" },
      { code: "PP.1 / PP.3 / WHT", description: "sociétés / individus · avant le 7" },
      { code: "PND.1 / PIT salariés", description: "avant le 7" },
      { code: "SSF / Sécurité sociale", description: "avant le 15" },
    ],
  },
  {
    label: "Trimestriel",
    sub: "option PME uniquement",
    entries: [
      { code: "PP.30 / VAT", description: "si option trimestrielle accordée" },
      { code: "PP.1 / WHT", description: "si option trimestrielle" },
    ],
  },
  {
    label: "Mi-exercice",
    sub: "2 mois après le 6e mois",
    entries: [
      { code: "PND.51 / Acompte CIT", description: "50% de l'impôt estimé" },
    ],
  },
  {
    label: "Annuel",
    sub: "150 jours après clôture",
    entries: [
      { code: "PND.50 / Déclaration CIT", description: "complète" },
      { code: "PND.1 Kor / Récapitulatif", description: "annuel salaires" },
      { code: "États financiers / DBD", description: "5 mois après clôture" },
    ],
  },
];

export function CalendarStrip() {
  return (
    <div className="overflow-hidden rounded-[11px] border border-[#E8DDD0]">
      {/* Header row */}
      <div className="grid grid-cols-4 bg-[#2F2823]">
        {columns.map((col, i) => (
          <div
            key={i}
            className="border-r border-white/[0.08] px-3 py-2.5 last:border-0"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#B9854E]">
              {col.label}
            </p>
            <p className="text-[8.5px] text-[#7a6a5a]">{col.sub}</p>
          </div>
        ))}
      </div>

      {/* Content row */}
      <div className="grid grid-cols-4 bg-white">
        {columns.map((col, i) => (
          <div key={i} className="border-r border-[#EDE5D5] p-2.5 last:border-0">
            {col.entries.map((entry, j) => (
              <div key={j} className="mb-2 flex items-start gap-1.5 last:mb-0">
                <span className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full bg-[#B9854E]" />
                <div>
                  <p className="font-mono text-[9.5px] font-bold text-[#2F2823]">
                    {entry.code}
                  </p>
                  <p className="text-[8.5px] text-[#7a6a5a]">{entry.description}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
