interface SectionHeaderProps {
  title: string;
  count?: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#B9854E]" />
      <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#B9854E]">
        {title}
      </span>
      <span className="h-px flex-1 bg-[#D4C4B0]" />
      {count !== undefined && (
        <span className="text-[10px] text-[#b0a090]">{count} taxes</span>
      )}
    </div>
  );
}
