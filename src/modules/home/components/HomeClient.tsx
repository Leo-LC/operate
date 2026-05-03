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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
}

const ALL_MODULES: ModuleCard[] = [
  {
    key: "reviews",
    label: "Reviews",
    description: "Sync and reply to Google reviews with templates and rating rules.",
    href: "/dashboard/reviews",
    icon: StarIcon,
  },
  {
    key: "schedules",
    label: "Scheduling",
    description: "Manage staff schedules, shifts, and payroll across branches.",
    href: "/dashboard/scheduling",
    icon: CalendarDaysIcon,
  },
  {
    key: "animals",
    label: "Animals",
    description: "Records, health statuses, and events for all animals.",
    href: "/dashboard/animals",
    icon: PawPrintIcon,
  },
  {
    key: "documents",
    label: "Documents",
    description: "Permits, certificates, and compliance docs — with expiry tracking.",
    href: "/dashboard/documents",
    icon: FileTextIcon,
  },
  {
    key: "accounting",
    label: "Accounting",
    description: "Daily revenue and costs per location, with monthly summaries.",
    href: "/dashboard/accounting",
    icon: CalculatorIcon,
  },
  {
    key: "reports",
    label: "Reports",
    description: "Cross-module summaries and alerts at a glance.",
    href: "/dashboard/reports",
    icon: BarChart2Icon,
  },
  {
    key: "admin",
    label: "Admin",
    description: "Manage users, locations, module access, and audit logs.",
    href: "/dashboard/admin",
    icon: ShieldIcon,
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

  const alerts: Partial<Record<ModuleKey, number>> = {
    documents: docsAlert,
    animals: animalsAlert,
  };

  const visibleModules = ALL_MODULES.filter((m) => hasModuleAccess(permissions, m.key));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-muted-foreground">{today}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">What would you like to tackle today?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleModules.map((mod) => {
          const Icon = mod.icon;
          const alertCount = alerts[mod.key] ?? 0;
          return (
            <Link key={mod.key} href={mod.href} className="group">
              <Card className="h-full border-border/70 bg-card/80 shadow-sm transition-colors hover:border-border hover:bg-card">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  {alertCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {alertCount} need attention
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{mod.label}</CardTitle>
                    <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
