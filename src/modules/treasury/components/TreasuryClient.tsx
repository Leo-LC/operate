"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BankAccount {
  id: string;
  location_id: string | null;
  account_name: string;
  declared_balance: number | null;
  last_verified_at: string | null;
  reliability: "low" | "medium" | "high";
  notes: string | null;
}

interface Reserve {
  id: string;
  category: string;
  priority: "critical" | "high" | "medium" | "special";
  label: string;
  amount_required: number;
  amount_reserved: number;
  due_date: string | null;
  is_recurring: boolean;
  notes: string | null;
  month: string | null;
}

interface CashPosition {
  id: string;
  location_id: string;
  cash_on_hand: number | null;
  expected_transfer: number | null;
  last_count_date: string | null;
  notes: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface TreasuryData {
  bankAccounts: BankAccount[];
  reserves: Reserve[];
  cashPositions: CashPosition[];
  locations: Location[];
}

// ── Formatting ────────────────────────────────────────────────────────────────

function thb(n: number | null | undefined): string {
  if (n == null) return "—";
  return "฿" + Math.round(n).toLocaleString("en");
}

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

// ── Reliability badge ─────────────────────────────────────────────────────────

function ReliabilityBadge({ r }: { r: BankAccount["reliability"] }) {
  const cfg = {
    high:   { color: "var(--good)", label: "High" },
    medium: { color: "var(--warn)", label: "Medium" },
    low:    { color: "var(--bad)",  label: "Low" },
  }[r];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────

function PriorityBadge({ p }: { p: Reserve["priority"] }) {
  const cfg = {
    critical: { color: "var(--bad)",    bg: "var(--bad-soft)",  label: "Critical" },
    high:     { color: "var(--warn)",   bg: "var(--warn-soft)", label: "High" },
    medium:   { color: "var(--info)",   bg: "var(--info-soft)", label: "Medium" },
    special:  { color: "var(--bronze)", bg: "var(--bronze-soft)", label: "Special" },
  }[p];
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
      padding: "2px 6px", borderRadius: "var(--r-pill)",
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)",
      }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Cash Position Form ────────────────────────────────────────────────────────

function CashPositionRow({
  loc,
  pos,
  onSave,
}: {
  loc: Location;
  pos: CashPosition | undefined;
  onSave: (p: Partial<CashPosition> & { location_id: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [cashOnHand, setCashOnHand] = useState(String(pos?.cash_on_hand ?? ""));
  const [expectedTransfer, setExpectedTransfer] = useState(String(pos?.expected_transfer ?? ""));
  const [lastCount, setLastCount] = useState(pos?.last_count_date ?? "");
  const [saving, setSaving] = useState(false);

  const shortName = loc.name.replace(/^Capybara Coffee\s*/i, "").trim() || loc.name;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        location_id: loc.id,
        cash_on_hand: cashOnHand !== "" ? Number(cashOnHand) : undefined,
        expected_transfer: expectedTransfer !== "" ? Number(expectedTransfer) : undefined,
        last_count_date: lastCount || undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{shortName}</p>
          {!editing && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--fg-4)" }}>
              Cash: {thb(pos?.cash_on_hand)} · Transfer: {thb(pos?.expected_transfer)}
              {pos?.last_count_date ? ` · Last count: ${pos.last_count_date}` : ""}
            </p>
          )}
        </div>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </div>
      {editing && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginTop: 10, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-4)", display: "block", marginBottom: 2 }}>Cash on hand</label>
            <input
              type="number"
              value={cashOnHand}
              onChange={(e) => setCashOnHand(e.target.value)}
              placeholder="฿0"
              style={{ width: "100%", height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--bg-2)", color: "var(--fg)", outline: "none" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-4)", display: "block", marginBottom: 2 }}>Expected transfer</label>
            <input
              type="number"
              value={expectedTransfer}
              onChange={(e) => setExpectedTransfer(e.target.value)}
              placeholder="฿0"
              style={{ width: "100%", height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--bg-2)", color: "var(--fg)", outline: "none" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-4)", display: "block", marginBottom: 2 }}>Last count date</label>
            <input
              type="date"
              value={lastCount}
              onChange={(e) => setLastCount(e.target.value)}
              style={{ width: "100%", height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--bg-2)", color: "var(--fg)", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reserve Form ──────────────────────────────────────────────────────────────

function AddReserveForm({ onAdd }: { onAdd: (r: Partial<Reserve>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("salary");
  const [priority, setPriority] = useState<Reserve["priority"]>("high");
  const [amountRequired, setAmountRequired] = useState("");
  const [amountReserved, setAmountReserved] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!label || !amountRequired) return;
    setSaving(true);
    try {
      await onAdd({ label, category, priority, amount_required: Number(amountRequired), amount_reserved: Number(amountReserved) || 0, due_date: dueDate || undefined });
      setLabel(""); setAmountRequired(""); setAmountReserved(""); setDueDate("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return (
    <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>+ Add reserve</Button>
  );

  return (
    <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--fg-4)", display: "block", marginBottom: 2 }}>Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. June salaries"
            style={{ width: "100%", height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--bg-2)", color: "var(--fg)", outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--fg-4)", display: "block", marginBottom: 2 }}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            style={{ width: "100%", height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", padding: "0 6px", fontSize: 12, background: "var(--bg-2)", color: "var(--fg)", outline: "none" }}>
            {["salary","rent","taxes","supplier","animals","utilities","maintenance","marketing","owner_withdrawal","emergency"].map((c) => (
              <option key={c} value={c}>{c.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--fg-4)", display: "block", marginBottom: 2 }}>Required (฿)</label>
          <input type="number" value={amountRequired} onChange={(e) => setAmountRequired(e.target.value)} placeholder="0"
            style={{ width: "100%", height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--bg-2)", color: "var(--fg)", outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--fg-4)", display: "block", marginBottom: 2 }}>Reserved (฿)</label>
          <input type="number" value={amountReserved} onChange={(e) => setAmountReserved(e.target.value)} placeholder="0"
            style={{ width: "100%", height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--bg-2)", color: "var(--fg)", outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--fg-4)", display: "block", marginBottom: 2 }}>Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            style={{ width: "100%", height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--bg-2)", color: "var(--fg)", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving || !label || !amountRequired}>
            {saving ? "…" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TreasuryClient() {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/treasury");
      if (res.ok) setData(await res.json() as TreasuryData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveCashPosition(pos: Partial<CashPosition> & { location_id: string }) {
    const res = await fetch("/api/treasury/cash-positions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pos),
    });
    if (!res.ok) { toast.error("Save failed"); return; }
    toast.success("Cash position saved");
    await load();
  }

  async function addReserve(r: Partial<Reserve>) {
    const res = await fetch("/api/treasury/reserves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    });
    if (!res.ok) { toast.error("Save failed"); return; }
    toast.success("Reserve added");
    await load();
  }

  async function updateReserve(id: string, fields: Partial<Reserve>) {
    const res = await fetch("/api/treasury/reserves", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    if (!res.ok) { toast.error("Save failed"); return; }
    await load();
  }

  async function deleteReserve(id: string) {
    await fetch("/api/treasury/reserves", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  // ── Computed totals ─────────────────────────────────────────────────────────

  const totalCash = (data?.cashPositions ?? []).reduce((s, p) => s + (p.cash_on_hand ?? 0), 0);
  const totalExpectedTransfer = (data?.cashPositions ?? []).reduce((s, p) => s + (p.expected_transfer ?? 0), 0);
  const totalBank = (data?.bankAccounts ?? []).reduce((s, a) => s + (a.declared_balance ?? 0), 0);
  const totalVisible = totalCash + totalExpectedTransfer + totalBank;
  const totalReserved = (data?.reserves ?? []).reduce((s, r) => s + r.amount_required, 0);
  const totalReservedSoFar = (data?.reserves ?? []).reduce((s, r) => s + r.amount_reserved, 0);
  const freeCash = totalVisible - totalReserved;

  const statusColor = freeCash < 0 ? "var(--bad)" : freeCash < totalReserved * 0.2 ? "var(--warn)" : "var(--good)";
  const statusLabel = freeCash < 0 ? "Critical" : freeCash < totalReserved * 0.2 ? "Watch" : "OK";

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0", color: "var(--fg-4)", fontSize: 14 }}>Loading…</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      <PageHeader
        eyebrow="Finance"
        title="Treasury"
        subtitle="Cash position, bank accounts, and reserve obligations."
      />

      {/* Top summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Cash in shops",        value: totalCash,             color: "var(--fg)" },
          { label: "Bank balance declared", value: totalBank,             color: "var(--fg)" },
          { label: "Reserved obligations",  value: totalReserved,         color: "var(--warn)" },
          { label: "Free cash",             value: freeCash,              color: statusColor },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)",
            padding: "var(--s-5)",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-4)" }}>{label}</p>
            <p className="mono tabular-nums" style={{ margin: 0, fontSize: 22, fontWeight: 700, color }}>{thb(value)}</p>
          </div>
        ))}
      </div>

      {/* Free cash formula */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
        borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface-2)",
        fontSize: 13, color: "var(--fg-3)", flexWrap: "wrap",
      }}>
        <span className="mono tabular-nums">{thb(totalCash)} cash</span>
        <span>+</span>
        <span className="mono tabular-nums">{thb(totalBank)} bank</span>
        <span>+</span>
        <span className="mono tabular-nums">{thb(totalExpectedTransfer)} transfers</span>
        <span>−</span>
        <span className="mono tabular-nums">{thb(totalReserved)} reserves</span>
        <span>=</span>
        <span className="mono tabular-nums" style={{ fontWeight: 700, color: statusColor }}>{thb(freeCash)} free cash</span>
        <span style={{
          marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "2px 8px",
          borderRadius: "var(--r-pill)", background: statusColor, color: "#fff",
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Cash by shop */}
      {data && data.locations.length > 0 && (
        <Section title="Cash by shop">
          {data.locations.map((loc) => (
            <CashPositionRow
              key={loc.id}
              loc={loc}
              pos={data.cashPositions.find((p) => p.location_id === loc.id)}
              onSave={saveCashPosition}
            />
          ))}
        </Section>
      )}

      {/* Bank accounts */}
      <Section title="Bank accounts" action={
        <Button size="sm" variant="secondary" onClick={() => {
          const name = window.prompt("Account name:");
          if (!name) return;
          const balance = window.prompt("Declared balance (฿):");
          if (balance == null) return;
          void fetch("/api/treasury/bank-accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account_name: name, declared_balance: Number(balance) || null }),
          }).then(() => load());
        }}>
          + Add account
        </Button>
      }>
        {(data?.bankAccounts ?? []).length === 0 ? (
          <div style={{ padding: "24px 20px", fontSize: 13, color: "var(--fg-4)" }}>
            No bank accounts added yet. Add your first account above.
          </div>
        ) : (
          data?.bankAccounts.map((acc) => (
            <div key={acc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{acc.account_name}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--fg-4)" }}>
                  Balance: <span className="mono tabular-nums">{thb(acc.declared_balance)}</span>
                  {acc.last_verified_at ? ` · Verified: ${acc.last_verified_at}` : " · Not verified"}
                  {" · Reliability: "}<ReliabilityBadge r={acc.reliability} />
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => {
                if (!window.confirm(`Delete "${acc.account_name}"?`)) return;
                void fetch("/api/treasury/bank-accounts", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: acc.id }),
                }).then(() => load());
              }}>
                Delete
              </Button>
            </div>
          ))
        )}
      </Section>

      {/* Reserves tracker */}
      <Section title="Reserve tracker">
        {(data?.reserves ?? []).length === 0 ? (
          <div style={{ padding: "24px 20px", fontSize: 13, color: "var(--fg-4)" }}>
            No reserves added yet.
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto",
              padding: "8px 20px", background: "var(--surface-2)",
              fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)",
            }}>
              <span>Obligation</span>
              <span style={{ textAlign: "right" }}>Required</span>
              <span style={{ textAlign: "right" }}>Reserved</span>
              <span style={{ textAlign: "right" }}>% complete</span>
            </div>
            {data?.reserves.map((r) => {
              const completePct = r.amount_required > 0 ? (r.amount_reserved / r.amount_required) * 100 : 100;
              const barColor = completePct >= 80 ? "var(--good)" : completePct >= 50 ? "var(--warn)" : "var(--bad)";
              return (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "center", padding: "10px 20px", borderTop: "1px solid var(--line)", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <PriorityBadge p={r.priority} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{r.label}</span>
                    </div>
                    {r.due_date && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--fg-4)" }}>Due {r.due_date}</p>}
                  </div>
                  <span className="mono tabular-nums" style={{ textAlign: "right", fontSize: 13, color: "var(--fg-2)" }}>{thb(r.amount_required)}</span>
                  <div>
                    <input
                      type="number"
                      defaultValue={r.amount_reserved}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val !== r.amount_reserved) void updateReserve(r.id, { amount_reserved: val });
                      }}
                      style={{ width: "100%", height: 28, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", padding: "0 6px", fontSize: 13, background: "var(--bg-2)", color: "var(--fg)", outline: "none", textAlign: "right" }}
                    />
                    <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
                      <div style={{ width: `${Math.min(100, completePct)}%`, height: "100%", background: barColor, borderRadius: 2, transition: "width 0.3s ease" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <span className="mono tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: barColor }}>{pct(completePct)}</span>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (window.confirm(`Delete "${r.label}"?`)) void deleteReserve(r.id);
                    }}>×</Button>
                  </div>
                </div>
              );
            })}
            {/* Totals */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto",
              padding: "10px 20px", borderTop: "2px solid var(--line)",
              background: "var(--surface-2)", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Total</span>
              <span className="mono tabular-nums" style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{thb(totalReserved)}</span>
              <span className="mono tabular-nums" style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--good)" }}>{thb(totalReservedSoFar)}</span>
              <span className="mono tabular-nums" style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: totalReserved > 0 ? (totalReservedSoFar / totalReserved >= 0.8 ? "var(--good)" : "var(--warn)") : "var(--good)" }}>
                {totalReserved > 0 ? pct((totalReservedSoFar / totalReserved) * 100) : "—"}
              </span>
            </div>
          </>
        )}
        <AddReserveForm onAdd={addReserve} />
      </Section>
    </div>
  );
}
