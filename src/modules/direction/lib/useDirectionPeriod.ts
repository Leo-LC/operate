"use client";

import { useEffect, useState } from "react";

function bangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const o: Record<string, string> = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${o.year}-${o.month}-${o.day}`;
}
function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const PERIOD_KEY = "direction-period";
const SHOPS_KEY = "direction-shops";

export function useDirectionPeriod() {
  const [from, setFrom] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PERIOD_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { from: string; to: string };
          if (parsed.from && parsed.to) return parsed.from;
        }
      } catch {}
    }
    return monthStart();
  });
  const [to, setTo] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PERIOD_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { from: string; to: string };
          if (parsed.from && parsed.to) return parsed.to;
        }
      } catch {}
    }
    return bangkokToday();
  });

  // sync to localStorage when from/to change
  useEffect(() => {
    try {
      localStorage.setItem(PERIOD_KEY, JSON.stringify({ from, to }));
      // dispatch event for other tabs/components to sync
      window.dispatchEvent(new CustomEvent("direction-period-change", { detail: { from, to } }));
    } catch {}
  }, [from, to]);

  // listen for changes from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { from: string; to: string };
      if (detail.from !== from || detail.to !== to) {
        setFrom(detail.from);
        setTo(detail.to);
      }
    };
    window.addEventListener("direction-period-change", handler as EventListener);
    const storageHandler = (e: StorageEvent) => {
      if (e.key === PERIOD_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as { from: string; to: string };
          setFrom(parsed.from);
          setTo(parsed.to);
        } catch {}
      }
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("direction-period-change", handler as EventListener);
      window.removeEventListener("storage", storageHandler);
    };
  }, [from, to]);

  return { from, to, setFrom, setTo, setRange: (f: string, t: string) => { setFrom(f); setTo(t); } };
}

export function useDirectionShops() {
  const [selectedShops, setSelectedShops] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SHOPS_KEY);
        if (raw) return JSON.parse(raw) as string[];
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(SHOPS_KEY, JSON.stringify(selectedShops));
      window.dispatchEvent(new CustomEvent("direction-shops-change", { detail: selectedShops }));
    } catch {}
  }, [selectedShops]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string[];
      setSelectedShops(detail);
    };
    window.addEventListener("direction-shops-change", handler as EventListener);
    return () => window.removeEventListener("direction-shops-change", handler as EventListener);
  }, []);

  return { selectedShops, setSelectedShops };
}
