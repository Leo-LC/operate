import Link from "next/link";
import { ChevronRightIcon, ClockIcon } from "lucide-react";

export default function PublicWikiIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-[#2F2823]">Wiki</h1>
        <p className="mt-1 text-sm text-[#7a6a5a]">Base de connaissances</p>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#B9854E]">
            Comptabilité &amp; Fiscalité
          </span>
          <span className="h-px flex-1 bg-[#E8DDD0]" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/wiki/thai-taxes"
            aria-label="Comptabilité & Taxes en Thaïlande"
            className="group flex items-start justify-between rounded-lg border border-[#E8DDD0] bg-[#F7F2E9] p-4 transition-all hover:border-[#B9854E]/40 hover:shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug text-[#2F2823]">
                Comptabilité &amp; Taxes en Thaïlande
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#7a6a5a]">
                Vue d&apos;ensemble complète de la fiscalité thaïlandaise : VAT, retenues à la
                source, impôt sur les sociétés, charges sociales, dividendes et calendrier des
                déclarations.
              </p>
              <div className="mt-3 flex items-center gap-1 text-[10px] text-[#7a6a5a]">
                <ClockIcon className="h-3 w-3 shrink-0" />
                <time dateTime="2026-05-21">21 mai 2026</time>
              </div>
            </div>
            <ChevronRightIcon className="ml-3 mt-0.5 h-4 w-4 shrink-0 text-[#7a6a5a] opacity-50 transition-opacity group-hover:opacity-100" />
          </Link>
        </div>
      </section>
    </div>
  );
}
