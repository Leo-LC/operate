"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { AccentSync } from "@/components/accent-preference";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="operate.theme"
      >
        <AccentSync />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
