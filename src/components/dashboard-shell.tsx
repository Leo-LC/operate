"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LogOutIcon,
  ShieldIcon,
  FileTextIcon,
  PawPrintIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  TrendingUpIcon,
  StarIcon,
  HouseIcon,
  PinIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";

interface DashboardShellProps {
  email: string;
  role?: "owner" | "staff";
  children: React.ReactNode;
}

function navItemClass(active: boolean, locked: boolean): string {
  return [
    "grid w-full items-center rounded-lg px-2 py-2 text-xs transition-all duration-300 ease-in-out",
    locked
      ? "grid-cols-[2rem_1fr]"
      : "grid-cols-[2rem_0fr] group-hover:grid-cols-[2rem_1fr]",
    active
      ? "bg-sidebar-accent text-foreground"
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
  ].join(" ");
}

function labelClass(locked: boolean): string {
  return [
    "overflow-hidden whitespace-nowrap pl-2 text-[12px] text-foreground transition-opacity duration-200 ease-out",
    locked ? "opacity-100" : "opacity-0 group-hover:opacity-100",
  ].join(" ");
}

export function DashboardShell({ email, role, children }: DashboardShellProps) {
  const pathname = usePathname();
  const permissions = derivePermissionsFromRole(role);

  const [sidebarLocked, setSidebarLocked] = useState(false);

  useEffect(() => {
    setSidebarLocked(localStorage.getItem("sidebar-locked") === "true");
  }, []);

  function toggleLock() {
    const next = !sidebarLocked;
    setSidebarLocked(next);
    localStorage.setItem("sidebar-locked", String(next));
  }

  const canSeeReviews = hasModuleAccess(permissions, "reviews");
  const canSeeAdmin = hasModuleAccess(permissions, "admin");
  const canSeeDocuments = hasModuleAccess(permissions, "documents");
  const canSeeAnimals = hasModuleAccess(permissions, "animals");
  const canSeeSchedules = hasModuleAccess(permissions, "schedules");
  const canSeeAccounting = hasModuleAccess(permissions, "accounting");
  const canSeeReports = hasModuleAccess(permissions, "reports");

  const isHome = pathname === "/dashboard/home" || pathname === "/dashboard";
  const isReviews = pathname.startsWith("/dashboard/reviews");
  const isScheduling = pathname.startsWith("/dashboard/scheduling");
  const isDocuments = pathname.startsWith("/dashboard/documents");
  const isAnimals = pathname.startsWith("/dashboard/animals");
  const isAccounting = pathname.startsWith("/dashboard/accounting");
  const isReports = pathname.startsWith("/dashboard/reports");
  const isAdmin = pathname.startsWith("/dashboard/admin");

  const asideClass = [
    "group sticky top-12 hidden h-[calc(100vh-3rem)] flex-col items-center overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out md:flex",
    sidebarLocked ? "w-48" : "w-14 hover:w-48",
  ].join(" ");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 text-xs text-muted-foreground backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/home" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
              Op
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-foreground">Operate</span>
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
        <aside className={asideClass}>
          <div className="mt-3 flex w-full flex-1 flex-col items-center gap-1 px-1">
            <Link href="/dashboard/home" className={navItemClass(isHome, sidebarLocked)}>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                <HouseIcon className={`h-4 w-4 transition-colors ${isHome ? "text-foreground" : "text-muted-foreground"}`} />
              </div>
              <span className={labelClass(sidebarLocked)}>Home</span>
            </Link>

            {canSeeReviews && (
              <Link href="/dashboard/reviews" className={navItemClass(isReviews, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <StarIcon className={`h-4 w-4 transition-colors ${isReviews ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                <span className={labelClass(sidebarLocked)}>Reviews</span>
              </Link>
            )}

            {canSeeSchedules && (
              <Link href="/dashboard/scheduling" className={navItemClass(isScheduling, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <CalendarDaysIcon className={`h-4 w-4 transition-colors ${isScheduling ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                <span className={labelClass(sidebarLocked)}>Scheduling</span>
              </Link>
            )}

            {canSeeAnimals && (
              <Link href="/dashboard/animals" className={navItemClass(isAnimals, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <PawPrintIcon className={`h-4 w-4 transition-colors ${isAnimals ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                <span className={labelClass(sidebarLocked)}>Animals</span>
              </Link>
            )}

            {canSeeDocuments && (
              <Link href="/dashboard/documents" className={navItemClass(isDocuments, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <FileTextIcon className={`h-4 w-4 transition-colors ${isDocuments ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                <span className={labelClass(sidebarLocked)}>Documents</span>
              </Link>
            )}

            {canSeeAccounting && (
              <Link href="/dashboard/accounting" className={navItemClass(isAccounting, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <CalculatorIcon className={`h-4 w-4 transition-colors ${isAccounting ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                <span className={labelClass(sidebarLocked)}>Accounting</span>
              </Link>
            )}

            {canSeeReports && (
              <Link href="/dashboard/reports" className={navItemClass(isReports, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <TrendingUpIcon className={`h-4 w-4 transition-colors ${isReports ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                <span className={labelClass(sidebarLocked)}>Reports</span>
              </Link>
            )}

            {canSeeAdmin && (
              <Link href="/dashboard/admin" className={navItemClass(isAdmin, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                  <ShieldIcon className={`h-4 w-4 transition-colors ${isAdmin ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                <span className={labelClass(sidebarLocked)}>Admin</span>
              </Link>
            )}
          </div>

          {/* Sidebar lock toggle */}
          <div className="mb-3 w-full px-1">
            <button
              onClick={toggleLock}
              title={sidebarLocked ? "Unlock sidebar" : "Lock sidebar open"}
              className={navItemClass(false, sidebarLocked) + " cursor-pointer"}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5">
                <PinIcon
                  className={`h-4 w-4 transition-all duration-200 ${
                    sidebarLocked ? "rotate-45 text-foreground" : "text-muted-foreground"
                  }`}
                />
              </div>
              <span className={labelClass(sidebarLocked)}>
                {sidebarLocked ? "Unpin sidebar" : "Pin sidebar"}
              </span>
            </button>
          </div>
        </aside>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 pb-32">{children}</main>
      </div>
    </div>
  );
}
