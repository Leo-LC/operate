export function FormulaHero() {
  return (
    <div className="rounded-[14px] bg-[#2F2823] p-5">
      {/* Label */}
      <p className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#7a6a5a]">
        La formule fondamentale
      </p>

      {/* Formula row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Blue chip: CA */}
        <div className="flex flex-col gap-0.5 rounded-lg bg-blue-900/20 px-3 py-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-300/70">
            Chiffre d&apos;affaires
          </span>
          <span className="font-mono text-[17px] font-extrabold leading-none text-blue-200">
            CA
          </span>
          <span className="text-[9.5px] text-blue-300/70">hors VAT · top line</span>
        </div>

        {/* Operator − */}
        <span className="text-2xl font-light text-[#7a6a5a]">−</span>

        {/* Amber chip: Expenses */}
        <div className="flex flex-col gap-0.5 rounded-lg bg-amber-900/20 px-3 py-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-300/70">
            Charges
          </span>
          <span className="font-mono text-[17px] font-extrabold leading-none text-amber-200">
            Expenses
          </span>
          <span className="text-[9.5px] text-amber-300/70">
            salaires, loyers, fournisseurs…
          </span>
        </div>

        {/* Operator = */}
        <span className="text-2xl font-light text-[#7a6a5a]">=</span>

        {/* Green chip: Profit */}
        <div className="flex flex-col gap-0.5 rounded-lg bg-green-900/20 px-3 py-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-green-300/70">
            Bénéfice net
          </span>
          <span className="font-mono text-[17px] font-extrabold leading-none text-green-200">
            Profit
          </span>
          <span className="text-[9.5px] text-green-300/70">
            bottom line · base imposable
          </span>
        </div>

        {/* Operator → */}
        <span className="text-2xl font-light text-[#7a6a5a]">→</span>

        {/* Red chip: CIT */}
        <div className="flex flex-col gap-0.5 rounded-lg bg-red-900/20 px-3 py-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-red-300/70">
            Impôt sociétés
          </span>
          <span className="font-mono text-[17px] font-extrabold leading-none text-red-200">
            CIT
          </span>
          <span className="text-[9.5px] text-red-300/70">15–20% selon seuils</span>
        </div>
      </div>

      {/* Note */}
      <p className="mt-4 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-[#7a6a5a]">
        Tout le reste sur cette page est un détail de l&apos;un de ces 4 éléments.{" "}
        <strong className="text-[#B9854E]">La VAT n&apos;est pas du CA</strong> — tu
        la collectes pour l&apos;État, elle transite sans t&apos;appartenir.{" "}
        <strong className="text-[#B9854E]">Seul le bénéfice net est taxé</strong> via
        l&apos;impôt sur les sociétés.
      </p>
    </div>
  );
}
