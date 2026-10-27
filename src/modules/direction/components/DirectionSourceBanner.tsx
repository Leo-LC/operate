"use client";

import { useEffect, useState } from "react";
import { ChevronRightIcon } from "lucide-react";

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
// Replié par défaut : c'est un diagnostic, pas une information de pilotage.
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

  const sync = data.lastLoyverseSync;

  return (
    <details className="dir-source">
      <summary title="Source des données — visible par le owner uniquement">
        <ChevronRightIcon className="dir-source-chevron" size={13} aria-hidden />
        <span className="dir-source-label">Sources &amp; synchronisation</span>
        <span className="dir-source-meta">
          {sync ? `Loyverse ${sync.status} · ${fmtDate(sync.finished_at)}` : "Loyverse —"}
        </span>
      </summary>
      <dl className="dir-source-grid">
        <div>
          <dt>Source chiffres</dt>
          <dd>{data.salesDetail}</dd>
        </div>
        <div>
          <dt>Coûts</dt>
          <dd><code>{data.costsSource}</code></dd>
        </div>
        <div>
          <dt>Compteurs</dt>
          <dd><code>{data.countersSource}</code></dd>
        </div>
        <div>
          <dt>Write-back</dt>
          <dd>{data.writeBackEnabled ? "ON" : "OFF"}</dd>
        </div>
        <div>
          <dt>Dernière sync Loyverse</dt>
          <dd>
            {sync
              ? `${sync.status} · ${fmtDate(sync.finished_at)} · ${sync.total_snapshots ?? "?"} snaps`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Dernier import Sheets</dt>
          <dd>{data.lastSheetsImport ? fmtDate(data.lastSheetsImport.created_at) : "—"}</dd>
        </div>
      </dl>
    </details>
  );
}
