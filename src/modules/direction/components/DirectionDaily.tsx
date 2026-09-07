"use client";

import { useState } from "react";
import { DailyProfitView } from "@/modules/reports/components/DailyProfitView";

function bangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const o: Record<string, string> = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${o.year}-${o.month}-${o.day}`;
}

export function DirectionDaily() {
  const [from, setFrom] = useState(() => `${bangkokToday().slice(0, 7)}-01`);
  const [to, setTo] = useState(() => bangkokToday());
  return <DailyProfitView from={from} to={to} onFromChange={setFrom} onToChange={setTo} />;
}
