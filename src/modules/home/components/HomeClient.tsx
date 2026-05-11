"use client";

import Link from "next/link";
import {
  StarIcon,
  FileTextIcon,
  PawPrintIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  BarChart2Icon,
  ShieldIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  UsersIcon,
} from "lucide-react";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import type { ModuleKey } from "@/core/permissions/types";

interface HomeClientProps {
  name: string;
  role?: "owner" | "staff";
  docsAlert: number;
  animalsAlert: number;
  snippets?: Partial<Record<ModuleKey, string>>;
}

interface ModuleCard {
  key: ModuleKey;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accent: string;
}

const ALL_MODULES: ModuleCard[] = [
  {
    key: "reviews",
    label: "Reviews",
    description: "Reply to Google reviews with templates and smart rating rules.",
    href: "/dashboard/reviews",
    icon: StarIcon,
    accent: "oklch(0.78 0.14 75)",
  },
  {
    key: "schedules",
    label: "Scheduling",
    description: "Manage staff shifts, weekly schedules, and payroll across locations.",
    href: "/dashboard/scheduling",
    icon: CalendarDaysIcon,
    accent: "oklch(0.60 0.14 220)",
  },
  {
    key: "animals",
    label: "Animals",
    description: "Animal records, health tracking, and upcoming vaccination reminders.",
    href: "/dashboard/animals",
    icon: PawPrintIcon,
    accent: "oklch(0.60 0.16 145)",
  },
  {
    key: "documents",
    label: "Documents",
    description: "Permits, certificates, and compliance documents with expiry tracking.",
    href: "/dashboard/documents",
    icon: FileTextIcon,
    accent: "oklch(0.62 0.14 300)",
  },
  {
    key: "accounting",
    label: "Accounting",
    description: "Daily revenue and costs per shop, monthly summaries and KPIs.",
    href: "/dashboard/accounting",
    icon: CalculatorIcon,
    accent: "oklch(0.58 0.15 170)",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Cross-module overview — compliance, finances, and operations at a glance.",
    href: "/dashboard/reports",
    icon: BarChart2Icon,
    accent: "oklch(0.56 0.16 250)",
  },
  {
    key: "contacts",
    label: "Contacts",
    description: "Suppliers, partners, and shop contacts with billing and delivery info.",
    href: "/dashboard/contacts",
    icon: UsersIcon,
    accent: "oklch(0.60 0.13 30)",
  },
  {
    key: "admin",
    label: "Admin",
    description: "Users, locations, module permissions, and audit logs.",
    href: "/dashboard/admin",
    icon: ShieldIcon,
    accent: "oklch(0.55 0.16 20)",
  },
];

export function HomeClient({ name, role, docsAlert, animalsAlert, snippets = {} }: HomeClientProps) {
  const permissions = derivePermissionsFromRole(role);
  const firstName = name.split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const alerts: Partial<Record<ModuleKey, { count: number; label: string }>> = {
    ...(docsAlert > 0    ? { documents: { count: docsAlert,    label: `${docsAlert} doc${docsAlert !== 1 ? "s" : ""} expiring or expired` } }    : {}),
    ...(animalsAlert > 0 ? { animals:   { count: animalsAlert, label: `${animalsAlert} animal${animalsAlert !== 1 ? "s" : ""} need attention` } } : {}),
  };
  const totalAlerts = Object.values(alerts).reduce((s, a) => s + a.count, 0);

  const visibleModules = ALL_MODULES.filter((m) => hasModuleAccess(permissions, m.key));

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card px-6 py-7 shadow-sm">
        <div className="relative z-10">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            {today}
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">
            Good to see you, <em>{firstName}.</em>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {totalAlerts > 0
              ? `You have ${totalAlerts} item${totalAlerts !== 1 ? "s" : ""} that need your attention.`
              : "Everything looks good — here's your overview."}
          </p>
        </div>
        {/* Decorative dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-full w-64 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl"
        />
      </div>

      {/* Alert banner */}
      {totalAlerts > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(alerts).map(([key, alert]) => {
            const mod = ALL_MODULES.find((m) => m.key === key);
            if (!mod) return null;
            return (
              <Link
                key={key}
                href={mod.href}
                className="flex items-center gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
              >
                <AlertTriangleIcon className="size-4 shrink-0" />
                <span>{alert.label}</span>
                <ArrowRightIcon className="size-3.5 shrink-0 opacity-60" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Module grid */}
      <div>
        <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
          Modules
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const alert = alerts[mod.key];
            const snippet = snippets[mod.key];
            return (
              <Link key={mod.key} href={mod.href} className="group">
                <div
                  className={`relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    alert
                      ? "border-amber-200/80 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10"
                      : "border-border hover:border-border/60"
                  }`}
                >
                  {/* Colored top accent bar */}
                  <div
                    className="absolute left-0 top-0 h-[3px] w-full rounded-t-xl opacity-70"
                    style={{ background: alert ? "oklch(0.78 0.14 75)" : mod.accent }}
                  />

                  {/* Icon + arrow row */}
                  <div className="flex items-start justify-between pt-1">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ background: `color-mix(in oklch, ${mod.accent} 15%, transparent)` }}
                    >
                      <Icon
                        className="size-4"
                        style={{ color: mod.accent }}
                      />
                    </div>
                    <ArrowRightIcon className="size-4 text-muted-foreground/30 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground/70" />
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{mod.label}</span>
                      {alert && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                          <AlertTriangleIcon className="size-2.5" />
                          {alert.count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{mod.description}</p>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-border/40 pt-3">
                    {alert ? (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        {alert.label} →
                      </span>
                    ) : snippet ? (
                      <span className="font-mono text-xs font-medium text-foreground/70 transition-colors group-hover:text-foreground">
                        {snippet}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 transition-colors group-hover:text-muted-foreground">
                        Open {mod.label.toLowerCase()} →
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
