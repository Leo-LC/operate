"use client";

import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";

export function LoginCard() {
  return (
    <Card className="h-full w-full border-border/70 bg-card shadow-lg backdrop-blur">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-xl font-semibold tracking-tight">Sign in to continue</CardTitle>
        <CardDescription>Use your Google account to access your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          size="lg"
          className="group w-full gap-2 bg-white text-black hover:bg-white/90"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Sign in with Google
          <ArrowRightIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
