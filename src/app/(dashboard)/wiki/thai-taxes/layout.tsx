"use client";
import { Suspense } from "react";
import { LanguageProvider } from "@/modules/wiki/thai-taxes/components/LanguageProvider";

export default function ThaiTaxesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LanguageProvider>{children}</LanguageProvider>
    </Suspense>
  );
}
