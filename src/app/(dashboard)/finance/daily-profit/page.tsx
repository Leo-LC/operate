"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DailyProfitView } from "@/modules/reports/components/DailyProfitView";

function today() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }); }

export default function DailyProfitPage() {
  const [to, setTo] = useState(today);
  const [from, setFrom] = useState(() => `${today().slice(0, 7)}-01`);
  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
    <PageHeader eyebrow="Finance" title="Daily P&L" subtitle="Daily economic result from operational revenue and controlled finance inputs." />
    <DailyProfitView from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
  </div>;
}
