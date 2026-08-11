"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2Icon, CalendarCheckIcon, CircleDollarSignIcon, PlusIcon, ReceiptTextIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Pill } from "@/components/ui/pill";
import { toast } from "sonner";

type Tab = "companies" | "costs" | "actuals" | "adjustments" | "payroll";
interface EntityRow { id: string; name: string; is_active: boolean; }
interface AssignmentRow { id: string; location_id: string; legal_entity_id: string | null; operational_start_date: string | null; }
interface LocationRow { id: string; name: string; }
interface RuleRow { id: string; label: string; category: string; cadence: string; scope_type: string; allocation_method: string; estimated_amount: number; is_active: boolean; }
interface ActualRow { id: string; cost_rule_id: string; service_from: string; service_to: string; amount: number; }
interface AdjustmentRow { id: string; kind: string; label: string; adjustment_date: string; amount: number; }
interface PayrollOverrideRow { id: string; location_id: string; period_year: number; period_month: number; amount: number; value_status: string; }
interface SyncRow { enabled: boolean; last_run_at: string | null; }
interface ConfigData { entities: EntityRow[]; assignments: AssignmentRow[]; locations: LocationRow[]; rules: RuleRow[]; actuals: ActualRow[]; adjustments: AdjustmentRow[]; payrollOverrides: PayrollOverrideRow[]; sync: SyncRow | null; }

interface Props { open: boolean; onClose: () => void; onChanged: () => void; defaultDate: string; }

const emptyConfig: ConfigData = { entities: [], assignments: [], locations: [], rules: [], actuals: [], adjustments: [], payrollOverrides: [], sync: null };

export function DailyProfitManageDrawer({ open, onClose, onChanged, defaultDate }: Props) {
  const [tab, setTab] = useState<Tab>("companies");
  const [config, setConfig] = useState<ConfigData>(emptyConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [reason, setReason] = useState("");
  const [cost, setCost] = useState({ label: "", category: "rent", scope_type: "location", legal_entity_id: "", location_id: "", cadence: "monthly", estimated_amount: "", effective_from: `${defaultDate.slice(0, 7)}-01`, effective_to: "", allocation_method: "direct", notes: "" });
  const [customAllocations, setCustomAllocations] = useState<Record<string, string>>({});
  const [actual, setActual] = useState({ cost_rule_id: "", service_from: `${defaultDate.slice(0, 7)}-01`, service_to: defaultDate, amount: "", paid_on: "", notes: "" });
  const [adjustment, setAdjustment] = useState({ kind: "expense", category: "other", label: "", scope_type: "location", legal_entity_id: "", location_id: "", adjustment_date: defaultDate, amount: "", source_field: "", cost_rule_id: "" });
  const [payroll, setPayroll] = useState({ location_id: "", period: defaultDate.slice(0, 7), amount: "", value_status: "estimated" });

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const response = await fetch("/api/reports/daily-profit/config");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to load configuration");
      setConfig(json as ConfigData);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load configuration"); }
    finally { setLoading(false); }
  }, [open]);
  useEffect(() => { void load(); }, [load]);

  async function save(resource: string, payload: Record<string, unknown>, success: string) {
    if (!reason.trim()) { toast.error("Add a reason for this change"); return false; }
    setSaving(true);
    try {
      const response = await fetch("/api/reports/daily-profit/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, reason: reason.trim(), ...payload }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Save failed");
      toast.success(success);
      setReason("");
      await load(); onChanged(); return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); return false; }
    finally { setSaving(false); }
  }

  async function remove(resource: "cost_rule" | "adjustment" | "payroll_override", id: string) {
    const deleteReason = window.prompt("Reason for removing this finance item?")?.trim();
    if (!deleteReason) return;
    const response = await fetch("/api/reports/daily-profit/config", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, id, reason: deleteReason }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(json.error ?? "Remove failed"); return; }
    toast.success(resource === "cost_rule" ? "Cost rule disabled" : "Finance item removed");
    await load(); onChanged();
  }

  const assignmentFor = (locationId: string) => config.assignments.find((row) => row.location_id === locationId);
  const tabs: Array<{ id: Tab; label: string; icon: typeof Building2Icon }> = [
    { id: "companies", label: "Companies", icon: Building2Icon }, { id: "costs", label: "Cost rules", icon: ReceiptTextIcon },
    { id: "actuals", label: "Actuals", icon: CalendarCheckIcon }, { id: "adjustments", label: "Adjustments", icon: CircleDollarSignIcon },
    { id: "payroll", label: "Payroll", icon: UsersIcon },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="Manage Daily P&L" description="Changes stay inside the isolated finance layer. Accounting and Payments remain untouched.">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>{tabs.map(({ id, label, icon: Icon }) => <Button key={id} size="sm" variant={tab === id ? "secondary" : "quiet"} onClick={() => setTab(id)}><Icon size={13} />{label}</Button>)}</div>
        {loading ? <p style={{ color: "var(--fg-4)" }}>Loading finance configuration…</p> : (
          <>
            {tab === "companies" && <section style={sectionStyle}>
              <Heading title="Legal companies" hint="A shop belongs to one company; group reporting combines them all." />
              <div style={formRow}><Field label="New company"><input style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company legal name" /></Field><Reason value={reason} onChange={setReason} /><Button size="sm" disabled={saving || !companyName} onClick={async () => { if (await save("entity", { name: companyName }, "Company added")) setCompanyName(""); }}><PlusIcon size={13} />Add</Button></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{config.entities.map((entity) => <div key={entity.id} style={listRow}><span>{entity.name}</span><Pill tone={entity.is_active ? "good" : "neutral"} size="sm">{entity.is_active ? "active" : "inactive"}</Pill></div>)}</div>
              <Heading title="Shop assignments" hint="Operational start dates prevent false missing-data alerts before a shop opened." />
              {config.locations.map((location) => { const assignment = assignmentFor(location.id); return <div key={location.id} style={{ ...listRow, display: "grid", gridTemplateColumns: "1fr minmax(120px, 1fr) 130px auto", alignItems: "end" }}><strong>{location.name}</strong><Field label="Company"><select style={inputStyle} defaultValue={assignment?.legal_entity_id ?? ""} id={`entity-${location.id}`}><option value="">Unassigned</option>{config.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></Field><Field label="Operating since"><input style={inputStyle} type="date" defaultValue={assignment?.operational_start_date ?? ""} id={`start-${location.id}`} /></Field><Button size="sm" variant="outline" onClick={() => void save("assignment", { location_id: location.id, legal_entity_id: (document.getElementById(`entity-${location.id}`) as HTMLSelectElement).value, operational_start_date: (document.getElementById(`start-${location.id}`) as HTMLInputElement).value }, `${location.name} updated`)}>Save</Button></div>; })}
              <Heading title="Automatic mirror refresh" hint="Runs daily at 05:00 Bangkok. Keep it disabled until the preview and first manual refresh are validated." />
              <div style={listRow}><span><Pill size="sm" tone={config.sync?.enabled ? "good" : "warn"}>{config.sync?.enabled ? "enabled" : "disabled"}</Pill><span style={{ marginLeft: 8, color: "var(--fg-3)" }}>Daily finance mirror only</span></span><Button size="sm" variant="outline" onClick={() => void save("sync_config", { enabled: !config.sync?.enabled }, config.sync?.enabled ? "Automatic refresh disabled" : "Automatic refresh enabled")}>{config.sync?.enabled ? "Disable" : "Enable"}</Button></div>
            </section>}

            {tab === "costs" && <section style={sectionStyle}>
              <Heading title="Recurring and one-off costs" hint="Estimates accrue daily until an actual amount is entered." />
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
                <Field label="Label"><input style={inputStyle} value={cost.label} onChange={(e) => setCost({ ...cost, label: e.target.value })} placeholder="Laguna annual rent" /></Field>
                <Field label="Category"><input style={inputStyle} value={cost.category} onChange={(e) => setCost({ ...cost, category: e.target.value })} /></Field>
                <Field label="Scope"><select style={inputStyle} value={cost.scope_type} onChange={(e) => setCost({ ...cost, scope_type: e.target.value, allocation_method: e.target.value === "location" ? "direct" : "equal" })}><option value="group">Group</option><option value="entity">Company</option><option value="location">Shop</option></select></Field>
                {cost.scope_type === "entity" && <Field label="Company"><select style={inputStyle} value={cost.legal_entity_id} onChange={(e) => setCost({ ...cost, legal_entity_id: e.target.value })}><option value="">Select…</option>{config.entities.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>}
                {cost.scope_type === "location" && <Field label="Shop"><select style={inputStyle} value={cost.location_id} onChange={(e) => setCost({ ...cost, location_id: e.target.value })}><option value="">Select…</option>{config.locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>}
                <Field label="Cadence"><select style={inputStyle} value={cost.cadence} onChange={(e) => setCost({ ...cost, cadence: e.target.value })}><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="one_off">One-off</option><option value="custom">Custom period</option></select></Field>
                <Field label="Estimated amount (THB)"><input style={inputStyle} inputMode="decimal" value={cost.estimated_amount} onChange={(e) => setCost({ ...cost, estimated_amount: e.target.value })} /></Field>
                <Field label="From"><input style={inputStyle} type="date" value={cost.effective_from} onChange={(e) => setCost({ ...cost, effective_from: e.target.value })} /></Field>
                <Field label="To (optional)"><input style={inputStyle} type="date" value={cost.effective_to} onChange={(e) => setCost({ ...cost, effective_to: e.target.value })} /></Field>
                {cost.scope_type !== "location" && <Field label="Allocation"><select style={inputStyle} value={cost.allocation_method} onChange={(e) => setCost({ ...cost, allocation_method: e.target.value })}><option value="equal">Equal</option><option value="revenue">By revenue</option><option value="custom">Custom percentages</option></select></Field>}
              </div>
              {cost.allocation_method === "custom" && <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>{config.locations.filter((location) => cost.scope_type === "group" || assignmentFor(location.id)?.legal_entity_id === cost.legal_entity_id).map((location) => <Field key={location.id} label={`${location.name} %`}><input style={inputStyle} inputMode="decimal" value={customAllocations[location.id] ?? ""} onChange={(e) => setCustomAllocations({ ...customAllocations, [location.id]: e.target.value })} /></Field>)}</div>}
              <Field label="Notes"><textarea style={{ ...inputStyle, height: 62, paddingTop: 8 }} value={cost.notes} onChange={(e) => setCost({ ...cost, notes: e.target.value })} /></Field>
              <Reason value={reason} onChange={setReason} />
              <Button size="sm" disabled={saving || !cost.label} onClick={async () => { const allocations = Object.fromEntries(Object.entries(customAllocations).map(([id, value]) => [id, Number(value)])); if (await save("cost_rule", { ...cost, estimated_amount: Number(cost.estimated_amount), custom_allocations: allocations }, "Cost rule added")) setCost({ ...cost, label: "", estimated_amount: "", notes: "" }); }}><PlusIcon size={13} />Add cost rule</Button>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{config.rules.filter((row) => row.is_active).map((row) => <div key={row.id} style={listRow}><div><strong>{row.label}</strong><div style={muted}>{row.cadence} · {row.scope_type} · {row.allocation_method}</div></div><span className="mono">฿{Number(row.estimated_amount).toLocaleString()}</span><Button size="icon-sm" variant="danger" aria-label={`Disable ${row.label}`} onClick={() => void remove("cost_rule", row.id)}><Trash2Icon size={13} /></Button></div>)}</div>
            </section>}

            {tab === "actuals" && <section style={sectionStyle}>
              <Heading title="Replace an estimate with an actual" hint="The amount is spread across the service period and restates all affected days." />
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}><Field label="Cost rule"><select style={inputStyle} value={actual.cost_rule_id} onChange={(e) => setActual({ ...actual, cost_rule_id: e.target.value })}><option value="">Select…</option>{config.rules.filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select></Field><Field label="Amount"><input style={inputStyle} value={actual.amount} onChange={(e) => setActual({ ...actual, amount: e.target.value })} /></Field><Field label="Service from"><input style={inputStyle} type="date" value={actual.service_from} onChange={(e) => setActual({ ...actual, service_from: e.target.value })} /></Field><Field label="Service to"><input style={inputStyle} type="date" value={actual.service_to} onChange={(e) => setActual({ ...actual, service_to: e.target.value })} /></Field><Field label="Paid on (optional)"><input style={inputStyle} type="date" value={actual.paid_on} onChange={(e) => setActual({ ...actual, paid_on: e.target.value })} /></Field></div>
              <Field label="Notes"><input style={inputStyle} value={actual.notes} onChange={(e) => setActual({ ...actual, notes: e.target.value })} /></Field><Reason value={reason} onChange={setReason} /><Button size="sm" disabled={saving || !actual.cost_rule_id} onClick={() => void save("cost_actual", { ...actual, amount: Number(actual.amount) }, "Actual cost saved")}><CalendarCheckIcon size={13} />Save actual</Button>
              {config.actuals.map((row) => <div key={row.id} style={listRow}><span>{config.rules.find((rule) => rule.id === row.cost_rule_id)?.label ?? "Cost"}<span style={muted}> · {row.service_from} to {row.service_to}</span></span><strong className="mono">฿{Number(row.amount).toLocaleString()}</strong></div>)}
            </section>}

            {tab === "adjustments" && <section style={sectionStyle}>
              <Heading title="Manual adjustments and reclassification" hint="Reclassify a Sheet payment to a cost rule without changing Accounting." />
              <div style={gridStyle}><Field label="Type"><select style={inputStyle} value={adjustment.kind} onChange={(e) => setAdjustment({ ...adjustment, kind: e.target.value })}><option value="income">Income</option><option value="expense">Expense</option><option value="reclassification">Reclassification</option></select></Field><Field label="Label"><input style={inputStyle} value={adjustment.label} onChange={(e) => setAdjustment({ ...adjustment, label: e.target.value })} /></Field><Field label="Category"><input style={inputStyle} value={adjustment.category} onChange={(e) => setAdjustment({ ...adjustment, category: e.target.value })} /></Field><Field label="Date"><input style={inputStyle} type="date" value={adjustment.adjustment_date} onChange={(e) => setAdjustment({ ...adjustment, adjustment_date: e.target.value })} /></Field><Field label="Amount"><input style={inputStyle} value={adjustment.amount} onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })} /></Field><Field label="Scope"><select style={inputStyle} value={adjustment.scope_type} onChange={(e) => setAdjustment({ ...adjustment, scope_type: e.target.value })}><option value="group">Group</option><option value="entity">Company</option><option value="location">Shop</option></select></Field>{adjustment.scope_type === "location" && <Field label="Shop"><select style={inputStyle} value={adjustment.location_id} onChange={(e) => setAdjustment({ ...adjustment, location_id: e.target.value })}><option value="">Select…</option>{config.locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>}{adjustment.scope_type === "entity" && <Field label="Company"><select style={inputStyle} value={adjustment.legal_entity_id} onChange={(e) => setAdjustment({ ...adjustment, legal_entity_id: e.target.value })}><option value="">Select…</option>{config.entities.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>}{adjustment.kind === "reclassification" && <><Field label="Source column"><select style={inputStyle} value={adjustment.source_field} onChange={(e) => setAdjustment({ ...adjustment, source_field: e.target.value })}><option value="exp_other_bank">Other bank</option><option value="exp_other_cash">Other cash</option></select></Field><Field label="Linked cost rule"><select style={inputStyle} value={adjustment.cost_rule_id} onChange={(e) => setAdjustment({ ...adjustment, cost_rule_id: e.target.value })}><option value="">Select…</option>{config.rules.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select></Field></>}</div>
              <Reason value={reason} onChange={setReason} /><Button size="sm" disabled={saving || !adjustment.label} onClick={async () => { if (await save("adjustment", { ...adjustment, amount: Number(adjustment.amount) }, "Adjustment added")) setAdjustment({ ...adjustment, label: "", amount: "" }); }}><PlusIcon size={13} />Add adjustment</Button>
              {config.adjustments.map((row) => <div key={row.id} style={listRow}><span><Pill size="sm" tone={row.kind === "income" ? "good" : row.kind === "expense" ? "bad" : "info"}>{row.kind}</Pill> {row.label}<span style={muted}> · {row.adjustment_date}</span></span><strong className="mono">฿{Number(row.amount).toLocaleString()}</strong><Button size="icon-sm" variant="danger" onClick={() => void remove("adjustment", row.id)}><Trash2Icon size={13} /></Button></div>)}
            </section>}

            {tab === "payroll" && <section style={sectionStyle}>
              <Heading title="Daily P&L payroll override" hint="This replaces the Payments-derived total in Daily P&L only. Payments remains unchanged." />
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}><Field label="Shop"><select style={inputStyle} value={payroll.location_id} onChange={(e) => setPayroll({ ...payroll, location_id: e.target.value })}><option value="">Select…</option>{config.locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field><Field label="Month"><input style={inputStyle} type="month" value={payroll.period} onChange={(e) => setPayroll({ ...payroll, period: e.target.value })} /></Field><Field label="Total payroll"><input style={inputStyle} value={payroll.amount} onChange={(e) => setPayroll({ ...payroll, amount: e.target.value })} /></Field><Field label="Status"><select style={inputStyle} value={payroll.value_status} onChange={(e) => setPayroll({ ...payroll, value_status: e.target.value })}><option value="estimated">Estimated</option><option value="actual">Actual</option></select></Field></div>
              <Reason value={reason} onChange={setReason} /><Button size="sm" disabled={saving || !payroll.location_id} onClick={() => { const [year, month] = payroll.period.split("-").map(Number); void save("payroll_override", { location_id: payroll.location_id, period_year: year, period_month: month, amount: Number(payroll.amount), value_status: payroll.value_status }, "Payroll override saved"); }}><UsersIcon size={13} />Save override</Button>
              {config.payrollOverrides.map((row) => <div key={row.id} style={listRow}><span>{config.locations.find((location) => location.id === row.location_id)?.name ?? "Shop"}<span style={muted}> · {row.period_year}-{String(row.period_month).padStart(2, "0")}</span></span><Pill size="sm" tone={row.value_status === "actual" ? "good" : "warn"}>{row.value_status}</Pill><strong className="mono">฿{Number(row.amount).toLocaleString()}</strong><Button size="icon-sm" variant="danger" onClick={() => void remove("payroll_override", row.id)}><Trash2Icon size={13} /></Button></div>)}
            </section>}
          </>
        )}
      </div>
    </Drawer>
  );
}

function Heading({ title, hint }: { title: string; hint: string }) { return <div><h3 style={{ fontSize: 14, margin: 0 }}>{title}</h3><p style={{ ...muted, margin: "3px 0 0" }}>{hint}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</span>{children}</label>; }
function Reason({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <Field label="Reason (required)"><input style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Why is this being changed?" /></Field>; }
const sectionStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 };
const formRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr auto", alignItems: "end", gap: 8 };
const inputStyle: React.CSSProperties = { width: "100%", height: 32, padding: "0 9px", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--bg)", color: "var(--fg)", fontSize: 12 };
const listRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "9px 10px", fontSize: 12 };
const muted: React.CSSProperties = { fontSize: 11, color: "var(--fg-4)" };
