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
  UsersIcon,
  ClockIcon,
  BanknoteIcon,
  BookOpenIcon,
  PaletteIcon,
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
    "grid w-full items-center rounded-md px-2 py-2 text-xs transition-all duration-300 ease-in-out",
    locked
      ? "grid-cols-[2rem_1fr]"
      : "grid-cols-[2rem_0fr] group-hover:grid-cols-[2rem_1fr]",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground/55 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
  ].join(" ");
}

function labelClass(locked: boolean): string {
  return [
    "overflow-hidden whitespace-nowrap pl-2 text-[12px] text-sidebar-foreground transition-opacity duration-200 ease-out",
    locked ? "opacity-100" : "opacity-0 group-hover:opacity-100",
  ].join(" ");
}

function iconClass(active: boolean): string {
  return `h-4 w-4 transition-colors ${active ? "text-sidebar-foreground" : "text-sidebar-foreground/50"}`;
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

  const canSeeReviews    = hasModuleAccess(permissions, "reviews");
  const canSeeAdmin      = hasModuleAccess(permissions, "admin");
  const canSeeDocuments  = hasModuleAccess(permissions, "documents");
  const canSeeAnimals    = hasModuleAccess(permissions, "animals");
  const canSeeSchedules  = hasModuleAccess(permissions, "schedules");
  const canSeeAccounting = hasModuleAccess(permissions, "accounting");
  const canSeeReports    = hasModuleAccess(permissions, "reports");
  const canSeeContacts   = hasModuleAccess(permissions, "contacts");
  const canSeeAttendance = hasModuleAccess(permissions, "attendance");
  const canSeePayments   = hasModuleAccess(permissions, "payments");
  const canSeeWiki       = hasModuleAccess(permissions, "wiki");

  const isHome       = pathname === "/dashboard/home" || pathname === "/dashboard";
  const isReviews    = pathname.startsWith("/dashboard/reviews");
  const isScheduling = pathname.startsWith("/dashboard/scheduling");
  const isDocuments  = pathname.startsWith("/dashboard/documents");
  const isAnimals    = pathname.startsWith("/dashboard/animals");
  const isAccounting = pathname.startsWith("/dashboard/accounting");
  const isReports    = pathname.startsWith("/dashboard/reports");
  const isContacts   = pathname.startsWith("/dashboard/contacts");
  const isAttendance = pathname.startsWith("/dashboard/attendance");
  const isPayments   = pathname.startsWith("/dashboard/payments");
  const isAdmin      = pathname.startsWith("/dashboard/admin");
  const isWiki            = pathname.startsWith("/dashboard/wiki");
  const isBrandGuidelines = pathname.startsWith("/brand-guidelines");

  const asideClass = [
    "group sticky top-12 hidden h-[calc(100vh-3rem)] flex-col items-center overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out md:flex",
    sidebarLocked ? "w-48" : "w-14 hover:w-48",
  ].join(" ");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 text-xs text-muted-foreground backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/home" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground tracking-tight">
              Op
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-serif text-[14px] text-foreground">Operate</span>
              <span className="max-w-[220px] truncate text-[10px] text-muted-foreground mt-0.5">{email}</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-1.5 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:inline-flex"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOutIcon className="size-3.5" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-1 pt-12">
        {/* Dark sidebar */}
        <aside className={asideClass}>
          <div className="mt-3 flex w-full flex-1 flex-col items-center gap-0.5 px-2">

            <Link href="/dashboard/home" className={navItemClass(isHome, sidebarLocked)}>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                <HouseIcon className={iconClass(isHome)} />
              </div>
              <span className={labelClass(sidebarLocked)}>Overview</span>
            </Link>

            {canSeeReviews && (
              <Link href="/dashboard/reviews" className={navItemClass(isReviews, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <StarIcon className={iconClass(isReviews)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Reviews</span>
              </Link>
            )}

            {(canSeeSchedules || canSeeAttendance || canSeePayments) && (
              <div className="my-1 border-t border-sidebar-foreground/10" />
            )}

            {canSeeSchedules && (
              <Link href="/dashboard/scheduling" className={navItemClass(isScheduling, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <CalendarDaysIcon className={iconClass(isScheduling)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Scheduling</span>
              </Link>
            )}

            {canSeeAttendance && (
              <Link href="/dashboard/attendance" className={navItemClass(isAttendance, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <ClockIcon className={iconClass(isAttendance)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Attendance</span>
              </Link>
            )}

            {canSeePayments && (
              <Link href="/dashboard/payments" className={navItemClass(isPayments, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <BanknoteIcon className={iconClass(isPayments)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Payments</span>
              </Link>
            )}

            {(canSeeSchedules || canSeeAttendance || canSeePayments) && (
              <div className="my-1 border-t border-sidebar-foreground/10" />
            )}

            {canSeeAnimals && (
              <Link href="/dashboard/animals" className={navItemClass(isAnimals, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <PawPrintIcon className={iconClass(isAnimals)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Animals</span>
              </Link>
            )}

            {canSeeDocuments && (
              <Link href="/dashboard/documents" className={navItemClass(isDocuments, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <FileTextIcon className={iconClass(isDocuments)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Documents</span>
              </Link>
            )}

            {canSeeAccounting && (
              <Link href="/dashboard/accounting" className={navItemClass(isAccounting, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <CalculatorIcon className={iconClass(isAccounting)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Accounting</span>
              </Link>
            )}

            {canSeeReports && (
              <Link href="/dashboard/reports" className={navItemClass(isReports, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <TrendingUpIcon className={iconClass(isReports)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Reports</span>
              </Link>
            )}

            {canSeeContacts && (
              <Link href="/dashboard/contacts" className={navItemClass(isContacts, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <UsersIcon className={iconClass(isContacts)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Contacts</span>
              </Link>
            )}

            {canSeeWiki && (
              <Link href="/dashboard/wiki" className={navItemClass(isWiki, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <BookOpenIcon className={iconClass(isWiki)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Wiki</span>
              </Link>
            )}

            <Link href="/brand-guidelines" className={navItemClass(isBrandGuidelines, sidebarLocked)}>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                <PaletteIcon className={iconClass(isBrandGuidelines)} />
              </div>
              <span className={labelClass(sidebarLocked)}>Brand</span>
            </Link>

            {canSeeAdmin && (
              <Link href="/dashboard/admin" className={navItemClass(isAdmin, sidebarLocked)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                  <ShieldIcon className={iconClass(isAdmin)} />
                </div>
                <span className={labelClass(sidebarLocked)}>Admin</span>
              </Link>
            )}
          </div>

          {/* Sidebar pin toggle */}
          <div className="mb-3 w-full px-2">
            <button
              onClick={toggleLock}
              title={sidebarLocked ? "Unpin sidebar" : "Pin sidebar open"}
              className={navItemClass(false, sidebarLocked) + " cursor-pointer"}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground/8">
                <PinIcon
                  className={`h-4 w-4 transition-all duration-200 ${
                    sidebarLocked
                      ? "rotate-45 text-sidebar-foreground"
                      : "text-sidebar-foreground/40"
                  }`}
                />
              </div>
              <span className={labelClass(sidebarLocked)}>
                {sidebarLocked ? "Unpin sidebar" : "Pin sidebar"}
              </span>
            </button>
          </div>
        </aside>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-8">
          {children}
        </main>
      </div>

      <footer className="border-t border-border bg-background/60 py-3 text-center text-[11px] text-muted-foreground/50 font-sans">
        © {new Date().getFullYear()} Created by Léo Lecée — Nexus-Hub
      </footer>
    </div>
  );
}
