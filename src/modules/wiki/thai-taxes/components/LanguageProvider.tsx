"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type WikiLang = "fr" | "en";

const STORAGE_KEY = "wiki-lang";

interface LanguageContextValue {
  lang: WikiLang;
  setLang: (lang: WikiLang) => void;
  t: <T>(field: Record<WikiLang, T>) => T;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isValidLang(value: string | null): value is WikiLang {
  return value === "fr" || value === "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLangState] = useState<WikiLang>("fr");

  useEffect(() => {
    const fromUrl = searchParams.get("lang");
    if (isValidLang(fromUrl)) {
      setLangState(fromUrl);
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return;
    }
    const fromStorage = window.localStorage.getItem(STORAGE_KEY);
    if (isValidLang(fromStorage)) setLangState(fromStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback(
    (next: WikiLang) => {
      setLangState(next);
      window.localStorage.setItem(STORAGE_KEY, next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("lang", next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const t = useCallback(
    <T,>(field: Record<WikiLang, T>) => field[lang] ?? field.fr,
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useWikiLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useWikiLang must be used within a LanguageProvider");
  return ctx;
}
