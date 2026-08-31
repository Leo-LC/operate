"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { CalendarIcon, RefreshCwIcon, StoreIcon, ClockIcon, CoinsIcon } from "lucide-react";

function bangkokYesterday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);
}
function fmtTHB(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
}
function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(v);
  }
}
function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return Number.isInteger(v) && Math.abs(v) >= 100 ? fmtTHB(v) : String(v);
  return String(v);
}

function isMoneyKey(k: string): boolean {
  return /amount|total|money|cash|card|payment|revenue|sales|tax|surcharge|discount|price/i.test(k);
}

function RenderValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-[var(--fg-4)]">—</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span className="font-mono text-xs tabular-nums">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-xs text-[var(--fg-4)]">[]</span>;
    return (
      <div className="flex flex-col gap-1">
        {value.map((v, i) => (
          <div key={i} className="rounded bg-[var(--bg-2)] px-2 py-1">
            <RenderValue value={v} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (
      <div className="grid gap-1.5">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="min-w-[120px] shrink-0 font-medium text-[var(--fg-3)]">{k}</span>
            <span className="min-w-0 flex-1 text-[var(--fg-2)]">
              {typeof v === "object" && v !== null ? <RenderValue value={v} /> : <span className="font-mono tabular-nums">{isMoneyKey(k) && typeof v === "number" ? fmtTHB(v) : String(v ?? "—")}</span>}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-xs">{String(value)}</span>;
}

function ShiftCard({ shift }: { shift: Record<string, unknown> }) {
  const [open, setOpen] = React.useState(false);
  // Try to surface common Loyverse shift fields nicely, fallback to generic
  const id = (shift.id as string) ?? (shift.uuid as string) ?? "—";
  const storeId = (shift.store_id as string) ?? (shift.storeId as string) ?? null;
  const openedAt = (shift.opened_at as string) ?? (shift.created_at as string) ?? (shift.open_at as string) ?? null;
  const closedAt = (shift.closed_at as string) ?? (shift.updated_at as string) ?? null;
  const status = (shift.status as string) ?? null;
  const cashier = (shift.cashier_name as string) ?? (shift.employee_name as string) ?? (shift.closed_by as string) ?? null;
  // Money-ish fields (varies by API version)
  const moneyKeys = ["cash_sales", "card_sales", "total_sales", "total_money", "opening_cash", "closing_cash", "cash_amount", "expected_cash", "difference"];
  const hasMoney = moneyKeys.some((k) => typeof shift[k] === "number");

  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-semibold text-[var(--fg)]">{String(id).slice(0, 8)}…</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--fg-4)]">
            <ClockIcon className="size-3" />
            {fmtDateTime(openedAt)} → {fmtDateTime(closedAt)}
            {status && <Pill tone={status === "CLOSED" || status === "closed" ? "good" : "neutral"} size="sm">{status}</Pill>}
          </p>
          {(storeId || cashier) && (
            <p className="mt-1 text-[11px] text-[var(--fg-3)]">
              {storeId && <span className="font-mono">{String(storeId).slice(0, 8)}…</span>}
              {storeId && cashier && " · "}
              {cashier && <span>{cashier}</span>}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} className="shrink-0">
          {open ? "Masquer" : "Détail brut"}
        </Button>
      </div>
      {hasMoney && (
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--line)] bg-[var(--bg-2)] px-3 py-2">
          {moneyKeys
            .filter((k) => typeof shift[k] === "number")
            .map((k) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium">
                <CoinsIcon className="size-3 text-[var(--fg-4)]" />
                <span className="text-[var(--fg-3)]">{k}</span>
                <span className="font-mono tabular-nums text-[var(--fg)]">{fmtTHB(shift[k] as number)}</span>
              </span>
            ))}
        </div>
      )}
      {open && (
        <div className="border-t border-[var(--line)] px-3 py-3">
          <div className="rounded bg-[var(--bg-2)] p-3">
            <RenderValue value={shift} />
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-[var(--fg-3)]">JSON brut</summary>
            <pre className="mt-2 max-h-[320px] overflow-auto rounded bg-[var(--fg)] p-3 text-[11px] leading-relaxed text-white">{JSON.stringify(shift, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

type Row = {
  id: string;
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string;
  shifts: Record<string, unknown>[];
  shift_count: number;
  fetched_at: string;
};

export function ShiftsPreview({ initialDate }: { initialDate?: string }) {
  const [date, setDate] = React.useState<string>(() => initialDate ?? bangkokYesterday());
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchRows = React.useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loyverse/shifts?date=${d}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fetch failed");
      setRows((json.rows as Row[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRows(date);
  }, [date, fetchRows]);

  const totalShifts = rows.reduce((s, r) => s + (r.shift_count ?? r.shifts.length), 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <label className="flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--fg-3)]">
            <CalendarIcon className="size-3.5" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-[13px] font-medium text-[var(--fg)] outline-none" />
          </label>
          <Button variant="secondary" size="sm" onClick={() => fetchRows(date)} disabled={loading}>
            <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const y = bangkokYesterday();
              setDate(y);
            }}
          >
            Veille
          </Button>
          <span className="ml-auto text-xs text-[var(--fg-4)]">
            {loading ? "Chargement…" : `${rows.length} shops · ${totalShifts} shifts · ${date}`}
          </span>
        </CardContent>
      </Card>

      {error && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>}

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 w-32 rounded bg-[var(--line-2)]" />
                <div className="mt-3 h-20 rounded bg-[var(--line)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-[var(--fg-3)]">Aucun shift archivé pour {date}</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">Lance une synchro si la veille n'a pas encore été collectée (cron 22:20 ou bouton Synchroniser).</p>
            <Button
              size="sm"
              className="mt-3"
              onClick={async () => {
                setLoading(true);
                try {
                  await fetch("/api/loyverse/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dates: [date] }) });
                  await fetchRows(date);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Sync {date}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => (
            <Card key={`${row.account_key}-${row.store_id}-${row.date}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <StoreIcon className="size-4 text-[var(--bronze)]" />
                  <span className="capitalize">{row.account_key}</span>
                  <span className="font-mono text-xs font-normal text-[var(--fg-4)]">· {row.store_id.slice(0, 8)}…</span>
                  <Pill tone={row.shift_count > 0 ? "good" : "neutral"} size="sm" dot>
                    {row.shift_count} shift{row.shift_count !== 1 ? "s" : ""}
                  </Pill>
                  <span className="ml-auto text-xs font-normal text-[var(--fg-4)]">fetch {fmtDateTime(row.fetched_at)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {row.shifts.length === 0 ? (
                  <p className="rounded bg-[var(--bg-2)] px-3 py-4 text-center text-sm text-[var(--fg-4)]">Aucun shift renvoyé par Loyverse pour ce jour (jour fermé ou pas de POS ouvert).</p>
                ) : (
                  row.shifts.map((s, idx) => <ShiftCard key={(s.id as string) ?? idx} shift={s as Record<string, unknown>} />)
                )}
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-[var(--fg-3)]">Voir payload brut du jour ({row.shifts.length})</summary>
                  <pre className="mt-2 max-h-[360px] overflow-auto rounded bg-[var(--fg)] p-3 text-[11px] leading-relaxed text-white">{JSON.stringify(row.shifts, null, 2)}</pre>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-[var(--fg-4)]">Source : <code>loyverse_shifts_raw</code> — JSON brut <code>GET /shifts?store_ids=&created_at_min/max</code> (fenêtre Bangkok). Historique infini, 1 ligne/jour/shop.</p>
    </div>
  );
}
