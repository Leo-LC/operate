"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. You can try again or go back to the dashboard.
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] text-muted-foreground/60">ID: {error.digest}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={reset}>
          Try again
        </Button>
        <a
          href="/home"
          className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-sm text-background"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
