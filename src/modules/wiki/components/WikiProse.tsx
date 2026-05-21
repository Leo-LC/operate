interface WikiProseProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  sections: { heading: string; body: string }[];
  updatedAt?: string;
}

export function WikiProse({
  title,
  eyebrow,
  subtitle,
  sections,
  updatedAt,
}: WikiProseProps) {
  return (
    <article className="space-y-6">
      <header className="space-y-1.5">
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#B9854E]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-[#2F2823]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm leading-relaxed text-[#7a6a5a]">{subtitle}</p>
        )}
        {updatedAt && (
          <p className="text-xs text-[#b0a090]">Mis à jour le {updatedAt}</p>
        )}
      </header>

      <div className="space-y-5">
        {sections.map((section, i) => (
          <section key={i}>
            <h2 className="mb-2 text-base font-bold text-[#2F2823]">
              {section.heading}
            </h2>
            <p className="text-sm leading-relaxed text-[#5c4d3c]">{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
