import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { LoginCard } from "@/components/login-card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  StarIcon,
  FileTextIcon,
  PawPrintIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  BarChart2Icon,
} from "lucide-react";

const FEATURES = [
  { icon: StarIcon,        label: "Reviews",    desc: "Sync & reply to Google reviews across all locations." },
  { icon: FileTextIcon,    label: "Documents",  desc: "Permits, certificates, expiry alerts — never miss a renewal." },
  { icon: PawPrintIcon,    label: "Animals",    desc: "Health tracking, vaccination records, event logs." },
  { icon: CalculatorIcon,  label: "Accounting", desc: "Daily revenue and costs per shop, with monthly KPIs." },
  { icon: CalendarDaysIcon,label: "Scheduling", desc: "Staff shifts, weekly rosters, and payroll across branches." },
  { icon: BarChart2Icon,   label: "Reports",    desc: "Cross-module summaries — everything in one view." },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    const permissions = await getUserPermissionsFromDb(session.user?.userId, session.user?.role);
    redirect(permissions.global_role === "reviewer" ? "/reviews" : "/loyverse");
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Decorative background blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/8 blur-[80px]" />
        <div className="absolute top-1/2 -right-48 h-80 w-80 rounded-full bg-amber/10 blur-[100px]" />
        <div className="absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-primary/6 blur-[60px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
            Op
          </div>
          <span className="font-serif text-[16px] text-foreground">Operate</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-12 sm:px-10 sm:py-16 lg:py-20">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 lg:items-start">

          {/* Left: copy */}
          <div className="flex flex-col gap-8">
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70">
                Internal operations
              </p>
              <h1 className="font-decorative text-4xl text-foreground sm:text-5xl lg:text-[3.25rem]">
                One platform,<br />
                <em className="not-italic text-primary">every concern.</em>
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Manage your locations, teams, animals, documents, and finances — all in one workspace built for operators.
              </p>
            </div>

            {/* Feature list */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 backdrop-blur-sm">
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: sign-in (shown first on mobile so it's not below the fold) */}
          <div className="order-first flex flex-col gap-4 lg:order-none lg:pt-4">
            <div className="rounded-xl border border-border/70 bg-card shadow-lg shadow-foreground/5 backdrop-blur-sm">
              <div className="px-7 pt-7 pb-5 text-center">
                <h2 className="font-serif text-xl text-foreground">Sign in to continue</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Use your Google account to access your workspace.
                </p>
              </div>
              <div className="px-7 pb-7">
                <LoginCard minimal />
              </div>
            </div>
            <p className="text-center text-[11px] text-muted-foreground/60">
              Private workspace · Access controlled by your administrator
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-auto border-t border-border/60 px-6 py-4 text-[11px] text-muted-foreground/50 sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-center sm:text-left">
          <span>Operate · Internal operations platform</span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-end">
            <a href="/privacy" className="hover:text-muted-foreground transition-colors">
              Privacy Policy
            </a>
            <span aria-hidden>·</span>
            <span>Deployed on Vercel · Data by Supabase</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
