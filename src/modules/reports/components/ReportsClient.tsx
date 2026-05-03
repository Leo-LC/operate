"use client";

import Link from "next/link";
import { FileTextIcon, PawPrintIcon, CalculatorIcon, CalendarDaysIcon, AlertTriangleIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";
import type { ReportsSummary } from "@/app/dashboard/reports/page";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface SummaryCardProps {
  title: string;
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  alert?: boolean;
}

function SummaryCard({ title, href, icon, children, alert }: SummaryCardProps) {
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-4 rounded-xl border p-5 transition-colors hover:bg-muted/40 ${
        alert ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5">
            {icon}
          </div>
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <span className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          View →
        </span>
      </div>
      {children}
    </Link>
  );
}

function StatRow({ label, value, variant = "default" }: { label: string; value: string | number; variant?: "default" | "warn" | "danger" | "muted" }) {
  const colorClass =
    variant === "danger"
      ? "text-destructive font-medium"
      : variant === "warn"
        ? "text-amber-600 font-medium"
        : variant === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={colorClass}>{value}</span>
    </div>
  );
}

export function ReportsClient({ summary }: { summary: ReportsSummary }) {
  const { documents, animals, accounting } = summary;
  const [year, monthNum] = accounting.month.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[monthNum - 1]} ${year}`;
  const coveragePct = accounting.daysInMonth > 0
    ? Math.round((accounting.daysWithEntries / accounting.daysInMonth) * 100)
    : 0;

  const docsAlert = documents.expired > 0 || documents.attention > 0;
  const animalsAlert = animals.attention > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <p className="mt-1 text-xs text-muted-foreground">Platform-wide snapshot — click any card to open the module.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Documents */}
        <SummaryCard
          title="Documents"
          href="/dashboard/documents"
          icon={<FileTextIcon className="h-4 w-4 text-muted-foreground" />}
          alert={docsAlert}
        >
          <div className="flex flex-col gap-1.5">
            <StatRow label="Total tracked" value={fmt(documents.total)} />
            <StatRow
              label="Valid"
              value={fmt(documents.valid)}
              variant={documents.valid === documents.total - documents.attention - documents.expiring - documents.expired ? "default" : "default"}
            />
            <StatRow label="Expiring soon" value={fmt(documents.expiring)} variant={documents.expiring > 0 ? "warn" : "muted"} />
            <StatRow label="Expired" value={fmt(documents.expired)} variant={documents.expired > 0 ? "danger" : "muted"} />
            {documents.attention > 0 && (
              <StatRow label="Need attention" value={fmt(documents.attention)} variant="danger" />
            )}
            {!docsAlert && documents.total > 0 && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-green-600">
                <CheckCircle2Icon className="h-3 w-3" />
                <span>All documents in order</span>
              </div>
            )}
            {docsAlert && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                <AlertTriangleIcon className="h-3 w-3" />
                <span>Action required</span>
              </div>
            )}
          </div>
        </SummaryCard>

        {/* Animals */}
        <SummaryCard
          title="Animals"
          href="/dashboard/animals"
          icon={<PawPrintIcon className="h-4 w-4 text-muted-foreground" />}
          alert={animalsAlert}
        >
          <div className="flex flex-col gap-1.5">
            <StatRow label="Total (non-archived)" value={fmt(animals.total)} />
            <StatRow label="Active" value={fmt(animals.active)} />
            <StatRow
              label="Needs attention"
              value={fmt(animals.attention)}
              variant={animals.attention > 0 ? "warn" : "muted"}
            />
            {animals.attention === 0 && animals.total > 0 && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-green-600">
                <CheckCircle2Icon className="h-3 w-3" />
                <span>All animals healthy</span>
              </div>
            )}
            {animalsAlert && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
                <AlertTriangleIcon className="h-3 w-3" />
                <span>Sick / quarantine / observation</span>
              </div>
            )}
          </div>
        </SummaryCard>

        {/* Accounting */}
        <SummaryCard
          title="Accounting"
          href="/dashboard/accounting"
          icon={<CalculatorIcon className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ClockIcon className="h-3 w-3" />
              <span>{monthLabel}</span>
            </div>
            <StatRow label="Sales (net)" value={`฿ ${fmtCurrency(accounting.salesNet)}`} />
            <StatRow label="Expenses" value={`฿ ${fmtCurrency(accounting.expenses)}`} />
            <StatRow label="HR costs" value={`฿ ${fmtCurrency(accounting.hrCosts)}`} />
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Coverage</span>
              <span className={coveragePct < 50 ? "text-amber-600" : "text-foreground"}>
                {accounting.daysWithEntries} / {accounting.daysInMonth} days ({coveragePct}%)
              </span>
            </div>
          </div>
        </SummaryCard>

        {/* Schedules — no summary data yet, just a link */}
        <SummaryCard
          title="Schedules"
          href="/dashboard/scheduling"
          icon={<CalendarDaysIcon className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">
              View shift schedules, employee assignments, and payroll.
            </p>
          </div>
        </SummaryCard>
      </div>
    </div>
  );
}
