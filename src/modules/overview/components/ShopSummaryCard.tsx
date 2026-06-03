import Link from "next/link";
import type { ShopCard } from "@/app/api/overview/cards/route";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function OkRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[var(--good)] text-xs">✓</span>
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

export function ShopSummaryCard({ card }: { card: ShopCard }) {
  const { accounting, schedule, entries, attendanceDue, nextVaccine, documents } = card;
  const docIssues = documents.expired + documents.expiring;

  const shortName = card.name.replace(/^Capybara Coffee\s*/i, "").trim() || card.name;

  return (
    <div className="flex flex-col rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--line)]">
        <p className="text-sm font-semibold text-[var(--fg)]">{shortName}</p>
      </div>

      {/* Rows */}
      <div className="flex flex-col px-4 py-2 divide-y divide-[var(--line)]">
        {/* Accounting */}
        <div className="pb-1">
          {accounting.daysBehind === 0 ? (
            <OkRow label="Accounting up to date" />
          ) : (
            <WarnRow
              label={`${accounting.daysBehind} day${accounting.daysBehind === 1 ? "" : "s"} to fill`}
              href={`/accounting?location=${card.id}`}
            />
          )}
        </div>

        {/* Schedule (weekends only) */}
        {schedule !== null && (
          <div className="py-1">
            {schedule.nextWeekMissing ? (
              <WarnRow label="Prepare next week's schedule" href="/scheduling/schedules" />
            ) : (
              <OkRow label="Next week's schedule ready" />
            )}
          </div>
        )}

        {/* Entries */}
        <div className="py-1">
          {(() => {
            const { period, period1Filled, period2Filled, nearingEnd } = entries;
            const currentFilled = period === 1 ? period1Filled : period2Filled;
            if (nearingEnd && !currentFilled) {
              const label = period === 1 ? "Fill entries period 1 (days 1–15)" : "Fill entries period 2 (days 16–end)";
              return <WarnRow label={label} href="/challenges/overview" />;
            }
            if (!period1Filled && !period2Filled) return null;
            return <OkRow label="Entries filled" />;
          })()}
        </div>

        {/* Attendance */}
        {attendanceDue && (
          <div className="py-1">
            <WarnRow label="Complete attendance before payroll" href="/attendance" />
          </div>
        )}

        {/* Vaccine */}
        <div className="py-1">
          {nextVaccine ? (
            <InfoRow label={`Next vaccine: ${nextVaccine.animalName} · ${formatDate(nextVaccine.date)}`} />
          ) : (
            <InfoRow label="No upcoming vaccines" />
          )}
        </div>

        {/* Documents */}
        <div className="pt-1">
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
        </div>
      </div>
    </div>
  );
}
