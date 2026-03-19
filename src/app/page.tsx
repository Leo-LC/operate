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
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Capybara Coffee</span>
          <span className="text-sm text-muted-foreground">GBP Review Manager</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-8 md:pt-12">
        <section className="space-y-5">
          <div className="space-y-4">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              Internal Review Operations
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Manage Google reviews faster and more consistently.
            </h1>
            <p className="text-base text-muted-foreground">
              Sync unreplied reviews across selected locations, draft better responses with reusable
              templates, and keep your reply workflow organized in one place.
            </p>
          </div>

          <div className="grid items-stretch gap-4 md:grid-cols-[3fr_2fr]">
            <div className="h-full w-full">
              <LoginCard />
            </div>
            <Card className="h-full border-border/70 bg-card/50 shadow-sm">
              <CardContent className="flex h-full flex-col">
                <p className="mb-3 text-sm font-medium text-foreground">Quick start</p>
                <div className="grid gap-1.5 text-sm text-muted-foreground">
                  <div className="rounded-md py-2 transition-colors duration-150 hover:bg-muted/30">
                    <p className="font-medium text-foreground">1. Sign in</p>
                    <p className="text-xs">Use your approved Google account.</p>
                  </div>
                  <div className="rounded-md py-2 transition-colors duration-150 hover:bg-muted/30">
                    <p className="font-medium text-foreground">2. Select locations</p>
                    <p className="text-xs">Choose which locations to include for sync.</p>
                  </div>
                  <div className="rounded-md py-2 transition-colors duration-150 hover:bg-muted/30">
                    <p className="font-medium text-foreground">3. Reply efficiently</p>
                    <p className="text-xs">Use templates and rating rules to respond faster.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="pt-2">
            <p className="mb-3 text-sm font-medium text-foreground">Why teams use this</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-border/70 bg-card/70">
                <CardHeader className="pb-2">
                  <RefreshCwIcon className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Sync Reviews</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  Pull latest unreplied reviews from your Google Business Profile locations.
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/70">
                <CardHeader className="pb-2">
                  <MessageSquareReplyIcon className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Reply Faster</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  Use template categories and rating rules to reduce repetitive manual typing.
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/70">
                <CardHeader className="pb-2">
                  <CheckCircle2Icon className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Stay In Control</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  Choose included locations and keep your review workflow focused and consistent.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 text-xs text-muted-foreground">
          <span>Capybara Coffee GBP Review Manager</span>
          <span>Secure internal access</span>
        </div>
      </div>
    </main>
  );
}
