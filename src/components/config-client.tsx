"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import type { Session } from "next-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import { signOut } from "next-auth/react";

interface ConfigClientProps {
  user: Session["user"] | null;
}

export function ConfigClient({ user }: ConfigClientProps) {
  const [activeSection, setActiveSection] = useState<"templates" | "rules">("templates");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">Capybara Coffee</span>
            <span className="text-muted-foreground hidden text-sm sm:inline">GBP Review Manager</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full px-3 text-xs sm:text-sm transition-colors hover:bg-muted/70"
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/config">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 rounded-full px-3 text-xs sm:text-sm transition-colors hover:bg-muted/80"
                aria-current="page"
              >
                <SettingsIcon className="size-4" />
                Config
              </Button>
            </Link>
            <ThemeToggle />
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="gap-1.5 rounded-full px-3 text-xs sm:text-sm transition-colors hover:bg-muted/70"
            >
              <LogOutIcon className="size-4" />
              Sign out
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-2 text-xs text-muted-foreground">
          Dashboard <span className="mx-1">/</span>
          <span className="text-foreground">Config</span>
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          Currently logged in as{" "}
          <span className="font-medium text-foreground">
            {user?.email ?? "unknown"}
          </span>
        </p>
        <div className="mb-5 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-1 py-1">
            <Button
              size="sm"
              variant={activeSection === "templates" ? "secondary" : "ghost"}
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => setActiveSection("templates")}
            >
              Reply templates
            </Button>
            <Button
              size="sm"
              variant={activeSection === "rules" ? "secondary" : "ghost"}
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => setActiveSection("rules")}
            >
              Rating rules
            </Button>
          </div>
        </div>

        {activeSection === "templates" ? (
          <section
            aria-label="Reply templates"
            className="space-y-6 config-section-animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Pre-written messages</CardTitle>
                <CardDescription>
                  Default reply text per rating. Staff can edit before sending.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>5 stars</Label>
                  <Textarea
                    rows={4}
                    placeholder="Thank you so much for your 5-star review! …"
                    className="resize-none"
                    defaultValue="Thank you so much for your 5-star review! We're really glad you enjoyed your visit and hope to welcome you back again soon. 🫶"
                  />
                </div>
                <div className="space-y-2">
                  <Label>4 stars</Label>
                  <Textarea
                    rows={4}
                    placeholder="Thank you for your 4-star review! …"
                    className="resize-none"
                    defaultValue="Thank you for your 4-star review! We appreciate your feedback. If there's anything we can improve for a 5-star experience next time, feel free to reach out at capybaracoffeethailand@gmail.com 🙏"
                  />
                </div>
                <div className="space-y-2">
                  <Label>1–3 stars (Needs attention)</Label>
                  <Textarea
                    rows={2}
                    placeholder="No default — staff write custom replies."
                    className="resize-none bg-muted/50"
                    readOnly
                  />
                  <p className="text-muted-foreground text-xs">
                    No pre-fill; staff must write a custom reply.
                  </p>
                </div>
                <Button disabled className="mt-2">Save templates (coming soon)</Button>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section
            aria-label="Rating rules"
            className="space-y-6 config-section-animate"
          >
            <Card>
              <CardHeader>
                <CardTitle>Rating rules</CardTitle>
                <CardDescription>
                  Which ratings use which template and which need manual attention.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="r5" defaultChecked />
                  <Label htmlFor="r5">5 stars — use 5★ template, bulk send allowed</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="r4" defaultChecked />
                  <Label htmlFor="r4">4 stars — use 4★ template, bulk send allowed</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="r123" defaultChecked />
                  <Label htmlFor="r123">1–3 stars — Needs attention (no pre-fill, custom reply only)</Label>
                </div>
                <Button disabled className="mt-2">Save rules (coming soon)</Button>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
