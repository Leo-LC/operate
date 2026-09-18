"use client";

import { useEffect, useState } from "react";

type Status = {
  salesDetail: string;
  costsSource: string;
  countersSource: string;
  writeBackEnabled: boolean;
  lastLoyverseSync: { status: string; finished_at: string | null; total_snapshots: number | null; triggered_by: string | null } | null;
  lastSheetsImport: { created_at: string; reverted_at: string | null } | null;
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// Bandeau technique OWNER-only : d'où viennent les chiffres de Vue d'ensemble.
// Rendu uniquement si userRole === "owner" (les autres rôles ne voient rien).
export function DirectionSourceBanner({ userRole }: { userRole?: string }) {
  const [data, setData] = useState<Status | null>(null);

  useEffect(() => {
    if (userRole !== "owner") return;
    fetch("/api/direction/source-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setData(j))
      .catch(() => {});
  }, [userRole]);

  if (userRole !== "owner" || !data) return null;

  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", gap: "4px 12px", alignItems: "center",
        padding: "6px 12px", borderRadius: "var(--r-sm)",
        background: "var(--info-soft)", border: "1px solid var(--line)",
        fontSize: 11, color: "var(--fg-3)",
      }}
      title="Source des données — visible par le owner uniquement"
    >
      <span><strong>Source chiffres :</strong> {data.salesDetail}</span>
      <span>Coûts : <code>{data.costsSource}</code></span>
      <span>Compteurs : <code>{data.countersSource}</code></span>
      <span>
        Write-back : {data.writeBackEnabled ? "ON" : "OFF"}
        {" · "}Sync Loyverse : {data.lastLoyverseSync ? `${data.lastLoyverseSync.status} ${fmtDate(data.lastLoyverseSync.finished_at)} (${data.lastLoyverseSync.total_snapshots ?? "?"} snaps)` : "—"}
        {" · "}Dernier import Sheets : {data.lastSheetsImport ? fmtDate(data.lastSheetsImport.created_at) : "—"}
      </span>
    </div>
  );
}
