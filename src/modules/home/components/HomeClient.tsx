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
} from "lucide-react";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import type { ModuleKey } from "@/core/permissions/types";

interface HomeClientProps {
  name: string;
  role?: "owner" | "staff";
  docsAlert: number;
  animalsAlert: number;
}

interface ModuleCard {
  key: ModuleKey;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;       // tailwind bg class for icon container
  iconColor: string;   // tailwind text class for icon
}

const ALL_MODULES: ModuleCard[] = [
  {
    key: "reviews",
    label: "Reviews",
    description: "Reply to Google reviews with templates and smart rating rules.",
    href: "/dashboard/reviews",
    icon: StarIcon,
    color: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "schedules",
    label: "Scheduling",
    description: "Manage staff shifts, weekly schedules, and payroll across locations.",
    href: "/dashboard/scheduling",
    icon: CalendarDaysIcon,
    color: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "animals",
    label: "Animals",
    description: "Animal records, health tracking, and upcoming vaccination reminders.",
    href: "/dashboard/animals",
    icon: PawPrintIcon,
    color: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    key: "documents",
    label: "Documents",
    description: "Permits, certificates, and compliance documents with expiry tracking.",
    href: "/dashboard/documents",
    icon: FileTextIcon,
    color: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "accounting",
    label: "Accounting",
    description: "Daily revenue and costs per shop, monthly summaries and KPIs.",
    href: "/dashboard/accounting",
    icon: CalculatorIcon,
    color: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Cross-module overview — compliance, finances, and operations at a glance.",
    href: "/dashboard/reports",
    icon: BarChart2Icon,
    color: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    key: "admin",
    label: "Admin",
    description: "Users, locations, module permissions, and audit logs.",
    href: "/dashboard/admin",
    icon: ShieldIcon,
    color: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
];

export function HomeClient({ name, role, docsAlert, animalsAlert }: HomeClientProps) {
  const permissions = derivePermissionsFromRole(role);
  const firstName = name.split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const alerts: Partial<Record<ModuleKey, { count: number; label: string }>> = {
    ...(docsAlert > 0 ? { documents: { count: docsAlert, label: `${docsAlert} doc${docsAlert !== 1 ? "s" : ""} expiring or expired` } } : {}),
    ...(animalsAlert > 0 ? { animals: { count: animalsAlert, label: `${animalsAlert} animal${animalsAlert !== 1 ? "s" : ""} need attention` } } : {}),
  };
  const totalAlerts = Object.values(alerts).reduce((s, a) => s + a.count, 0);

  const visibleModules = ALL_MODULES.filter((m) => hasModuleAccess(permissions, m.key));

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 px-6 py-7">
        <div className="relative z-10">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{today}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Good to see you, {firstName}.
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {totalAlerts > 0
              ? `You have ${totalAlerts} item${totalAlerts !== 1 ? "s" : ""} that need your attention.`
              : "Everything looks good — pick a module to get started."}
          </p>
        </div>
        {/* Decorative background shape */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl"
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
                className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
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
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">Modules</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const alert = alerts[mod.key];
            return (
              <Link key={mod.key} href={mod.href} className="group">
                <div
                  className={`relative flex h-full flex-col gap-4 rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    alert
                      ? "border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-900/10"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  {/* Icon + arrow row */}
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${mod.color}`}>
                      <Icon className={`size-5 ${mod.iconColor}`} />
                    </div>
                    <ArrowRightIcon className="size-4 text-muted-foreground/40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-foreground">{mod.label}</span>
                      {alert && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                          <AlertTriangleIcon className="size-2.5" />
                          {alert.count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{mod.description}</p>
                  </div>

                  {/* Footer stat */}
                  <div className="border-t border-border/50 pt-3">
                    {alert ? (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        {alert.label} →
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
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
