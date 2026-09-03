"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { PageHeader } from "@/components/ui/page-header";
import { PillButton } from "@/components/ui/pill-button";

type Location = { id: string; name: string };
type Cost = { id: string; label: string; category: string; location_id: string | null; estimated_amount: number; custom_allocations?: { amount_mode?: "fixed" | "variable"; support_type?: string | null }; is_active: boolean };
type CategoryOption = { value: string; label: string };
type EditState = { id: string; label: string; category: string; amount: string; amount_mode: "fixed" | "variable"; support_type: string | null };
type Employee = { id: string; name: string; position: string | null; base_salary_monthly: number };

const ALL_SHOPS = "all";
const NEW_CATEGORY = "__new__";
const FIELD: React.CSSProperties = { height: 38, border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", background: "var(--bg)", color: "var(--fg)", padding: "0 11px", fontSize: 13, width: "100%" };

export function RecurringCostsClient() {
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [salaries, setSalaries] = useState<Record<string, number>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "rent", support_type: "social_media", amount: "", amount_mode: "fixed" as "fixed" | "variable", customCategory: "" });
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState<Record<string, string>>({});
  const [savingSalary, setSavingSalary] = useState(false);

  const categoryLabels = useMemo(() => Object.fromEntries(categories.map((c) => [c.value, c.label])), [categories]);

  const load = useCallback(async () => {
    const isAll = locationId === ALL_SHOPS;
    const query = !locationId || isAll ? "" : `?location_id=${locationId}`;
    const response = await fetch(`/api/finance/recurring-costs${query}`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) { toast.error(json.error ?? "Unable to load recurring costs"); return; }
    setLocations(json.locations);
    setCosts(json.costs ?? []);
    setSalaries(json.salaries ?? {});
    setEmployees(json.employees ?? []);
    setCategories(json.categories ?? []);
    setCanManage(json.canManage);
    if (!locationId && json.locations?.length) {
      const requested = new URLSearchParams(window.location.search).get("shop");
      if (requested && json.locations.some((l: Location) => l.id === requested)) setLocationId(requested);
      else setLocationId(ALL_SHOPS);
    }
  }, [locationId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get("shop"); if (requested) setLocationId(requested); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (locationId === ALL_SHOPS) { toast.error("Select a shop to add a cost"); return; }
    if (!locationId) return;
    const isNew = form.category === NEW_CATEGORY;
    if (isNew && !form.customCategory.trim()) { toast.error("Enter a category name"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        location_id: locationId,
        category: isNew ? undefined : form.category,
        custom_category: isNew ? form.customCategory.trim() : undefined,
        custom_label: isNew ? form.customCategory.trim() : undefined,
        support_type: form.category === "support_workers" ? form.support_type : null,
        estimated_amount: Number(form.amount),
        amount_mode: form.amount_mode,
      };
      // When creating custom, API expects custom_category; also set category for compatibility
      if (isNew) payload.category = "__custom__";
      const response = await fetch("/api/finance/recurring-costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Unable to save cost");
      setForm({ category: "rent", support_type: "social_media", amount: "", amount_mode: "fixed", customCategory: "" }); setShowForm(false); toast.success("Monthly cost saved"); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save cost"); } finally { setSaving(false); }
  }

  function startEdit(cost: Cost) {
    if (!canManage) return;
    setShowForm(false);
    setEditing({ id: cost.id, label: cost.label, category: cost.category, amount: String(cost.estimated_amount), amount_mode: cost.custom_allocations?.amount_mode ?? "fixed", support_type: cost.custom_allocations?.support_type ?? null });
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return; setSaving(true);
    try {
      const response = await fetch(`/api/finance/recurring-costs/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estimated_amount: Number(editing.amount), custom_allocations: { amount_mode: editing.amount_mode, ...(editing.support_type ? { support_type: editing.support_type } : {}) }, reason: "Edited from the simplified recurring costs register" }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Unable to save cost");
      setEditing(null); toast.success("Monthly cost updated"); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save cost"); } finally { setSaving(false); }
  }

  function openPayroll() {
    if (locationId === ALL_SHOPS) return;
    if (!locationId) return;
    const next: Record<string, string> = {};
    for (const employee of employees) next[employee.id] = String(employee.base_salary_monthly || "");
    setSalaryDraft(next);
    setPayrollOpen(true);
  }

  async function saveSalaries() {
    setSavingSalary(true);
    try {
      for (const employee of employees) {
        const raw = salaryDraft[employee.id]?.trim() ?? "";
        const amount = raw === "" ? 0 : Number(raw);
        if (!Number.isFinite(amount) || amount < 0) throw new Error(`Invalid salary for ${employee.name}`);
        if (amount === employee.base_salary_monthly) continue;
        const response = await fetch("/api/finance/recurring-costs/employee-salary", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employee_id: employee.id, location_id: locationId, base_salary_monthly: amount, reason: "Salary edited from the recurring costs payroll" }) });
        const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Unable to save salary");
      }
      toast.success("Salaries updated"); setPayrollOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save salaries"); } finally { setSavingSalary(false); }
  }

  const payrollTotal = employees.reduce((sum, employee) => sum + (Number(salaryDraft[employee.id] ?? "") || 0), 0);
  const locationName = locations.find((location) => location.id === locationId)?.name ?? "this shop";
  const isAll = locationId === ALL_SHOPS;

  // Aggregations for All shops
  const totalCosts = useMemo(() => costs.reduce((sum, c) => sum + Number(c.estimated_amount), 0), [costs]);
  const totalPayroll = useMemo(() => Object.values(salaries).reduce((sum, v) => sum + Number(v), 0), [salaries]);
  const costsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of costs) map.set(c.category, (map.get(c.category) ?? 0) + Number(c.estimated_amount));
    return Array.from(map.entries()).map(([cat, amount]) => ({ category: cat, label: categoryLabels[cat] ?? cat, amount })).sort((a, b) => b.amount - a.amount);
  }, [costs, categoryLabels]);
  const costsByLocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of costs) if (c.location_id) map.set(c.location_id, (map.get(c.location_id) ?? 0) + Number(c.estimated_amount));
    return locations.map((loc) => ({ location: loc, amount: map.get(loc.id) ?? 0 })).sort((a, b) => b.amount - a.amount);
  }, [costs, locations]);
  const displayedCosts = isAll ? [] : costs;

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <PageHeader eyebrow="Finance" title="Recurring costs" subtitle="The few costs each shop expects every month." actions={canManage ? <Button size="sm" onClick={() => { setShowForm((value) => !value); setEditing(null); }}><PlusIcon size={14} />Add cost</Button> : null} />
    <Card style={{ gap: 8 }}><span style={{ fontSize: 12, color: "var(--fg-3)" }}>Shop</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <PillButton active={isAll} onClick={() => setLocationId(ALL_SHOPS)}>All shops</PillButton>
      {locations.map((location) => <PillButton key={location.id} active={locationId === location.id} onClick={() => setLocationId(location.id)}>{location.name}</PillButton>)}
    </div></Card>

    {showForm ? <Card><form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
      <label style={{ fontSize: 12, color: "var(--fg-3)" }}>What is it?<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} style={FIELD}>
        {categories.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        <option value={NEW_CATEGORY}>＋ New category…</option>
      </select></label>
      {form.category === NEW_CATEGORY ? <label style={{ fontSize: 12, color: "var(--fg-3)" }}>New category name<input required value={form.customCategory} onChange={(event) => setForm({ ...form, customCategory: event.target.value })} placeholder="e.g. Insurance" style={FIELD} /></label> : null}
      {form.category === "support_workers" ? <label style={{ fontSize: 12, color: "var(--fg-3)" }}>Support type<select value={form.support_type} onChange={(event) => setForm({ ...form, support_type: event.target.value })} style={FIELD}><option value="social_media">Social media</option><option value="bookings">Bookings</option><option value="social_media_and_bookings">Social media + bookings</option></select></label> : null}
      <label style={{ fontSize: 12, color: "var(--fg-3)" }}>Monthly amount (฿)<input required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} style={FIELD} /></label>
      <fieldset style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}><legend style={{ marginBottom: 7, fontSize: 12, color: "var(--fg-3)" }}>Does the amount change?</legend><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(["fixed", "variable"] as const).map((mode) => <PillButton key={mode} active={form.amount_mode === mode} onClick={() => setForm({ ...form, amount_mode: mode })}>{mode === "fixed" ? "Same each month" : "Variable each month"}</PillButton>)}
      </div><p style={{ marginTop: 7, fontSize: 11, color: "var(--fg-4)" }}>{form.amount_mode === "fixed" ? "This amount is the expected cost every month." : "This amount is a planning estimate. Monthly actual entry is not available yet."}</p></fieldset>
      {isAll ? <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--bad)" }}>Select a shop above to add a cost. All shops shows the cumul only.</p> : null}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}><Button type="submit" size="sm" disabled={saving || isAll}>{saving ? "Saving…" : "Save cost"}</Button><Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button></div>
    </form></Card> : null}

    {editing ? <Card><form onSubmit={saveEdit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
      <div style={{ fontSize: 12, color: "var(--fg-3)" }}><span style={{ display: "block", marginBottom: 6 }}>Category</span><span style={{ ...FIELD, display: "flex", alignItems: "center", background: "var(--surface-2, var(--bg))", opacity: 0.7 }}>{categoryLabels[editing.category] ?? editing.category}</span><span style={{ fontSize: 11, color: "var(--fg-4)" }}>Cannot be changed after creation</span></div>
      <div style={{ fontSize: 12, color: "var(--fg-3)" }}><span style={{ display: "block", marginBottom: 6 }}>Name</span><span style={{ ...FIELD, display: "flex", alignItems: "center", background: "var(--surface-2, var(--bg))", opacity: 0.7 }}>{editing.label}</span></div>
      <label style={{ fontSize: 12, color: "var(--fg-3)" }}>Monthly amount (฿)<input required type="number" min="0" step="0.01" value={editing.amount} onChange={(event) => setEditing({ ...editing, amount: event.target.value })} style={FIELD} /></label>
      <fieldset style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}><legend style={{ marginBottom: 7, fontSize: 12, color: "var(--fg-3)" }}>Does the amount change?</legend><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(["fixed", "variable"] as const).map((mode) => <PillButton key={mode} active={editing.amount_mode === mode} onClick={() => setEditing({ ...editing, amount_mode: mode })}>{mode === "fixed" ? "Same each month" : "Variable each month"}</PillButton>)}
      </div></fieldset>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}><Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button><Button type="button" size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button></div>
    </form></Card> : null}

    {isAll ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <Card style={{ gap: 6 }}><span style={{ fontSize: 12, color: "var(--fg-4)" }}>All shops · recurring costs</span><span className="mono" style={{ fontSize: 22 }}>฿{totalCosts.toLocaleString()}</span><span style={{ fontSize: 12, color: "var(--fg-4)" }}>{costs.length} lines across {locations.length} shops</span></Card>
          <Card style={{ gap: 6 }}><span style={{ fontSize: 12, color: "var(--fg-4)" }}>All shops · payroll</span><span className="mono" style={{ fontSize: 22 }}>฿{totalPayroll.toLocaleString()}</span><span style={{ fontSize: 12, color: "var(--fg-4)" }}>Monthly salaries (all shops)</span></Card>
          <Card style={{ gap: 6 }}><span style={{ fontSize: 12, color: "var(--fg-4)" }}>Grand total / month</span><span className="mono" style={{ fontSize: 22 }}>฿{(totalCosts + totalPayroll).toLocaleString()}</span><span style={{ fontSize: 12, color: "var(--fg-4)" }}>Costs + payroll</span></Card>
        </div>
        <Card style={{ gap: 10 }}><strong style={{ fontSize: 13 }}>By category (all shops)</strong>
          {costsByCategory.length === 0 ? <span style={{ fontSize: 12, color: "var(--fg-4)" }}>No costs yet.</span> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              {costsByCategory.map(({ category, label, amount }) => (
                <div key={category} style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--surface)" }}>
                  <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{label}</span>
                  <span className="mono" style={{ display: "block", fontSize: 16, fontWeight: 650 }}>฿{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card style={{ gap: 10 }}><strong style={{ fontSize: 13 }}>By shop (all shops)</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {costsByLocation.map(({ location, amount }) => (
              <div key={location.id} style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--surface)" }}>
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{location.name}</span>
                <span className="mono" style={{ display: "block", fontSize: 16, fontWeight: 650 }}>฿{amount.toLocaleString()}</span>
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>＋ ฿{Number(salaries[location.id] ?? 0).toLocaleString()} payroll</span>
              </div>
            ))}
          </div>
        </Card>
        {costs.length > 0 ? (
          <Card style={{ gap: 8 }}><strong style={{ fontSize: 13 }}>All lines</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {costs.map((cost) => {
                const locName = locations.find((l) => l.id === cost.location_id)?.name ?? "—";
                return <Card key={cost.id} onClick={() => startEdit(cost)} style={{ gap: 6, cursor: "pointer" }} className="hover:!border-[var(--line-strong)]"><span style={{ fontSize: 11, color: "var(--fg-4)" }}>{categoryLabels[cost.category] ?? cost.category} · {locName}</span><strong style={{ fontSize: 14 }}>{cost.label}</strong><span className="mono" style={{ fontSize: 18 }}>฿{Number(cost.estimated_amount).toLocaleString()}</span></Card>;
              })}
            </div>
          </Card>
        ) : null}
      </div>
    ) : (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <Card onClick={openPayroll} style={{ gap: 8, cursor: "pointer", transition: "border-color 150ms" }} className="hover:!border-[var(--line-strong)]"><span style={{ fontSize: 12, color: "var(--fg-4)" }}>Payroll</span><strong style={{ fontSize: 16 }}>Salary</strong><span className="mono" style={{ fontSize: 22 }}>฿{Number(salaries[locationId] ?? 0).toLocaleString()}</span><span style={{ fontSize: 12, color: "var(--fg-4)" }}>{employees.length > 0 ? `${employees.length} employee${employees.length === 1 ? "" : "s"} — click to view salaries` : "Click to view salaries"}</span></Card>
          {displayedCosts.map((cost) => <Card key={cost.id} onClick={() => startEdit(cost)} style={{ gap: 8, cursor: "pointer", transition: "border-color 150ms" }} className="hover:!border-[var(--line-strong)]"><span style={{ fontSize: 12, color: "var(--fg-4)" }}>{categoryLabels[cost.category] ?? cost.label}</span><strong style={{ fontSize: 16 }}>{cost.label}</strong><span className="mono" style={{ fontSize: 22 }}>฿{Number(cost.estimated_amount).toLocaleString()}</span><span style={{ fontSize: 12, color: "var(--fg-4)" }}>{cost.custom_allocations?.amount_mode === "variable" ? "Variable each month" : "Same each month"}</span></Card>)}
        </div>
        {displayedCosts.length === 0 ? <Card style={{ alignItems: "center", padding: 36, color: "var(--fg-4)" }}>No monthly costs for this shop yet.</Card> : null}
      </>
    )}

    <Drawer
      open={payrollOpen}
      onClose={() => setPayrollOpen(false)}
      title="Payroll"
      description={`Monthly salaries for ${locationName}.`}
      footer={<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span style={{ color: "var(--fg-3)" }}>Monthly total</span>
          <span className="mono" style={{ fontWeight: 650 }}>฿{payrollTotal.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canManage ? <Button size="sm" style={{ flex: 1 }} disabled={savingSalary} onClick={() => void saveSalaries()}>{savingSalary ? "Saving…" : "Save salaries"}</Button> : null}
          <Button size="sm" variant="secondary" style={{ flex: 1 }} onClick={() => setPayrollOpen(false)}>Close</Button>
        </div>
      </div>}
    >
      {employees.length === 0 ? <p style={{ fontSize: 13, color: "var(--fg-4)", margin: 0 }}>No active employees assigned to this shop.</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {employees.map((employee) => {
              const raw = salaryDraft[employee.id] ?? String(employee.base_salary_monthly || "");
              const changed = (raw.trim() === "" ? 0 : Number(raw)) !== employee.base_salary_monthly;
              return (
                <div key={employee.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{employee.name}</strong>
                    <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{employee.position ?? "Employee"}</span>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-3)" }}>฿<input type="number" min="0" step="100" disabled={!canManage || savingSalary} value={raw} onChange={(event) => setSalaryDraft((prev) => ({ ...prev, [employee.id]: event.target.value }))} style={{ ...FIELD, width: 130, height: 32 }} /></label>
                  {changed && <span style={{ fontSize: 10, color: "var(--bronze-2, var(--bronze))" }}>changed</span>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: 12, color: "var(--fg-4)" }}>
              <UsersIcon size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />
              {employees.length} employee{employees.length === 1 ? "" : "s"} ·{" "}
              <Link href="/employees" style={{ color: "var(--bronze-2, var(--bronze))", textDecoration: "none" }}>Manage all in Employees</Link>
            </span>
          </div>
        </div>
      )}
    </Drawer>
  </div>;
}
