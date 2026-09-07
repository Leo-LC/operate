"use client";

import { DailyProfitView } from "@/modules/reports/components/DailyProfitView";
import { useDirectionPeriod } from "@/modules/direction/lib/useDirectionPeriod";

export function DirectionDaily() {
  const { from, to, setRange } = useDirectionPeriod();
  return <DailyProfitView from={from} to={to} onFromChange={(f) => setRange(f, to)} onToChange={(t) => setRange(from, t)} />;
}
