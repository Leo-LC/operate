"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UsersIcon, LayoutGridIcon, BarChart2Icon, ReceiptIcon, LogOutIcon, ShieldIcon, FileTextIcon, PawPrintIcon, CalendarDaysIcon, CalculatorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";

interface DashboardShellProps {
  email: string;
  role?: "owner" | "staff";
  children: React.ReactNode;
}

function navItemClass(active: boolean): string {
  return [
    "grid w-full grid-cols-[2rem_0fr] items-center rounded-lg px-2 py-2 text-xs transition-all duration-300 ease-in-out group-hover:grid-cols-[2rem_1fr]",
    active
      ? "bg-sidebar-accent text-foreground"
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
  ].join(" ");
}

export function DashboardShell({ email, role, children }: DashboardShellProps) {
  const pathname = usePathname();
  const permissions = derivePermissionsFromRole(role);
  const canSeeReviews = hasModuleAccess(permissions, "reviews");

  const canSeeAdmin = hasModuleAccess(permissions, "admin");
  const canSeeDocuments = hasModuleAccess(permissions, "documents");
  const canSeeAnimals = hasModuleAccess(permissions, "animals");
  const canSeeSchedules = hasModuleAccess(permissions, "schedules");
  const canSeeAccounting = hasModuleAccess(permissions, "accounting");

  const isDashboard = pathname === "/dashboard";
  const isTemplates = pathname.startsWith("/dashboard/config/templates");
  const isRules = pathname.startsWith("/dashboard/config/rules");
  const isLocations = pathname.startsWith("/dashboard/config/locations");
  const isScheduling = pathname.startsWith("/dashboard/scheduling");
  const isDocuments = pathname.startsWith("/dashboard/documents");
  const isAnimals = pathname.startsWith("/dashboard/animals");
  const isAccounting = pathname.startsWith("/dashboard/accounting");
  const isAdmin = pathname.startsWith("/dashboard/admin");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 text-xs text-muted-foreground backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
              CC
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-foreground">Capybara Coffee</span>
              <span className="max-w-[220px] truncate text-[11px] text-muted-foreground">{email}</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-1.5 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:inline-flex"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOutIcon className="size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-1 pt-12">
        <aside className="group sticky top-12 hidden h-[calc(100vh-3rem)] w-14 flex-col items-center overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out hover:w-48 md:flex">
          <div className="mt-3 flex w-full flex-col items-center gap-1 px-1">
            {canSeeReviews && (
              <Link href="/dashboard" className={navItemClass(isDashboard)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <UsersIcon
                    className={`h-4 w-4 transition-colors ${
                      isDashboard ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span className="overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  Dashboard
                </span>
              </Link>
            )}
            {canSeeReviews && (
              <Link href="/dashboard/config/templates" className={navItemClass(isTemplates)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <LayoutGridIcon
                    className={`h-4 w-4 transition-colors ${
                      isTemplates ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span className="overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  Templates
                </span>
              </Link>
            )}
            {canSeeReviews && (
              <Link href="/dashboard/config/rules" className={navItemClass(isRules)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <BarChart2Icon
                    className={`h-4 w-4 transition-colors ${
                      isRules ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span className="overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  Rating rules
                </span>
              </Link>
            )}
            {canSeeReviews && (
              <Link href="/dashboard/config/locations" className={navItemClass(isLocations)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <ReceiptIcon
                    className={`h-4 w-4 transition-colors ${
                      isLocations ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span className="overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  Locations
                </span>
              </Link>
            )}
            {canSeeSchedules && (
              <Link href="/dashboard/scheduling" className={navItemClass(isScheduling)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <CalendarDaysIcon
                    className={`h-4 w-4 transition-colors ${
                      isScheduling ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span className="overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  Scheduling
                </span>
              </Link>
            )}
            {canSeeAnimals && (
              <Link href="/dashboard/animals" className={navItemClass(isAnimals)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <PawPrintIcon
                    className={`h-4 w-4 transition-colors ${
                      isAnimals ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span className="overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  Animals
                </span>
              </Link>
            )}
            {canSeeDocuments && (
              <Link href="/dashboard/documents" className={navItemClass(isDocuments)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <FileTextIcon
                    className={`h-4 w-4 transition-colors ${
                      isDocuments ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span className="overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  Documents
                </span>
              </Link>
            )}
            {canSeeAccounting && (
              <Link href="/dashboard/accounting" className={navItemClass(isAccounting)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <CalculatorIcon
                    className={`h-4 w-4 transition-colors ${
                      isAccounting ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span className="overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  Accounting
                </span>
              </Link>
            )}
            {canSeeAdmin && (
              <Link href="/dashboard/admin" className={navItemClass(isAdmin)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <ShieldIcon
                    className={`h-4 w-4 transition-colors ${
                      isAdmin ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span className="overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
                  Admin
                </span>
              </Link>
            )}
          </div>
        </aside>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 pb-32">{children}</main>
      </div>
    </div>
  );
}

