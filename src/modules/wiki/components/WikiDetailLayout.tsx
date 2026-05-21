import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DetailHeroTag {
  label: string;
  color: string;
}

export interface DetailHeroProps {
  rate: string;
  name: string;
  subtitle: string;
  tags: DetailHeroTag[];
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  breadcrumbs: BreadcrumbItem[];
  hero: DetailHeroProps;
  children: ReactNode;
}

export function WikiDetailLayout({ breadcrumbs, hero, children }: Props) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[11.5px] text-[#a08060]">
        {breadcrumbs.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[#D4C4B0]">›</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-[#B9854E]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-[#2F2823]">{item.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Hero block */}
      <div className="flex items-start justify-between gap-4 rounded-[14px] bg-[#2F2823] p-5">
        <div className="min-w-0">
          <p className="mb-1 text-[13px] font-bold text-[#F7F2E9]">{hero.name}</p>
          <p className="mb-3 max-w-md text-[11px] leading-relaxed text-[#7a6a5a]">
            {hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hero.tags.map((tag, i) => (
              <span
                key={i}
                className={cn(
                  "rounded px-2 py-0.5 text-[8.5px] font-medium",
                  tag.color
                )}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[34px] font-extrabold leading-none text-[#B9854E]">
          {hero.rate}
        </span>
      </div>

      {/* Page content */}
      <div className="space-y-8">{children}</div>
    </div>
  );
}

/* ─── Section primitives ─────────────────────────────────────────── */

interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#B9854E]">
          {title}
        </span>
        <span className="h-px flex-1 bg-[#D4C4B0]" />
      </div>
      {children}
    </div>
  );
}

interface FormulaBlockProps {
  children: string;
}

export function FormulaBlock({ children }: FormulaBlockProps) {
  return (
    <div className="rounded-md border border-[#D4C4B0] bg-white px-3 py-2 font-mono text-[13px] text-[#2F2823]">
      {children}
    </div>
  );
}

interface ExampleBlockProps {
  label: string;
  children: ReactNode;
}

export function ExampleBlock({ label, children }: ExampleBlockProps) {
  return (
    <div className="rounded-lg bg-[#F7F2E9] p-3.5">
      <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.07em] text-[#7a6a5a]">
        {label}
      </p>
      {children}
    </div>
  );
}

interface ExampleFlowProps {
  items: string[];
}

export function ExampleFlow({ items }: ExampleFlowProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[#B9854E]">→</span>}
          <span className="rounded border border-[#D4C4B0] bg-white px-2 py-0.5 text-[11px]">
            {item}
          </span>
        </span>
      ))}
    </div>
  );
}

interface ThresholdTableProps {
  headers: string[];
  rows: (string | ReactNode)[][];
}

export function ThresholdTable({ headers, rows }: ThresholdTableProps) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={i}
              className="border-b border-[#E8DDD0] pb-1.5 text-[8px] font-bold uppercase tracking-[0.06em] text-[#7a6a5a]"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                className="border-b border-[#F0E8DC] py-1.5 text-[11.5px] text-[#5c4d3c] last:border-0"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface DeadlineCardsProps {
  items: { label: string; value: string; sub?: string }[];
}

export function DeadlineCards({ items }: DeadlineCardsProps) {
  return (
    <div className="flex gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex-1 rounded-lg border border-[#E8DDD0] bg-white p-2.5"
        >
          <p className="mb-0.5 text-[7px] uppercase tracking-[0.07em] text-[#7a6a5a]">
            {item.label}
          </p>
          <p className="font-mono text-[11px] font-bold text-[#2F2823]">
            {item.value}
          </p>
          {item.sub && (
            <p className="mt-0.5 text-[8.5px] text-[#7a6a5a]">{item.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

interface RelatedCardsProps {
  items: { icon: string; label: string; href: string }[];
}

export function RelatedCards({ items }: RelatedCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item, i) => (
        <Link
          key={i}
          href={item.href}
          className="flex items-center justify-between rounded-lg border border-[#E8DDD0] bg-white px-3 py-2 text-[10px] font-semibold text-[#2F2823] transition-colors hover:border-[#B9854E] hover:text-[#B9854E]"
        >
          <span>
            {item.icon} {item.label}
          </span>
          <span className="text-[#B9854E]">→</span>
        </Link>
      ))}
    </div>
  );
}
