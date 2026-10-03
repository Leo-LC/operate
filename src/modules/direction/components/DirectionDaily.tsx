"use client";

import { DailyProfitView } from "@/modules/reports/components/DailyProfitView";
import { useDirectionPeriod } from "@/modules/direction/lib/useDirectionPeriod";

export function DirectionDaily() {
  const { from, to, setFrom, setTo } = useDirectionPeriod();
  return <DailyProfitView from={from} to={to} onFromChange={setFrom} onToChange={setTo} />;
}
