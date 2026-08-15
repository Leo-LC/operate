"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2Icon, ExternalLinkIcon } from "lucide-react";
import type { AdminLocation } from "@/modules/admin/types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent",
  utilities: "Utilities",
  marketing: "Marketing",
  support_workers: "Support workers",
  other: "Accounting",
};

type RecurringCost = {
  id: string;
  label: string;
  category: string;
  estimated_amount: number;
  custom_allocations?: { amount_mode?: "fixed" | "variable"; support_type?: string | null } | null;
  is_active: boolean;
};

interface Props {
  locationId: string;
  locations: AdminLocation[];
}

function fmt(n: number) {
  return n === 0 ? "" : n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function MonthlyFixedExpensesTable({ locationId, locations }: Props) {
  const [costs, setCosts] = useState<RecurringCost[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchCosts = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/fixed-expenses?location_id=${locationId}`);
      if (!res.ok) return;
      const json = await res.json() as { costs: RecurringCost[]; canManage: boolean };
      setCosts(json.costs);
      setCanManage(json.canManage);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { void fetchCosts(); }, [fetchCosts]);

  async function commitEdit(cost: RecurringCost) {
    if (!editing) return;
    const { value } = editing;
    setEditing(null);
    const numVal = parseFloat(value) || 0;
    setSavingId(cost.id);
    try {
      const res = await fetch(`/api/finance/recurring-costs/${cost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimated_amount: numVal,
          reason: "Edited from accounting Fixed Costs",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Save failed");
        return;
      }
      toast.success(`"${cost.label}" updated`);
      await fetchCosts();
    } finally {
      setSavingId(null);
    }
  }

  const locationName = locations.find((l) => l.id === locationId)?.name ?? "";
  const perMonthTotals = MONTH_NAMES.map(() => costs.reduce((s, c) => s + Number(c.estimated_amount || 0), 0));
  const annualTotal = perMonthTotals.reduce((s, v) => s + v, 0);

  const cell = (cost: RecurringCost, value: number, key: string): React.ReactNode => {
    const isEditing = editing?.id === cost.id;
    const isSaving = savingId === cost.id;

    if (isEditing && canManage) {
      return (
        <td key={key} className="mono tabular-nums" style={{ padding: 0, height: 34, textAlign: "right", fontSize: 12, borderRight: "1px solid var(--line)", position: "relative", minWidth: "4.5rem" }}>
          <span aria-hidden="true" style={{ visibility: "hidden", display: "inline-block", padding: "0 8px" }}>{fmt(value)}</span>
          <input
            type="number"
            step="0.01"
            autoFocus
            value={editing.value}
            onChange={(e) => setEditing({ id: cost.id, value: e.target.value })}
            onBlur={() => void commitEdit(cost)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); void commitEdit(cost); }
              if (e.key === "Escape") setEditing(null);
            }}
            style={{
              position: "absolute", inset: 0,
              paddingInline: 8, height: "100%", width: "100%",
              border: "1px solid var(--focus-ring)",
              background: "var(--surface)",
              fontSize: 12, textAlign: "right", outline: "none",
            }}
          />
        </td>
      );
    }

    return (
      <td
        key={key}
        className="mono tabular-nums"
        style={{
          padding: "0 8px",
          height: 34,
          textAlign: "right",
          fontSize: 12,
          cursor: canManage ? "pointer" : "default",
          borderRight: "1px solid var(--line)",
          minWidth: "4.5rem",
          color: "var(--fg)",
          userSelect: "none",
          transition: "background var(--dur) var(--ease)",
        }}
        onClick={() => {
          if (!canManage || isSaving) return;
          setEditing({ id: cost.id, value: value === 0 ? "" : String(value) });
        }}
        title={canManage ? "Edit recurring cost — updates Finance → Recurring costs too" : undefined}
      >
        {isSaving ? <Loader2Icon style={{ width: 11, height: 11, verticalAlign: "middle" }} className="animate-spin" /> : fmt(value)}
      </td>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Source banner */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", padding: "var(--s-3) var(--s-4)", borderRadius: "var(--r-md)", border: "1px solid var(--info)", background: "var(--info-soft)", fontSize: 12, color: "var(--fg-2)" }}>
        <span>
          These are your <strong>recurring costs</strong> from{" "}
          <a href="/finance/recurring-costs" style={{ color: "var(--info)", fontWeight: 600, textDecoration: "none" }}>
            Finance → Recurring costs
            <ExternalLinkIcon style={{ width: 11, height: 11, marginLeft: 4, verticalAlign: "-1px" }} />
          </a>
          {" "}for <strong>{locationName}</strong>. The same amount is applied to every month.{" "}
          {canManage
            ? "Edit a value here — it updates the recurring costs module too."
            : "Owner access is required to edit values."}
        </span>
      </div>

      {/* Table */}
      <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflowX: "auto" }}>
        <table className="text-xs border-collapse" style={{ tableLayout: "auto" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line)", background: "var(--bg-2)" }}>
              <th className="sticky left-0 z-10 whitespace-nowrap" style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--fg-4)", borderRight: "1px solid var(--line)", width: "14rem", minWidth: "14rem", background: "var(--bg-2)" }}>
                Recurring cost
              </th>
              {MONTH_NAMES.map((m) => (
                <th key={m} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 500, color: "var(--fg-4)", borderRight: "1px solid var(--line)", minWidth: "4.5rem", whiteSpace: "nowrap" }}>
                  {m}
                </th>
              ))}
              <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--bronze-2, var(--bronze))", borderRight: "1px solid var(--line)", minWidth: "5rem", fontStyle: "italic", background: "var(--bronze-soft)" }}>
                Year total
              </th>
            </tr>
          </thead>
          <tbody>
            {costs.map((cost) => {
              const value = Number(cost.estimated_amount || 0);
              const catLabel = CATEGORY_LABELS[cost.category] ?? cost.category;
              return (
                <tr key={cost.id} style={{ borderBottom: "1px solid var(--line)", transition: "background var(--dur) var(--ease)" }}>
                  <td className="sticky left-0 z-10 whitespace-nowrap" style={{ padding: "8px 12px", borderRight: "1px solid var(--line)", width: "14rem", minWidth: "14rem", background: "var(--surface)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fg)" }}>{cost.label}</span>
                      <span style={{ fontSize: 10, color: "var(--fg-4)", background: "var(--bg-2)", borderRadius: "var(--r-pill)", padding: "2px 8px", border: "1px solid var(--line)" }}>
                        {catLabel}
                      </span>
                    </div>
                  </td>
                  {MONTH_NAMES.map((m) => cell(cost, value, m))}
                  <td className="mono tabular-nums" style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--bronze-2, var(--bronze))", fontStyle: "italic", borderRight: "1px solid var(--line)", background: "var(--bronze-soft)" }}>
                    {fmt(value * 12)}
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr style={{ borderTop: "2px solid var(--line)", background: "var(--bronze-soft)" }}>
              <td className="sticky left-0 z-10" style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--bronze)", borderRight: "1px solid var(--line)", background: "var(--bronze-soft)" }}>
                Monthly total
              </td>
              {perMonthTotals.map((t, i) => (
                <td key={i} className="mono tabular-nums" style={{ padding: "8px 8px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--fg)", borderRight: "1px solid var(--line)" }}>
                  {fmt(t)}
                </td>
              ))}
              <td className="mono tabular-nums" style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--bronze)", fontStyle: "italic", borderRight: "1px solid var(--line)", background: "var(--bg-2)" }}>
                {fmt(annualTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {loading && (
          <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "var(--fg-4)" }}>Loading…</div>
        )}
        {!loading && costs.length === 0 && (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)", marginBottom: 4 }}>No recurring costs for {locationName}</p>
            <p style={{ fontSize: 12, color: "var(--fg-4)" }}>
              Add them in{" "}
              <a href="/finance/recurring-costs" style={{ color: "var(--bronze)", fontWeight: 600, textDecoration: "none" }}>
                Finance → Recurring costs
              </a>
              {" "}— they will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}