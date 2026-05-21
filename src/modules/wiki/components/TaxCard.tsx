import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TaxTag {
  label: string;
  variant: "green" | "amber" | "red" | "blue" | "purple" | "muted";
}

export interface TaxCardProps {
  icon: string;
  rate: string;
  name: string;
  subtitle?: string;
  description: string;
  tags?: TaxTag[];
  deadline?: string;
  href: string;
  variant?: "default" | "dark" | "highlighted";
  className?: string;
}

const tagVariantClasses: Record<TaxTag["variant"], string> = {
  green: "bg-green-100 text-green-900",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-900",
  blue: "bg-blue-100 text-blue-900",
  purple: "bg-purple-100 text-purple-900",
  muted: "bg-[#EDE5D5] text-[#5c4d3c]",
};

const cardVariantClasses: Record<NonNullable<TaxCardProps["variant"]>, string> = {
  default:
    "bg-white border-[#E8DDD0] hover:border-[#B9854E] hover:shadow-[0_4px_20px_rgba(185,133,78,0.13)]",
  dark: "bg-[#2F2823] border-[#2F2823] hover:border-[#B9854E]",
  highlighted: "bg-[#FDF8F3] border-[#B9854E]",
};

export function TaxCard({
  icon,
  rate,
  name,
  subtitle,
  description,
  tags,
  deadline,
  href,
  variant = "default",
  className,
}: TaxCardProps) {
  const isDark = variant === "dark";

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-2.5 rounded-[11px] border p-4 transition-all duration-200 hover:-translate-y-px",
        cardVariantClasses[variant],
        className
      )}
    >
      {/* Row 1: icon + rate */}
      <div className="flex items-start justify-between">
        <span className="text-xl leading-none">{icon}</span>
        <span className="font-mono text-lg font-extrabold text-[#B9854E] leading-none">
          {rate}
        </span>
      </div>

      {/* Row 2: name + subtitle */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-[13px] font-bold leading-tight",
            isDark ? "text-[#F7F2E9]" : "text-[#2F2823]"
          )}
        >
          {name}
        </span>
        {subtitle && (
          <span className="text-[10px] text-[#7a6a5a] leading-tight shrink-0">
            {subtitle}
          </span>
        )}
      </div>

      {/* Row 3: description */}
      <p
        className={cn(
          "text-[11.5px] leading-relaxed",
          isDark ? "text-[#a08060]" : "text-[#7a6a5a]"
        )}
      >
        {description}
      </p>

      {/* Row 4: tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                tagVariantClasses[tag.variant]
              )}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Row 5: footer */}
      <div
        className={cn(
          "flex items-center justify-between border-t pt-2.5 mt-0.5",
          isDark ? "border-white/10" : "border-[#E8DDD0]"
        )}
      >
        <span className="text-[10px] text-[#7a6a5a]">
          {deadline ?? ""}
        </span>
        <span className="text-[10px] font-semibold text-[#B9854E] group-hover:underline">
          Voir détails →
        </span>
      </div>
    </Link>
  );
}
