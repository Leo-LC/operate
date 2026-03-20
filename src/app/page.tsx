import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginCard } from "@/components/login-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2Icon, MessageSquareReplyIcon, RefreshCwIcon } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <header className="flex items-center justify-between rounded-2xl border border-border/70 bg-sidebar/80 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
            CC
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight sm:text-base">Capybara Coffee</span>
            <span className="text-[11px] text-muted-foreground sm:text-xs">GBP Review Manager</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <main className="mt-8 space-y-12">
        <section className="space-y-7 text-center">
          <div className="flex justify-center">
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[11px] font-medium shadow-sm backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
              Review operations workspace
            </Badge>
          </div>
          <div className="mx-auto max-w-2xl space-y-4">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Smoothly manage every Google review in one place.
            </h1>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
              Capybara Coffee&apos;s internal console for syncing unreplied reviews, applying templates,
              and keeping responses on-brand across all locations.
            </p>
          </div>
          <div className="mx-auto w-full max-w-2xl">
            <LoginCard />
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Why this console exists
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Sync reviews</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Pull unreplied reviews across all chosen locations into a single queue.
                  </p>
                </div>
                <RefreshCwIcon className="mt-0.5 size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Reply faster</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Apply rating-aware templates and keep your team aligned on tone.
                  </p>
                </div>
                <MessageSquareReplyIcon className="mt-0.5 size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Stay in control</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Choose which locations sync, then track what&apos;s been replied to and why.
                  </p>
                </div>
                <CheckCircle2Icon className="mt-0.5 size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-border/70 pt-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Capybara Coffee · Internal GBP Review Manager</span>
          <span className="text-[10px]">
            Deployed on Vercel · Data platform by Supabase · Private workspace
          </span>
        </footer>
      </main>
    </div>
  );
}
