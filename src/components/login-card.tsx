"use client";

import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react";

export function LoginCard() {
  return (
    <Card className="h-full w-full border-border/70 bg-card shadow-lg backdrop-blur">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
          <ShieldCheckIcon className="size-3.5" />
          Secure Google Sign-In
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Sign in to continue
        </CardTitle>
        <CardDescription>
          Use your authorized Google account to access the review dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          size="lg"
          className="group w-full gap-2 bg-white text-black hover:bg-white/90"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Sign in with Google
          <ArrowRightIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Access is limited to approved email addresses.
        </p>
      </CardContent>
    </Card>
  );
}
