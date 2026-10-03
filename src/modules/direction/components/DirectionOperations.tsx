"use client";

import { useCallback, useEffect, useState } from "react";
import { OperationsView, type AccountingData } from "@/modules/reports/components/ReportsClient";
import { DateRangePicker, ShopMultiSelect, bangkokToday, shopMultiParam } from "@/components/ui/filters";
import { useDirectionPeriod, useDirectionShops } from "@/modules/direction/lib/useDirectionPeriod";

export function DirectionOperations() {
  const { from, to, setRange } = useDirectionPeriod();
  const { selectedShops, setSelectedShops } = useDirectionShops();
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (f: string, t: string, shops: string[], locs: { id: string; name: string }[]) => {
    setLoading(true);
    try {
      const locParam = shopMultiParam(shops);
      const res = await fetch(`/api/reports/accounting?from=${f}&to=${t}&locations=${locParam}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as AccountingData;
      setData(json);
      if (locs.length === 0 && json.locations.length > 0) {
        setLocations(json.locations);
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
        <DateRangePicker value={{ from, to }} onChange={({ from: f, to: t }) => setRange(f, t)} today={bangkokToday()} />
        {locations.length > 0 && (
          <ShopMultiSelect
            options={locations}
            selected={selectedShops}
            onChange={setSelectedShops}
            allLabel="Toutes les boutiques"
            getLabel={(loc) => loc.name.replace(/^Capybara Coffee\s*/i, "").trim() || loc.name}
          />
        )}
      </div>
      {loading && <div className="py-10 text-center text-sm text-[var(--fg-4)]">Chargement…</div>}
      {!loading && data && <OperationsView data={data} />}
      {!loading && !data && <div className="py-10 text-center text-sm text-[var(--fg-4)]">Pas de données</div>}
    </div>
  );
}
