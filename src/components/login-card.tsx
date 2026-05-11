"use client";

import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";

interface LoginCardProps {
  minimal?: boolean;
}

export function LoginCard({ minimal }: LoginCardProps) {
  const button = (
    <Button
      size="lg"
      className="group w-full gap-2 bg-foreground text-background hover:bg-foreground/90 font-medium"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
    >
      Sign in with Google
      <ArrowRightIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
    </Button>
  );

  if (minimal) return button;

  return (
    <Card className="h-full w-full border-border/70 bg-card shadow-lg backdrop-blur">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-serif text-xl font-normal">Sign in to continue</CardTitle>
        <CardDescription>Use your Google account to access your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        {button}
      </CardContent>
    </Card>
  );
}
