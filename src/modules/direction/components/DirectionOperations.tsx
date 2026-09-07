"use client";

import { useCallback, useEffect, useState } from "react";
import { OperationsView, type AccountingData } from "@/modules/reports/components/ReportsClient";
import { DateRangePicker } from "@/modules/reports/components/DateRangePicker";
import { PillButton } from "@/components/ui/pill-button";

function bangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const o: Record<string, string> = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${o.year}-${o.month}-${o.day}`;
}
function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function DirectionOperations() {
  const [from, setFrom] = useState(() => monthStart());
  const [to, setTo] = useState(() => bangkokToday());
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (f: string, t: string, shops: string[], locs: { id: string; name: string }[]) => {
    setLoading(true);
    try {
      const locParam = shops.length === locs.length ? "all" : shops.join(",");
      const res = await fetch(`/api/reports/accounting?from=${f}&to=${t}&locations=${locParam}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as AccountingData;
      setData(json);
      if (locs.length === 0 && json.locations.length > 0) {
        setLocations(json.locations);
        setSelectedShops(json.locations.map((l) => l.id));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(from, to, [], []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (locations.length === 0) return;
    void fetchData(from, to, selectedShops, locations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, selectedShops.join(",")]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <DateRangePicker value={{ from, to }} onChange={({ from: f, to: t }) => { setFrom(f); setTo(t); }} today={bangkokToday()} />
        {locations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <PillButton active={selectedShops.length === locations.length} onClick={() => setSelectedShops(locations.map((l) => l.id))}>Toutes les boutiques</PillButton>
            {locations.map((loc) => (
              <PillButton key={loc.id} active={selectedShops.includes(loc.id)} onClick={() => setSelectedShops((prev) => prev.includes(loc.id) ? prev.filter((s) => s !== loc.id) : [...prev, loc.id])}>
                {loc.name.replace(/^Capybara Coffee\s*/i, "").trim() || loc.name}
              </PillButton>
            ))}
          </div>
        )}
      </div>
      {loading && <div className="py-10 text-center text-sm text-[var(--fg-4)]">Chargement…</div>}
      {!loading && data && <OperationsView data={data} />}
      {!loading && !data && <div className="py-10 text-center text-sm text-[var(--fg-4)]">Pas de données</div>}
    </div>
  );
}
