import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NoteBoxProps {
  icon?: string;
  children: ReactNode;
  className?: string;
}

export function NoteBox({ icon = "💡", children, className }: NoteBoxProps) {
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-r-lg border border-[#fcd34d] border-l-2 border-l-[#B9854E] bg-[#fff8ee] p-3.5",
        className
      )}
    >
      <span className="mt-0.5 shrink-0 text-sm">{icon}</span>
      <div className="text-[12px] leading-relaxed text-[#5c4d3c]">{children}</div>
    </div>
  );
}
