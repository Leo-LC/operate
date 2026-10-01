// Helpers purs pour le résumé "Shift" (onglet Shift & Sales).
// Agrègent le(s) shift(s) Loyverse bruts d'un jour/store en 4 blocs :
// ventes, répartition des paiements, contrôle de caisse, mouvements de caisse.
// Ne rajoute aucune ligne : chaque valeur vient d'une clé Loyverse existante.

export type ShiftLike = Record<string, unknown>;

export function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const p = parseFloat(v.replace(/,/g, ""));
    return Number.isFinite(p) ? p : 0;
  }
  return 0;
}

export function hasKey(s: ShiftLike, k: string): boolean {
  return s[k] !== undefined && s[k] !== null;
}

/** Formate un montant avec 2 décimales, sans symbole (le « THB » est dans l'en-tête). */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export type SalesSummary = {
  gross_sales: number | null;
  discounts: number | null;
  refunds: number | null;
  net_sales: number | null;
  taxes: number | null;
  surcharge: number | null;
};

export function summarizeSales(shifts: ShiftLike[]): SalesSummary {
  let gross = 0, disc = 0, ref = 0, net = 0, tax = 0, sur = 0;
  let hasGross = false, hasDisc = false, hasRef = false, hasNet = false, hasTax = false, hasSur = false;
  for (const s of shifts) {
    if (hasKey(s, "gross_sales")) { gross += num(s["gross_sales"]); hasGross = true; }
    if (hasKey(s, "discounts")) { disc += num(s["discounts"]); hasDisc = true; }
    if (hasKey(s, "refunds")) { ref += num(s["refunds"]); hasRef = true; }
    if (hasKey(s, "net_sales")) { net += num(s["net_sales"]); hasNet = true; }
    if (hasKey(s, "surcharge")) { sur += num(s["surcharge"]); hasSur = true; }
    if (Array.isArray(s["taxes"])) {
      for (const t of s["taxes"] as Record<string, unknown>[]) {
        tax += num(t["money_amount"] ?? t["amount"] ?? t["tax_amount"]);
      }
      if ((s["taxes"] as unknown[]).length > 0) hasTax = true;
    }
  }
  return {
    gross_sales: hasGross ? gross : null,
    discounts: hasDisc ? disc : null,
    refunds: hasRef ? ref : null,
    net_sales: hasNet ? net : null,
    taxes: hasTax ? tax : null,
    surcharge: hasSur ? sur : null,
  };
}

export type PaymentLine = { id: string; label: string; amount: number };

export function summarizePayments(shifts: ShiftLike[], paymentMap: Map<string, string>): PaymentLine[] {
  const m = new Map<string, PaymentLine>();
  for (const s of shifts) {
    if (!Array.isArray(s["payments"])) continue;
    for (const p of s["payments"] as Record<string, unknown>[]) {
      const pid = String(p["payment_type_id"] ?? p["payment_type"] ?? "?");
      const label = paymentMap.get(pid) ?? String(p["payment_type"] ?? pid);
      const amt = num(p["money_amount"] ?? p["amount"]);
      const prev = m.get(pid);
      if (prev) prev.amount += amt;
      else m.set(pid, { id: pid, label, amount: amt });
    }
  }
  return Array.from(m.values()).sort((a, b) => b.amount - a.amount);
}

export type CashControl = {
  starting_cash: number | null;
  cash_payments: number | null;
  paid_in: number | null;
  paid_out: number | null;
  cash_refunds: number | null;
  expected_cash: number | null;
  actual_cash: number | null;
  difference: number | null;
};

export function summarizeCashControl(shifts: ShiftLike[]): CashControl {
  let start = 0, pay = 0, pin = 0, pout = 0, cref = 0, exp = 0, act = 0;
  let hStart = false, hPay = false, hPin = false, hPout = false, hCref = false, hExp = false, hAct = false;
  for (const s of shifts) {
    if (hasKey(s, "starting_cash")) { start += num(s["starting_cash"]); hStart = true; }
    if (hasKey(s, "cash_payments")) { pay += num(s["cash_payments"]); hPay = true; }
    if (hasKey(s, "paid_in")) { pin += num(s["paid_in"]); hPin = true; }
    if (hasKey(s, "paid_out")) { pout += num(s["paid_out"]); hPout = true; }
    if (hasKey(s, "cash_refunds")) { cref += num(s["cash_refunds"]); hCref = true; }
    if (hasKey(s, "expected_cash")) { exp += num(s["expected_cash"]); hExp = true; }
    if (hasKey(s, "actual_cash")) { act += num(s["actual_cash"]); hAct = true; }
  }
  return {
    starting_cash: hStart ? start : null,
    cash_payments: hPay ? pay : null,
    paid_in: hPin ? pin : null,
    paid_out: hPout ? pout : null,
    cash_refunds: hCref ? cref : null,
    expected_cash: hExp ? exp : null,
    actual_cash: hAct ? act : null,
    difference: hExp || hAct ? act - exp : null,
  };
}

export type CashMovementLine = { kind: "in" | "out" | "other"; label: string; reason: string; amount: number };

export function summarizeCashMovements(shifts: ShiftLike[]): CashMovementLine[] {
  const out: CashMovementLine[] = [];
  for (const s of shifts) {
    if (!Array.isArray(s["cash_movements"])) continue;
    for (const cm of s["cash_movements"] as Record<string, unknown>[]) {
      const raw = String(cm["type"] ?? "").toUpperCase();
      const kind: CashMovementLine["kind"] = raw === "PAY_IN" ? "in" : raw === "PAY_OUT" ? "out" : "other";
      out.push({
        kind,
        label: raw === "PAY_IN" ? "Entrée" : raw === "PAY_OUT" ? "Sortie" : String(cm["type"] ?? "—"),
        reason: String(cm["comment"] ?? cm["reason"] ?? "—"),
        amount: num(cm["money_amount"] ?? cm["amount"]),
      });
    }
  }
  return out;
}

/** Écart nul à 0,01 près (montants THB à 2 décimales). */
export function isZeroDiff(v: number | null): boolean {
  if (v === null) return false;
  return Math.abs(v) < 0.005;
}
