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

function formatCashDiff(diff: number): string {
  const sign = diff >= 0 ? "+" : "-";
  return `${sign}฿${Math.abs(diff).toLocaleString()}`;
}

export function ShopSummaryCard({ card }: { card: ShopCard }) {
  const { accounting, schedule, entries, attendanceDue, nextVaccine, documents } = card;
  const docIssues = documents.expired + documents.expiring;

  const shortName = card.name.replace(/^Capybara Coffee\s*/i, "").trim() || card.name;

  const hasCritical =
    accounting.daysBehind >= 3 ||
    documents.expired > 0;

  const hasWarning =
    accounting.daysBehind > 0 ||
    (accounting.cashDiff !== null && Math.abs(accounting.cashDiff) > 500) ||
    schedule?.nextWeekMissing ||
    docIssues > 0;

  const statusColor = hasCritical ? "var(--bad)" : hasWarning ? "var(--warn)" : "var(--good)";
  const statusLabel = hasCritical ? "Attention needed" : hasWarning ? "Watch" : "OK";

  return (
    <div className="flex flex-col rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
        <p className="text-sm font-semibold text-[var(--fg)]">{shortName}</p>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-medium"
          style={{ color: statusColor }}
        >
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: statusColor }} />
          {statusLabel}
        </span>
      </div>

      {/* 5-point status list */}
      <div className="flex flex-col divide-y divide-[var(--line)]">
        {/* Accounting */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-[var(--fg-4)]">Accounting</span>
          {accounting.daysBehind === 0 ? (
            <span className="text-xs font-medium" style={{ color: "var(--good)" }}>Submitted</span>
          ) : (
            <Link href={`/accounting?location=${card.id}`} className="text-xs font-medium hover:underline" style={{ color: "var(--bad)" }}>
              {accounting.daysBehind}d behind →
            </Link>
          )}
        </div>

        {/* Cash diff (only if notable) */}
        {accounting.cashDiff !== null && Math.abs(accounting.cashDiff) > 200 && (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-[var(--fg-4)]">Cash diff</span>
            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: Math.abs(accounting.cashDiff) > 500 ? "var(--bad)" : "var(--warn)" }}
            >
              {formatCashDiff(accounting.cashDiff)}
            </span>
          </div>
        )}

        {/* Attendance */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-[var(--fg-4)]">Attendance</span>
          {attendanceDue ? (
            <Link href="/attendance" className="text-xs font-medium hover:underline" style={{ color: "var(--warn)" }}>
              Due →
            </Link>
          ) : (
            <span className="text-xs font-medium" style={{ color: "var(--good)" }}>OK</span>
          )}
        </div>

        {/* Documents */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-[var(--fg-4)]">Documents</span>
          {docIssues === 0 ? (
            <span className="text-xs font-medium" style={{ color: "var(--good)" }}>OK</span>
          ) : (
            <Link href="/documents" className="text-xs font-medium hover:underline" style={{ color: documents.expired > 0 ? "var(--bad)" : "var(--warn)" }}>
              {[
                documents.expired > 0 ? `${documents.expired} expired` : null,
                documents.expiring > 0 ? `${documents.expiring} expiring` : null,
              ].filter(Boolean).join(", ")} →
            </Link>
          )}
        </div>

        {/* Schedule or next vaccine */}
        {schedule !== null ? (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-[var(--fg-4)]">Schedule</span>
            {schedule.nextWeekMissing ? (
              <Link href="/scheduling" className="text-xs font-medium hover:underline" style={{ color: "var(--warn)" }}>
                Not ready →
              </Link>
            ) : (
              <span className="text-xs font-medium" style={{ color: "var(--good)" }}>Ready</span>
            )}
          </div>
        ) : nextVaccine ? (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-[var(--fg-4)]">Next vaccine</span>
            <span className="text-xs text-[var(--fg-3)]">
              {nextVaccine.animalName} · {formatDate(nextVaccine.date)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Link to full shop accounting */}
      <div className="px-4 py-2.5 border-t border-[var(--line)] bg-[var(--surface-2)]">
        <Link
          href={`/accounting?location=${card.id}`}
          className="text-xs font-medium hover:underline"
          style={{ color: "var(--bronze)" }}
        >
          Open accounting →
        </Link>
      </div>
    </div>
  );
}
