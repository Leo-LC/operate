import Link from "next/link";
import type { ShopCard } from "@/app/api/overview/cards/route";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function SectionLabel({ label }: { label: string }) {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
      {label}
    </span>
  );
}

function OkRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[var(--good)] text-xs shrink-0">✓</span>
      <span className="text-xs text-[var(--fg-4)]">{label}</span>
    </div>
  );
}

function WarnRow({ label, href }: { label: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[var(--bad)] text-xs shrink-0">⚠</span>
        <span className="text-xs text-[var(--fg-2)] truncate">{label}</span>
      </div>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-[10px] font-medium text-[var(--bronze)] hover:underline"
        >
          Go →
        </Link>
      )}
    </div>
  );
}

function InfoRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[var(--fg-4)] text-xs shrink-0">·</span>
      <span className="text-xs text-[var(--fg-3)]">{label}</span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2 border-b border-[var(--line)] last:border-b-0">
      <div className="mb-1">
        <SectionLabel label={label} />
      </div>
      {children}
    </div>
  );
}

export function ShopSummaryCard({ card }: { card: ShopCard }) {
  const { accounting, schedule, entries, attendanceDue, nextVaccine, documents } = card;
  const docIssues = documents.expired + documents.expiring;

  const shortName = card.name.replace(/^Capybara Coffee\s*/i, "").trim() || card.name;

  const hasWarning =
    accounting.daysBehind > 0 ||
    schedule?.nextWeekMissing ||
    (entries.nearingEnd && !(entries.period === 1 ? entries.period1Filled : entries.period2Filled)) ||
    attendanceDue ||
    docIssues > 0;

  return (
    <div className="flex flex-col rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
        <p className="text-sm font-semibold text-[var(--fg)]">{shortName}</p>
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ background: hasWarning ? "var(--bad)" : "var(--good)" }}
        />
      </div>

      {/* Sections */}
      <div className="flex flex-col px-4 py-1">
        {/* Accounting */}
        <Section label="Accounting">
          {accounting.daysBehind === 0 ? (
            <OkRow label="Up to date" />
          ) : (
            <WarnRow
              label={`${accounting.daysBehind} day${accounting.daysBehind === 1 ? "" : "s"} of entries to fill`}
              href={`/accounting?location=${card.id}`}
            />
          )}
        </Section>

        {/* Schedule (weekends only) */}
        {schedule !== null && (
          <Section label="Schedule">
            {schedule.nextWeekMissing ? (
              <WarnRow label="Next week's schedule not ready" href="/scheduling/schedules" />
            ) : (
              <OkRow label="Next week ready" />
            )}
          </Section>
        )}

        {/* Entries */}
        {(() => {
          const { period, period1Filled, period2Filled, nearingEnd } = entries;
          const currentFilled = period === 1 ? period1Filled : period2Filled;
          if (!nearingEnd && period1Filled && period2Filled) return null;
          if (nearingEnd && !currentFilled) {
            const label =
              period === 1
                ? "Period 1 entries (days 1–15) not filled"
                : "Period 2 entries (days 16–end) not filled";
            return (
              <Section label="Entries">
                <WarnRow label={label} href="/challenges/overview" />
              </Section>
            );
          }
          return null;
        })()}

        {/* Attendance */}
        {attendanceDue && (
          <Section label="Attendance">
            <WarnRow label="Complete attendance before payroll" href="/attendance" />
          </Section>
        )}

        {/* Animals */}
        <Section label="Animals">
          {nextVaccine ? (
            <InfoRow label={`Next vaccine — ${nextVaccine.animalName} · ${formatDate(nextVaccine.date)}`} />
          ) : (
            <InfoRow label="No upcoming vaccines" />
          )}
        </Section>

        {/* Documents */}
        <Section label="Documents">
          {docIssues === 0 ? (
            <OkRow label="All documents up to date" />
          ) : (
            <WarnRow
              label={[
                documents.expired > 0 ? `${documents.expired} expired` : null,
                documents.expiring > 0 ? `${documents.expiring} expiring soon` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              href="/documents"
            />
          )}
        </Section>
      </div>
    </div>
  );
}
