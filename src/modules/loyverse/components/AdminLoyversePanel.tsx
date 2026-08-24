"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { AlertTriangleIcon } from "lucide-react";

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

type WriteBackResult = {
  enabled: boolean;
  dryRun: boolean;
  date: string;
  daily_upserted: number;
  daily_skipped: number;
  location_upserted: number;
  location_skipped: number;
  errors: string[];
  details: Array<{ store_id: string; location_id: string | null; action: string; error?: string }>;
};

export function AdminLoyversePanel() {
  const [date, setDate] = React.useState<string>(() => bangkokToday());
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);
  const [step, setStep] = React.useState<"idle" | "confirm1" | "confirm2">("idle");
  const [confirmText, setConfirmText] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [dryRunning, setDryRunning] = React.useState(false);
  const [result, setResult] = React.useState<WriteBackResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStatus = React.useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/loyverse/write-back", { cache: "no-store" });
      const j = await res.json();
      if (res.ok) setEnabled(Boolean(j.enabled));
    } catch {
      // ignore
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDryRun = async () => {
    setDryRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/loyverse/write-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, dryRun: true, force: true, confirmText: "ACTIVER" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Dry-run failed");
      setResult(j as WriteBackResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDryRunning(false);
    }
  };

  const handleActivate = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/loyverse/write-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, dryRun: false, force: true, confirmText }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Write-back failed");
      setResult(j as WriteBackResult);
      setStep("idle");
      setConfirmText("");
      fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Phase 4 — Write-back (OFF par défaut)</CardTitle>
          <p className="text-sm text-[var(--fg-3)]">
            Prépare l&apos;écriture dans <code>daily_entries</code> / <code>location_entries</code>. Désactivé tant que <code>LOYVERSE_WRITE_ENABLED</code> != <code>true</code>. Le bouton ci-dessous force l&apos;écriture pour la date choisie (owner uniquement).
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--fg-2)]">Statut flag :</span>
            {loadingStatus ? (
              <Pill tone="neutral" size="sm">
                chargement…
              </Pill>
            ) : enabled ? (
              <Pill tone="good" dot size="sm">
                ON — LOYVERSE_WRITE_ENABLED=true
              </Pill>
            ) : (
              <Pill tone="bad" dot size="sm">
                OFF — désactivé
              </Pill>
            )}
            <span className="text-xs text-[var(--fg-4)]">Env Vercel • redéploiement requis pour changer le flag global</span>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--fg-3)]">Date à écrire</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-[34px] rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2 text-[13px] text-[var(--fg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              />
            </label>
            <Button variant="secondary" onClick={handleDryRun} disabled={dryRunning} size="default">
              {dryRunning ? "Prévisualisation…" : "Prévisualiser (dry-run)"}
            </Button>
            <Button variant="danger" onClick={() => setStep("confirm1")} disabled={running} size="default" className="bg-[var(--bad)] text-white hover:bg-[var(--bad)]/90">
              <AlertTriangleIcon className="size-4" />
              Activer l&apos;écriture
            </Button>
          </div>

          <p className="text-xs text-[var(--fg-4)]">
            Dry-run = lecture seule, montre ce qui serait écrit sans toucher la DB. « Activer » nécessite 2 confirmations et tape <code>ACTIVER</code>.
          </p>

          {error && <div className="rounded border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>}

          {result && (
            <div className="rounded border border-[var(--line)] bg-[var(--bg-2)] p-3">
              <p className="text-sm font-medium text-[var(--fg)]">
                Résultat {result.dryRun ? "(dry-run)" : ""} — {result.date} : {result.daily_upserted} daily upserted / {result.daily_skipped} skipped, {result.location_upserted} location upserted / {result.location_skipped} skipped
              </p>
              {result.errors.length > 0 && <p className="mt-1 text-xs text-[var(--bad)]">{result.errors.join("; ")}</p>}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-[var(--fg-3)]">Détails par store ({result.details.length})</summary>
                <ul className="mt-1 max-h-40 overflow-auto text-xs font-mono tabular-nums">
                  {result.details.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={d.action === "upserted" ? "text-[var(--good)]" : d.action === "skipped" ? "text-[var(--fg-4)]" : "text-[var(--bad)]"}>{d.action}</span>
                      <span>{d.store_id.slice(0, 8)}</span>
                      <span className="text-[var(--fg-4)]">{d.location_id ? d.location_id.slice(0, 8) : "no loc"}</span>
                      {d.error && <span className="text-[var(--bad)]">{d.error}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm 1 */}
      <Modal
        open={step === "confirm1"}
        onClose={() => setStep("idle")}
        title="Are you sure you want to enable Loyverse write-back?"
        description={`Cette action va écrire les snapshots Loyverse du ${date} dans daily_entries et location_entries. Les champs auto (ventes, paiements, TVA) seront écrasés, les champs manuels (dépenses, HR) restent. Aucun retour arrière automatique.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep("idle")}>
              Annuler
            </Button>
            <Button variant="danger" onClick={() => setStep("confirm2")}>
              Oui, continuer
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--fg-2)]">
            Tu t&apos;apprêtes à <strong>activer l&apos;écriture</strong> pour <code>{date}</code>. Vérifie dans l&apos;onglet Accounting que le diff est propre.
          </p>
          <p className="rounded bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">Phase 4 est OFF par défaut. Cette action force l&apos;écriture malgré le flag.</p>
        </div>
      </Modal>

      {/* Confirm 2 */}
      <Modal
        open={step === "confirm2"}
        onClose={() => {
          setStep("idle");
          setConfirmText("");
        }}
        title="Final confirmation — tape ACTIVER"
        description="Dernière étape : tape exactement ACTIVER pour confirmer. Cette action est irréversible pour la date sélectionnée."
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setStep("idle");
                setConfirmText("");
              }}
            >
              Annuler
            </Button>
            <Button variant="danger" onClick={handleActivate} disabled={confirmText !== "ACTIVER" || running}>
              {running ? "Écriture…" : "Confirmer ACTIVER"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--fg-2)]">
            Pour éviter un clic accidentel, tape <code className="rounded bg-[var(--bg-2)] px-1 py-0.5 font-mono text-[var(--fg)]">ACTIVER</code> ci-dessous :
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ACTIVER"
            className="h-[34px] rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--fg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            autoFocus
          />
          <p className="text-xs text-[var(--fg-4)]">Bouton actif uniquement si tu tapes exactement ACTIVER.</p>
        </div>
      </Modal>
    </div>
  );
}
