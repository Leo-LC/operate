import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginCard } from "@/components/login-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StarIcon,
  FileTextIcon,
  PawPrintIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  BarChart2Icon,
} from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <header className="flex items-center justify-between rounded-2xl border border-border/70 bg-sidebar/80 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
            Op
          </div>
          <span className="text-sm font-semibold tracking-tight sm:text-base">Operate</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mt-8 space-y-12">
        <section className="space-y-7 text-center">
          <div className="mx-auto max-w-2xl space-y-4">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              One platform for every operational concern.
            </h1>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
              Manage reviews, documents, animals, scheduling, and accounting across all your locations — in one place.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <LoginCard />
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            What&apos;s inside
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Reviews</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Sync and reply to Google reviews across all locations with templates and rating rules.
                  </p>
                </div>
                <StarIcon className="mt-0.5 size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Documents</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Track permits, certificates, and compliance docs — with expiry alerts.
                  </p>
                </div>
                <FileTextIcon className="mt-0.5 size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Animals</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Keep records of all animals across locations, health statuses, and events.
                  </p>
                </div>
                <PawPrintIcon className="mt-0.5 size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Accounting</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Log daily revenue and costs per location, with monthly summaries.
                  </p>
                </div>
                <CalculatorIcon className="mt-0.5 size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Scheduling</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Manage staff schedules, shifts, and payroll across branches.
                  </p>
                </div>
                <CalendarDaysIcon className="mt-0.5 size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Reports</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Cross-module summaries and alerts — everything that needs attention, at a glance.
                  </p>
                </div>
                <BarChart2Icon className="mt-0.5 size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-border/70 pt-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Operate · Internal operations platform</span>
          <span className="text-[10px]">Deployed on Vercel · Data by Supabase · Private workspace</span>
        </footer>
      </main>
    </div>
  );
}
