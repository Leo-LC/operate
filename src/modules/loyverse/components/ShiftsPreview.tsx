"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { PillButton } from "@/components/ui/pill-button";
import { StoreIcon, ClockIcon, TagIcon, PackageIcon, ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, ChevronDownIcon, CopyIcon, CheckIcon, TableIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { startOfMonth } from "date-fns";
import { bangkokToday, bangkokYesterday, addDays, capitalizeShop, parseDay, toDay } from "@/lib/loyverse/dates";
import { resolvePaymentBucket } from "@/modules/loyverse-sandbox/mapping-config";

function fmtTHB(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
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
function isMoneyKey(k: string): boolean {
  return /amount|total|money|cash|card|payment|revenue|sales|tax|surcharge|discount|price/i.test(k);
}
function formatSingleLabel(dateStr: string): string {
  const d = parseDay(dateStr);
  if (!d) return dateStr;
  const thisYear = new Date().getFullYear();
  return d.getFullYear() === thisYear ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const triggerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 32,
  minWidth: 150,
  padding: "0 var(--s-3)",
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  fontSize: 13,
  color: "var(--fg)",
  cursor: "pointer",
  transition: "background var(--dur) var(--ease)",
};
const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  zIndex: 50,
  width: "max-content",
  maxWidth: "min(92vw, 340px)",
  overflowX: "auto",
  borderRadius: "var(--r-lg)",
  border: "1px solid var(--line)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-2)",
  padding: "var(--s-4)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

function SingleDatePicker({ value, onChange, today }: { value: string; onChange: (v: string) => void; today: string }) {
  const base = React.useMemo(() => parseDay(today) ?? new Date(), [today]);
  const selected = parseDay(value) ?? base;
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(() => startOfMonth(selected));
  React.useEffect(() => {
    if (!open) setViewMonth(startOfMonth(parseDay(value) ?? base));
  }, [open, value, base]);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
      >
        <CalendarDaysIcon size={13} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>{formatSingleLabel(value)}</span>
        <ChevronDownIcon size={13} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ ...panelStyle, left: 0 }}>
            <div className="nexus-dp">
              <DayPicker
                mode="single"
                required
                weekStartsOn={1}
                showOutsideDays
                today={base}
                month={viewMonth}
                onMonthChange={setViewMonth}
                selected={selected}
                onSelect={(d) => {
                  if (d) {
                    onChange(toDay(d));
                    setOpen(false);
                  }
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Shift cleaning helpers ──────────────────────────
const HIDDEN_TOP_KEYS = new Set(["id", "store_id", "pos_device_id", "opened_at", "closed_at", "opened_by_employee", "closed_by_employee", "tip"]);

function cleanShift(shift: Record<string, unknown>, paymentMap: Map<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(shift)) {
    if (HIDDEN_TOP_KEYS.has(k)) continue;
    if (k === "taxes" && Array.isArray(v)) {
      const cleaned = (v as Record<string, unknown>[]).map((t) => {
        const c: Record<string, unknown> = {};
        for (const [tk, tv] of Object.entries(t)) {
          if (tk === "tax_id") continue;
          c[tk] = tv;
        }
        return c;
      });
      out[k] = cleaned;
      continue;
    }
    if (k === "cash_movements" && Array.isArray(v)) {
      const cleaned = (v as Record<string, unknown>[]).map((cm) => {
        const c: Record<string, unknown> = {};
        for (const [ck, cv] of Object.entries(cm)) {
          if (ck === "created_at" || ck === "employee_id") continue;
          c[ck] = cv;
        }
        return c;
      });
      out[k] = cleaned;
      continue;
    }
    if (k === "payments" && Array.isArray(v)) {
      const cleaned = (v as Record<string, unknown>[]).map((p) => {
        const c: Record<string, unknown> = {};
        for (const [pk, pv] of Object.entries(p)) {
          if (pk === "payment_type_id") {
            const mapped = paymentMap.get(String(pv));
            c["payment_type"] = mapped ?? String(pv);
            continue;
          }
          c[pk] = pv;
        }
        return c;
      });
      out[k] = cleaned;
      continue;
    }
    out[k] = v;
  }
  return out;
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

type ShiftRow = {
  id: string;
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string;
  shifts: Record<string, unknown>[];
  shift_count: number;
  fetched_at: string;
};
type SalesRow = {
  id: string;
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string;
  sales_by_category: { category_id: string | null; category_name: string; quantity: number; total_money: number }[];
  sales_by_item: { item_id: string | null; item_name: string; category_id: string | null; category_name: string | null; quantity: number; total_money: number }[];
  receipt_count: number;
  fetched_at: string;
};
type SnapshotRow = {
  id: string;
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string;
  sales_drinks_net: number;
  sales_ticket_net: number;
  sales_snack_net: number;
  sales_goodies_net: number;
  sales_card_surcharge: number;
  vat_7: number;
  payment_cash: number;
  payment_scan: number;
  payment_credit_card: number;
  receipt_count: number;
  fetched_at: string;
};

// ── Accounting copy-row config — same order as Google Sheets DAILY_ENTRIES ──
const TEMPLATE_COLUMNS = [
  "date",
  "sales_drinks_net",
  "sales_ticket_net",
  "sales_snack_net",
  "sales_goodies_net",
  "sales_card_surcharge",
  "sales_net_inc_vat",
  "vat_7",
  "payment_cash",
  "payment_scan",
  "payment_credit_card",
  "payment_delta",
  "exp_staff_food_cash",
  "exp_drinks_cash",
  "exp_goodies_cash",
  "exp_animals_cash",
  "exp_supply_cash",
  "exp_boss_fees_cash",
  "exp_other_cash",
  "exp_cash_total",
  "exp_makro_bank",
  "exp_other_bank",
  "exp_bank_total",
  "exp_total",
  "hr_salary_cash",
  "hr_salary_bank",
  "hr_challenge_cash",
  "hr_service_charge_cash",
  "hr_accompte_cash",
  "hr_total",
  "cash_end_day",
  "cash_to_boss",
  "cash_safe",
] as const;
const COMPUTED_COLS = new Set<string>(["sales_net_inc_vat", "payment_delta", "exp_cash_total", "exp_bank_total", "exp_total", "hr_total", "cash_end_day", "cash_safe"]);
const COLUMN_LABELS: Record<string, string> = {
  date: "date",
  sales_drinks_net: "Drinks",
  sales_ticket_net: "Ticket",
  sales_snack_net: "Snack",
  sales_goodies_net: "Goodies",
  sales_card_surcharge: "Surcharge",
  sales_net_inc_vat: "Sales total",
  vat_7: "VAT 7%",
  payment_cash: "Cash",
  payment_scan: "Scan",
  payment_credit_card: "CC",
  payment_delta: "Δ Pay",
  exp_staff_food_cash: "Staff food",
  exp_drinks_cash: "Drinks",
  exp_goodies_cash: "Goodies",
  exp_animals_cash: "Animals",
  exp_supply_cash: "Supply",
  exp_boss_fees_cash: "Boss fees",
  exp_other_cash: "Other cash",
  exp_cash_total: "Cash tot",
  exp_makro_bank: "Makro",
  exp_other_bank: "Other bank",
  exp_bank_total: "Bank tot",
  exp_total: "Exp total",
  hr_salary_cash: "Salary",
  hr_salary_bank: "Sal. bank",
  hr_challenge_cash: "Challenge",
  hr_service_charge_cash: "Svc chg",
  hr_accompte_cash: "Acompte",
  hr_total: "HR",
  cash_end_day: "EOD cash",
  cash_to_boss: "→ Boss",
  cash_safe: "Safe",
};

function SalesCategoryBlock({ rows }: { rows: SalesRow[] }) {
  const agg = React.useMemo(() => {
    const m = new Map<string, { category_name: string; quantity: number; total_money: number }>();
    for (const r of rows) for (const c of r.sales_by_category ?? []) {
      const key = c.category_id ?? c.category_name;
      const prev = m.get(key);
      if (prev) { prev.quantity += c.quantity; prev.total_money += c.total_money; } else m.set(key, { category_name: c.category_name, quantity: c.quantity, total_money: c.total_money });
    }
    return Array.from(m.values()).sort((a, b) => b.total_money - a.total_money);
  }, [rows]);
  if (agg.length === 0) return <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Aucune vente par catégorie.</p>;
  return (
    <div className="overflow-hidden rounded border border-[var(--line)]">
      <table className="w-full text-xs">
        <thead className="bg-[var(--bg-2)] text-[11px] uppercase tracking-wide text-[var(--fg-4)]">
          <tr><th className="px-2 py-1.5 text-left">Catégorie</th><th className="px-2 py-1.5 text-right">Qté</th><th className="px-2 py-1.5 text-right">Total</th></tr>
        </thead>
        <tbody>
          {agg.map((c) => (
            <tr key={c.category_name} className="border-t border-[var(--line)]">
              <td className="px-2 py-1.5 font-medium">{c.category_name}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{c.quantity}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtTHB(c.total_money)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function SalesItemBlock({ rows }: { rows: SalesRow[] }) {
  const agg = React.useMemo(() => {
    const m = new Map<string, { item_name: string; category_name: string | null; quantity: number; total_money: number }>();
    for (const r of rows) for (const it of r.sales_by_item ?? []) {
      const key = it.item_id ?? it.item_name;
      const prev = m.get(key);
      if (prev) { prev.quantity += it.quantity; prev.total_money += it.total_money; } else m.set(key, { item_name: it.item_name, category_name: it.category_name, quantity: it.quantity, total_money: it.total_money });
    }
    return Array.from(m.values()).sort((a, b) => b.total_money - a.total_money);
  }, [rows]);
  if (agg.length === 0) return <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Aucune vente par article.</p>;
  return (
    <div className="overflow-hidden rounded border border-[var(--line)]">
      <table className="w-full text-xs">
        <thead className="bg-[var(--bg-2)] text-[11px] uppercase tracking-wide text-[var(--fg-4)]">
          <tr><th className="px-2 py-1.5 text-left">Article</th><th className="px-2 py-1.5 text-left">Cat.</th><th className="px-2 py-1.5 text-right">Qté</th><th className="px-2 py-1.5 text-right">Total</th></tr>
        </thead>
        <tbody>
          {agg.map((it) => (
            <tr key={it.item_name} className="border-t border-[var(--line)]">
              <td className="px-2 py-1.5 font-medium">{it.item_name}</td>
              <td className="px-2 py-1.5 text-[11px] text-[var(--fg-4)]">{it.category_name ?? "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{it.quantity}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtTHB(it.total_money)}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }: { title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left text-xs font-semibold text-[var(--fg-3)] hover:bg-[var(--bg-2)]"
      >
        {icon}
        <span className="flex-1">{title}</span>
        <ChevronDownIcon className={`size-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && children}
    </div>
  );
}

// ── Accounting copy helpers ───────────────────────
function n(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const p = parseFloat(v.replace(/,/g, "")); return Number.isFinite(p) ? p : 0; }
  return 0;
}
function formatCopyNumber(v: number): string {
  // raw number, no thousands sep, dot decimal — matches parseNumeric() in import-sheets/lib.ts
  if (!Number.isFinite(v) || v === 0) return v === 0 ? "0" : "";
  // keep 2 decimals if needed but strip trailing zeros
  const s = String(v);
  // ensure we don't produce exponential notation for large ints
  return s;
}
function buildAccountingValues(
  shift: Record<string, unknown> | null,
  snapshot: SnapshotRow | null,
  date: string,
  paymentMap: Map<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of TEMPLATE_COLUMNS) out[c] = "";
  out["date"] = date;

  if (!shift && !snapshot) return out;

  // Sales — prefer snapshot (correct bucket mapping), fallback 0
  if (snapshot) {
    out["sales_drinks_net"] = formatCopyNumber(n(snapshot.sales_drinks_net));
    out["sales_ticket_net"] = formatCopyNumber(n(snapshot.sales_ticket_net));
    out["sales_snack_net"] = formatCopyNumber(n(snapshot.sales_snack_net));
    out["sales_goodies_net"] = formatCopyNumber(n(snapshot.sales_goodies_net));
    // surcharge: prefer shift.surcharge, fallback snapshot
    const shiftSurcharge = shift ? n((shift as Record<string, unknown>)["surcharge"]) : 0;
    const val = shiftSurcharge !== 0 ? shiftSurcharge : n(snapshot.sales_card_surcharge);
    out["sales_card_surcharge"] = formatCopyNumber(val);
  } else if (shift) {
    // No snapshot — try shift net_sales as fallback? Leave sales_* empty since shift has no breakdown
    const s = n((shift as Record<string, unknown>)["surcharge"]);
    if (s) out["sales_card_surcharge"] = formatCopyNumber(s);
  }

  // VAT — sum of shift.taxes[].money_amount, fallback snapshot vat_7
  if (shift && Array.isArray(shift["taxes"])) {
    const sum = (shift["taxes"] as Record<string, unknown>[]).reduce((acc, t) => acc + n(t["money_amount"] ?? t["amount"] ?? t["tax_amount"]), 0);
    if (sum !== 0 || (shift["taxes"] as unknown[]).length > 0) out["vat_7"] = formatCopyNumber(sum);
    else if (snapshot) out["vat_7"] = formatCopyNumber(n(snapshot.vat_7));
  } else if (snapshot) {
    out["vat_7"] = formatCopyNumber(n(snapshot.vat_7));
  }

  // Payments — from shift.payments bucketed, fallback snapshot
  if (shift && Array.isArray(shift["payments"]) && (shift["payments"] as unknown[]).length > 0) {
    const buckets: Record<string, number> = { cash: 0, scan: 0, credit_card: 0 };
    for (const p of shift["payments"] as Record<string, unknown>[]) {
      const pid = String(p["payment_type_id"] ?? "");
      const name = paymentMap.get(pid) ?? pid;
      const type = p["type"] as string | undefined;
      const bucket = resolvePaymentBucket(type ?? null, name ?? null);
      const amt = n(p["money_amount"]);
      if (bucket === "cash") buckets.cash += amt;
      else if (bucket === "scan") buckets.scan += amt;
      else if (bucket === "credit_card") buckets.credit_card += amt;
    }
    out["payment_cash"] = formatCopyNumber(buckets.cash);
    out["payment_scan"] = formatCopyNumber(buckets.scan);
    out["payment_credit_card"] = formatCopyNumber(buckets.credit_card);
  } else if (snapshot) {
    out["payment_cash"] = formatCopyNumber(n(snapshot.payment_cash));
    out["payment_scan"] = formatCopyNumber(n(snapshot.payment_scan));
    out["payment_credit_card"] = formatCopyNumber(n(snapshot.payment_credit_card));
  }

  // computed + manual expense/HR/treasury stay "" (sheet formulas / manual input)
  COMPUTED_COLS.forEach((c) => { out[c] = ""; });
  // explicit empties for manual groups (already "")
  return out;
}

function AccountingCopySection({
  shiftRows,
  snapshotRows,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  salesRows: _salesRows,
  date,
  paymentMap,
}: {
  shiftRows: ShiftRow[];
  snapshotRows: SnapshotRow[];
  salesRows: SalesRow[];
  date: string;
  paymentMap: Map<string, string>;
}) {
  const [copied, setCopied] = React.useState(false);
  const snapshot = snapshotRows[0] ?? null;
  // single shift per day assumption — take first
  const rawShift = shiftRows[0]?.shifts?.[0] as Record<string, unknown> | undefined ?? null;

  const values = React.useMemo(() => buildAccountingValues(rawShift, snapshot, date, paymentMap), [rawShift, snapshot, date, paymentMap]);
  const hasAnyData = Boolean(rawShift || snapshot);

  const handleCopy = async () => {
    const line = TEMPLATE_COLUMNS.map((c) => values[c] ?? "").join("\t");
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: create textarea
      const ta = document.createElement("textarea");
      ta.value = line;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  if (!hasAnyData) {
    return (
      <div className="rounded border border-dashed border-[var(--line)] bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">
        Pas de shift/snapshot pour générer la ligne comptable. Synchronise le jour d&apos;abord.
      </div>
    );
  }

  const sourceLabel = rawShift ? "shift brut" : snapshot ? "snapshot (ventes Loyverse)" : "—";
  const salesMissing = !snapshot && !rawShift;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleCopy} className="gap-1.5">
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          {copied ? "Copié !" : "Copier la ligne"}
        </Button>
        <span className="text-xs text-[var(--fg-4)]">
          TSV prêt à coller dans Google Sheets · source: <span className="font-medium text-[var(--fg-3)]">{sourceLabel}</span> · {TEMPLATE_COLUMNS.length} colonnes · vides = calculs Sheets
        </span>
        {salesMissing && <Pill tone="warn" size="sm">ventes non mappées</Pill>}
      </div>
      <div className="overflow-auto rounded border border-[var(--line)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--bg-2)] text-[10px] uppercase tracking-wide text-[var(--fg-4)]">
              {TEMPLATE_COLUMNS.map((c) => (
                <th key={c} className={`whitespace-nowrap px-2 py-1.5 text-left font-medium ${COMPUTED_COLS.has(c) ? "bg-[var(--line-2)] text-[var(--fg-4)]" : ""}`} title={c}>
                  {COLUMN_LABELS[c] ?? c}
                  {COMPUTED_COLS.has(c) ? " *" : ""}
                </th>
              ))}
            </tr>
            <tr className="bg-[var(--bg-2)] text-[9px] text-[var(--fg-4)]">
              {TEMPLATE_COLUMNS.map((c) => (
                <th key={`${c}-key`} className="whitespace-nowrap px-2 pb-1 pt-0 text-left font-mono font-normal normal-case tracking-normal">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[var(--line)] bg-[var(--surface)]">
              {TEMPLATE_COLUMNS.map((c) => {
                const v = values[c];
                const isComputed = COMPUTED_COLS.has(c);
                const isEmpty = v === "";
                return (
                  <td
                    key={c}
                    className={`whitespace-nowrap px-2 py-1.5 font-mono tabular-nums ${isComputed ? "bg-[var(--bg-2)] text-[var(--fg-4)]" : isEmpty ? "text-[var(--fg-4)]" : "text-[var(--fg)] font-medium"}`}
                  >
                    {isEmpty ? "—" : c === "date" ? v : v}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--fg-4)]">
        <span className="font-medium">Colonnes *</span> vides = formules Sheets. Colle la ligne avec <kbd className="rounded border border-[var(--line)] bg-[var(--bg-2)] px-1 py-0.5 font-mono text-[10px]">Ctrl+V</kbd> dans la ligne du jour. Ordre: <code className="font-mono text-[10px]">{TEMPLATE_COLUMNS.join(", ")}</code>. Ajuste si l&apos;ordre réel diffère.
      </p>
    </div>
  );
}

export function ShiftsPreview({ initialDate }: { initialDate?: string }) {
  const [date, setDate] = React.useState<string>(() => initialDate ?? bangkokYesterday());
  const [selectedStore, setSelectedStore] = React.useState<string | null>(null);
  const [shops, setShops] = React.useState<{ store_id: string; account_key: string; location_id: string | null }[]>([]);
  const [shiftRows, setShiftRows] = React.useState<ShiftRow[]>([]);
  const [salesRows, setSalesRows] = React.useState<SalesRow[]>([]);
  const [snapshotRows, setSnapshotRows] = React.useState<SnapshotRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentMap, setPaymentMap] = React.useState<Map<string, string>>(new Map());

  React.useEffect(() => {
    let cancelled = false;
    async function loadShops() {
      try {
        const [dashRes, statusRes] = await Promise.all([
          fetch(`/api/loyverse/dashboard?days=30&date=${bangkokToday()}`, { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/loyverse/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ]);
        const perStore = (dashRes?.per_store as { store_id: string; account_key: string; location_id: string | null }[] | undefined) ?? [];
        const map = new Map<string, { store_id: string; account_key: string; location_id: string | null }>();
        for (const s of perStore) map.set(s.store_id, { store_id: s.store_id, account_key: s.account_key, location_id: s.location_id });
        if (map.size === 0 && statusRes?.accounts) {
          for (const a of statusRes.accounts as { key: string; label: string }[]) {
            if (!map.has(a.key)) map.set(a.key, { store_id: a.key, account_key: a.key, location_id: null });
          }
        }
        const list = Array.from(map.values()).sort((a, b) => a.account_key.localeCompare(b.account_key));
        if (!cancelled) {
          setShops(list);
          if (list.length > 0 && !selectedStore) setSelectedStore(list[0].store_id);
        }
      } catch {}
    }
    loadShops();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/loyverse/payment-types", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const m = new Map<string, string>();
        for (const pt of (j.payment_types as { id: string; name?: string; type?: string }[]) ?? []) {
          const label = pt.name ?? pt.type ?? pt.id;
          // Normalize to bucket-like label: keep original name but lowercase for display
          m.set(pt.id, label);
        }
        setPaymentMap(m);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const fetchAll = React.useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loyverse/day?date=${d}`, { cache: "no-store" }).then((x) => x.json());
      if (res.error) throw new Error(res.error);
      setShiftRows((res.shifts as ShiftRow[]) ?? []);
      setSalesRows((res.sales as SalesRow[]) ?? []);
      setSnapshotRows((res.snapshots as SnapshotRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchAll(date); }, [date, fetchAll]);

  const todayStr = bangkokToday();
  const shiftForStore = React.useMemo(() => shiftRows.filter((r) => r.store_id === selectedStore), [shiftRows, selectedStore]);
  const salesForStore = React.useMemo(() => salesRows.filter((r) => r.store_id === selectedStore), [salesRows, selectedStore]);
  const snapshotForStore = React.useMemo(() => snapshotRows.filter((r) => r.store_id === selectedStore), [snapshotRows, selectedStore]);
  const hasShift = shiftForStore.length > 0;
  const hasSales = salesForStore.length > 0;
  const isArchived = hasShift && hasSales;
  const selectedShop = shops.find((s) => s.store_id === selectedStore) ?? null;
  const totalShifts = shiftForStore.reduce((s, r) => s + (r.shift_count ?? r.shifts.length), 0);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/loyverse/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dates: [date] }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Sync failed");
      await fetchAll(date);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card style={{ overflow: "visible" }}>
        <CardContent className="flex flex-col gap-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDate((d) => addDays(d, -1))} className="px-2">
              <ChevronLeftIcon className="size-4" />
            </Button>
            <SingleDatePicker value={date} onChange={setDate} today={todayStr} />
            <Button variant="secondary" size="sm" onClick={() => setDate((d) => addDays(d, 1))} disabled={date >= todayStr} className="px-2">
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fetchAll(date)} disabled={loading}>
              Recharger
            </Button>
            <Button size="sm" onClick={handleSync} disabled={syncing || loading}>
              {syncing ? "Synchronisation…" : isArchived ? "Synchroniser" : "Synchroniser Loyverse"}
            </Button>
            <span className="ml-auto flex items-center gap-2 text-xs">
              {isArchived ? <Pill tone="good" size="sm" dot>Archivé</Pill> : date === todayStr ? <Pill tone="neutral" size="sm" dot>Ouvert</Pill> : <Pill tone="warn" size="sm" dot>À synchroniser</Pill>}
              <span className="hidden text-[var(--fg-4)] sm:inline">{selectedShop ? capitalizeShop(selectedShop.account_key) : "—"} · {date}</span>
            </span>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-3">
            <span className="text-xs font-medium text-[var(--fg-4)]">Shop</span>
            <div className="flex flex-wrap gap-1.5">
              {shops.length === 0 ? (
                <span className="text-xs text-[var(--fg-4)]">Chargement shops…</span>
              ) : (
                shops.map((shop) => (
                  <PillButton key={shop.store_id} active={selectedStore === shop.store_id} onClick={() => setSelectedStore(shop.store_id)} style={{ textTransform: "capitalize" }}>
                    {capitalizeShop(shop.account_key)}
                  </PillButton>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>}

      {!selectedStore ? (
        <Card><CardContent className="py-10 text-center text-sm text-[var(--fg-4)]">Sélectionne un shop ci-dessus.</CardContent></Card>
      ) : loading ? (
        <Card className="animate-pulse"><CardContent className="py-6"><div className="h-4 w-32 rounded bg-[var(--line-2)]" /><div className="mt-3 h-20 rounded bg-[var(--line)]" /></CardContent></Card>
      ) : !hasShift && !hasSales ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-[var(--fg-3)]">Aucune donnée archivée pour {selectedShop ? capitalizeShop(selectedShop.account_key) : selectedStore} le {date}</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">Ce jour est sauvegardé dès la première synchro (shift + ventes) et reste accessible même à J+60.</p>
            <Button size="sm" className="mt-3" onClick={handleSync} disabled={syncing}>{syncing ? "…" : `Synchroniser ${date}`}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              <StoreIcon className="size-4 text-[var(--bronze)]" />
              <span className="capitalize">{selectedShop ? capitalizeShop(selectedShop.account_key) : shiftForStore[0]?.account_key ?? salesForStore[0]?.account_key ?? "—"}</span>
              <span className="font-mono text-xs font-normal text-[var(--fg-4)]">· {selectedStore.slice(0, 8)}… · {date}</span>
              <Pill tone={totalShifts ? "good" : "neutral"} size="sm" dot>{totalShifts} shifts</Pill>
              <span className="ml-auto text-xs font-normal text-[var(--fg-4)]">fetch {fmtDateTime(shiftForStore[0]?.fetched_at ?? salesForStore[0]?.fetched_at ?? null)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <CollapsibleSection title="Shift — détail brut" icon={<ClockIcon className="size-3.5" />} defaultOpen>
              {shiftForStore.length === 0 ? (
                <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Pas de shift Loyverse pour ce jour.</p>
              ) : (
                shiftForStore.flatMap((r) =>
                  r.shifts.length === 0
                    ? [<p key={r.date} className="rounded bg-[var(--bg-2)] px-2 py-2 text-xs text-[var(--fg-4)]">Aucun shift ce jour.</p>]
                    : r.shifts.map((s, idx) => {
                        const cleaned = cleanShift(s as Record<string, unknown>, paymentMap);
                        return (
                          <div key={(s.id as string) ?? `${r.date}-${idx}`} className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] p-3">
                            <RenderValue value={cleaned} />
                          </div>
                        );
                      }),
                )
              )}
            </CollapsibleSection>
            <CollapsibleSection title="Comptabilité — ligne à copier" icon={<TableIcon className="size-3.5" />} defaultOpen>
              <AccountingCopySection
                shiftRows={shiftForStore}
                snapshotRows={snapshotForStore}
                salesRows={salesForStore}
                date={date}
                paymentMap={paymentMap}
              />
            </CollapsibleSection>
            <CollapsibleSection title="Sales by category" icon={<TagIcon className="size-3.5" />} defaultOpen>
              <SalesCategoryBlock rows={salesForStore} />
            </CollapsibleSection>
            <CollapsibleSection title="Sales by item" icon={<PackageIcon className="size-3.5" />} defaultOpen>
              <SalesItemBlock rows={salesForStore} />
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}
      <ChallengesPreviewCard month={date.slice(0, 7)} />
    </div>
  );
}

function ChallengesPreviewCard({ month }: { month: string }) {
  const [rows, setRows] = React.useState<
    { location_id: string; location_name: string; period: number; proposed_entry_count: number; proposed_snacks_sold: number; existing_entry_count: number | null; existing_snacks_sold: number | null; unmapped?: boolean }[]
  >([]);
  const [unmapped, setUnmapped] = React.useState<typeof rows>([]);
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const refresh = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/loyverse/challenges-preview?month=${month}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setRows((j.preview as typeof rows) ?? []);
        setUnmapped((j.unmapped as typeof rows) ?? []);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [month]);
  React.useEffect(() => {
    const cleanup = refresh();
    return cleanup;
  }, [refresh]);
  const handleFill = async (force: boolean) => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/loyverse/challenges-write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, dryRun: false, force }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Write failed");
      setResult(`${j.location_upserted} périodes remplies, ${j.location_skipped} déjà OK, ${j.location_exists_overwritten ?? 0} existantes ignorées (force=false)`);
      await new Promise((r) => setTimeout(r, 300));
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TagIcon className="size-4 text-[var(--bronze)]" /> Challenges — pré-remplissage {month}
          <span className="ml-auto text-xs font-normal text-[var(--fg-4)]">entrées = TICKETS · snacks = SNACKS (Samui A ENTRY inclus)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => handleFill(false)} disabled={syncing || loading}>
            {syncing ? "Remplissage…" : "Remplir Challenges"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleFill(true)} disabled={syncing || loading}>
            Forcer (écrase)
          </Button>
          <span className="text-xs text-[var(--fg-4)]">n&apos;écrase pas les saisies existantes sauf Forcer — CRON quotidien 05:30 (Bangkok) le fera auto</span>
          {result && <span className="ml-auto text-xs font-medium text-[var(--good)]">{result}</span>}
        </div>
        <p className="text-xs text-[var(--fg-4)]">Compare ce que donnerait Loyverse (tickets/snacks du mois) vs ce qui est déjà saisi dans <code>location_entries</code>.</p>
        {loading ? (
          <div className="h-20 animate-pulse rounded bg-[var(--line-2)]" />
        ) : error ? (
          <div className="rounded bg-[var(--bad-soft)] px-3 py-2 text-xs text-[var(--bad)]">{error}</div>
        ) : rows.length === 0 ? (
          <p className="rounded bg-[var(--bg-2)] px-3 py-6 text-center text-xs text-[var(--fg-4)]">Aucune donnée Loyverse pour {month}.</p>
        ) : (
          <>
            <div className="overflow-auto rounded border border-[var(--line)]">
              <table className="w-full text-xs">
                <thead className="bg-[var(--bg-2)] text-[11px] uppercase tracking-wide text-[var(--fg-4)]">
                  <tr><th className="px-2 py-1.5 text-left">Shop / Période</th><th className="px-2 py-1.5 text-right">Entrées (Loyverse)</th><th className="px-2 py-1.5 text-right">Entrées (actuel)</th><th className="px-2 py-1.5 text-right">Snacks (Loyverse)</th><th className="px-2 py-1.5 text-right">Snacks (actuel)</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const ecDiff = r.existing_entry_count !== null && r.proposed_entry_count !== r.existing_entry_count;
                    const ssDiff = r.existing_snacks_sold !== null && r.proposed_snacks_sold !== r.existing_snacks_sold;
                    return (
                      <tr key={`${r.location_id}-${r.period}`} className="border-t border-[var(--line)]">
                        <td className="px-2 py-1.5 font-medium">{r.location_name} · P{r.period}</td>
                        <td className={`px-2 py-1.5 text-right font-mono tabular-nums ${ecDiff ? "bg-[var(--warn-soft)]" : ""}`}>{r.proposed_entry_count}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--fg-4)]">{r.existing_entry_count ?? "—"}</td>
                        <td className={`px-2 py-1.5 text-right font-mono tabular-nums ${ssDiff ? "bg-[var(--warn-soft)]" : ""}`}>{r.proposed_snacks_sold}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--fg-4)]">{r.existing_snacks_sold ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {unmapped.length > 0 && (
              <div className="rounded border border-[var(--warn)] bg-[var(--warn-soft)] px-3 py-2">
                <p className="text-xs font-semibold text-[var(--warn)]">Shops non mappés détectés — Silom probablement ici :</p>
                <div className="mt-1 overflow-auto rounded border border-[var(--line)] bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-2)] text-[11px] uppercase tracking-wide text-[var(--fg-4)]">
                      <tr><th className="px-2 py-1 text-left">Store Loyverse</th><th className="px-2 py-1 text-right">P</th><th className="px-2 py-1 text-right">Entrées</th><th className="px-2 py-1 text-right">Snacks</th></tr>
                    </thead>
                    <tbody>
                      {unmapped.map((r) => (
                        <tr key={`${r.location_id}-${r.period}`} className="border-t border-[var(--line)]">
                          <td className="px-2 py-1 font-mono text-[11px]">{r.location_name}</td>
                          <td className="px-2 py-1 text-right">{r.period}</td>
                          <td className="px-2 py-1 text-right font-mono">{r.proposed_entry_count}</td>
                          <td className="px-2 py-1 text-right font-mono">{r.proposed_snacks_sold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-[11px] text-[var(--fg-4)]">Ajoute le <code>loyverse_store_id</code> dans <code>locations</code> pour ce shop (via Admin → Locations ou SQL) puis resync.</p>
              </div>
            )}
          </>
        )}
        <p className="text-[11px] text-[var(--fg-4)]">Jaune = écart avec la saisie actuelle. Pour l&apos;instant on n&apos;écrit rien — dis-moi si les chiffres te semblent bons et je branche le remplissage auto.</p>
      </CardContent>
    </Card>
  );
}
