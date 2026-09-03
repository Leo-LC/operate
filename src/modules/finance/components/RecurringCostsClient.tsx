"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon, SaveIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { PageHeader } from "@/components/ui/page-header";
import { PillButton } from "@/components/ui/pill-button";
import { MonthSelector } from "@/modules/challenges/components/MonthSelector";
import { calcPayroll } from "@/modules/finance/lib/hr";

type Location = { id: string; name: string };
type Cost = { id: string; label: string; category: string; location_id: string | null; estimated_amount: number; custom_allocations?: { amount_mode?: "fixed" | "variable"; support_type?: string | null }; is_active: boolean };
type CategoryOption = { value: string; label: string };
type EditState = { id: string; label: string; category: string; amount: string; amount_mode: "fixed" | "variable"; support_type: string | null };
type Employee = { id: string; name: string; position: string | null; base_salary_monthly: number };
type Snapshot = {
  id: string;
  location_id: string;
  period_year: number;
  period_month: number;
  recurring_costs_amount: number;
  payroll_amount: number;
  service_charge_rate_pct: number;
  employee_count: number;
  service_charge_amount: number;
  challenge_bonus_amount: number;
  status: string;
  reason?: string;
};
type Preview = {
  location_id: string;
  location_name: string;
  period_year: number;
  period_month: number;
  recurring_costs_amount: number;
  payroll_amount: number;
  service_charge_rate_pct: number;
  employee_count: number;
  service_charge_amount: number;
  challenge_bonus_amount: number;
};

const ALL_SHOPS = "all";
const NEW_CATEGORY = "__new__";
const FIELD: React.CSSProperties = { height: 38, border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", background: "var(--bg)", color: "var(--fg)", padding: "0 11px", fontSize: 13, width: "100%" };

function bangkokMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "09";
  return `${y}-${m}`;
}

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
  const [editCustomCategory, setEditCustomCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState<Record<string, string>>({});
  const [savingSalary, setSavingSalary] = useState(false);

  // Month / snapshot state
  const [selectedMonth, setSelectedMonth] = useState<string>(() => bangkokMonth());
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [preview, setPreview] = useState<Preview[]>([]);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotEdit, setSnapshotEdit] = useState<Record<string, string>>({});

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

  // Load snapshots for selected month
  const loadSnapshots = useCallback(async () => {
    if (!selectedMonth) return;
    const [y, m] = selectedMonth.split("-").map(Number);
    if (!y || !m) return;
    const q = new URLSearchParams({ year: String(y), month: String(m), preview: "1" });
    // For snapshot preview we want all locations unless filtered? Use no location filter to get all
    const res = await fetch(`/api/finance/monthly-snapshots?${q}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) return;
    setSnapshots(json.snapshots ?? []);
    setPreview(json.preview ?? []);
  }, [selectedMonth]);

  useEffect(() => { void loadSnapshots(); }, [loadSnapshots]);

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
      if (isNew) payload.category = "__custom__";
      const response = await fetch("/api/finance/recurring-costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Unable to save cost");
      setForm({ category: "rent", support_type: "social_media", amount: "", amount_mode: "fixed", customCategory: "" }); setShowForm(false); toast.success("Monthly cost saved"); await load(); await loadSnapshots();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save cost"); } finally { setSaving(false); }
  }

  function startEdit(cost: Cost) {
    if (!canManage) return;
    setShowForm(false);
    setEditing({ id: cost.id, label: cost.label, category: cost.category, amount: String(cost.estimated_amount), amount_mode: cost.custom_allocations?.amount_mode ?? "fixed", support_type: cost.custom_allocations?.support_type ?? null });
    setEditCustomCategory("");
    setConfirmDeleteId(null);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    const isNewCat = editing.category === NEW_CATEGORY;
    if (isNewCat && !editCustomCategory.trim()) { toast.error("Enter a category name"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        estimated_amount: Number(editing.amount),
        custom_allocations: { amount_mode: editing.amount_mode, ...(editing.support_type ? { support_type: editing.support_type } : {}) },
        reason: "Edited from the simplified recurring costs register",
      };
      if (isNewCat) {
        payload.custom_category = editCustomCategory.trim();
        payload.custom_label = editCustomCategory.trim();
        payload.label = editing.label.trim() || editCustomCategory.trim();
      } else {
        payload.category = editing.category;
        payload.label = editing.label.trim();
      }
      const response = await fetch(`/api/finance/recurring-costs/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Unable to save cost");
      setEditing(null); setEditCustomCategory(""); toast.success("Monthly cost updated"); await load(); await loadSnapshots();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save cost"); } finally { setSaving(false); }
  }

  async function deleteCost(id: string) {
    setDeleting(true);
    try {
      const response = await fetch(`/api/finance/recurring-costs/${id}?reason=${encodeURIComponent("Deleted from recurring costs register")}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string }).error ?? "Unable to delete");
      toast.success("Cost deleted");
      setEditing(null); setConfirmDeleteId(null);
      await load(); await loadSnapshots();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete"); } finally { setDeleting(false); }
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
      toast.success("Salaries updated"); setPayrollOpen(false); await load(); await loadSnapshots();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save salaries"); } finally { setSavingSalary(false); }
  }

  // Snapshot helpers
  const snapshotMap = useMemo(() => new Map(snapshots.map((s) => [s.location_id, s])), [snapshots]);
  const previewMap = useMemo(() => new Map(preview.map((p) => [p.location_id, p])), [preview]);

  function getDisplayForLocation(locId: string): (Snapshot | Preview) & { isSnapshot: boolean } | null {
    const snap = snapshotMap.get(locId);
    if (snap) return { ...snap, isSnapshot: true } as unknown as (Snapshot & { isSnapshot: boolean });
    const pre = previewMap.get(locId);
    if (pre) return { ...(pre as unknown as Preview), id: `preview-${locId}`, status: "estimated", isSnapshot: false } as unknown as (Preview & { isSnapshot: boolean, id: string, status: string });
    return null;
  }

  const monthTotals = useMemo(() => {
    const ids = locationId === ALL_SHOPS ? locations.map((l) => l.id) : locationId ? [locationId] : [];
    let recurring = 0, salaries = 0, service = 0, bonus = 0;
    for (const id of ids) {
      const d = getDisplayForLocation(id);
      if (!d) continue;
      recurring += Number((d as unknown as { recurring_costs_amount: number }).recurring_costs_amount ?? 0);
      salaries += Number((d as unknown as { payroll_amount: number }).payroll_amount ?? 0);
      service += Number((d as unknown as { service_charge_amount: number }).service_charge_amount ?? 0);
      bonus += Number((d as unknown as { challenge_bonus_amount: number }).challenge_bonus_amount ?? 0);
    }
    const payroll = calcPayroll(salaries, service, bonus);
    return { recurring, salaries, service, bonus, payroll, grand: recurring + payroll };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots, preview, locationId, locations]);

  const hasSnapshotForSelected = useMemo(() => {
    if (locationId === ALL_SHOPS) return snapshots.length > 0;
    return snapshotMap.has(locationId);
  }, [snapshots, locationId, snapshotMap]);

  async function saveSnapshot() {
    const [y, m] = selectedMonth.split("-").map(Number);
    if (!y || !m) { toast.error("Invalid month"); return; }
    setSavingSnapshot(true);
    try {
      const targets = locationId === ALL_SHOPS ? locations.map((l) => l.id) : [locationId];
      for (const locId of targets) {
        const display = getDisplayForLocation(locId);
        if (!display) continue;
        // If already a snapshot, skip unless editing
        if ((display as unknown as { isSnapshot: boolean }).isSnapshot) continue;
        const payload = {
          location_id: locId,
          period_year: y,
          period_month: m,
          recurring_costs_amount: Number((display as unknown as { recurring_costs_amount: number }).recurring_costs_amount ?? 0),
          payroll_amount: Number((display as unknown as { payroll_amount: number }).payroll_amount ?? 0),
          service_charge_rate_pct: Number((display as unknown as { service_charge_rate_pct: number }).service_charge_rate_pct ?? 0),
          employee_count: Number((display as unknown as { employee_count: number }).employee_count ?? 0),
          service_charge_amount: Number((display as unknown as { service_charge_amount: number }).service_charge_amount ?? 0),
          challenge_bonus_amount: Number((display as unknown as { challenge_bonus_amount: number }).challenge_bonus_amount ?? 0),
          reason: `Snapshot for ${selectedMonth} saved from recurring costs`,
          status: "actual",
        };
        const res = await fetch("/api/finance/monthly-snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Unable to save snapshot");
      }
      toast.success(hasSnapshotForSelected ? "Snapshot updated" : "Snapshot saved");
      await loadSnapshots();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to save snapshot"); } finally { setSavingSnapshot(false); }
  }

  async function saveSnapshotEdit() {
    const [y, m] = selectedMonth.split("-").map(Number);
    if (!locationId || locationId === ALL_SHOPS) { toast.error("Select a shop to edit"); return; }
    const snap = snapshotMap.get(locationId);
    if (!snap) { toast.error("No snapshot to edit"); return; }
    setSavingSnapshot(true);
    try {
      const payload = {
        location_id: locationId,
        period_year: y,
        period_month: m,
        recurring_costs_amount: Number(snapshotEdit.recurring ?? snap.recurring_costs_amount),
        payroll_amount: Number(snapshotEdit.payroll ?? snap.payroll_amount),
        service_charge_amount: Number(snapshotEdit.service_charge ?? snap.service_charge_amount),
        challenge_bonus_amount: Number(snapshotEdit.bonus ?? snap.challenge_bonus_amount),
        service_charge_rate_pct: Number(snapshotEdit.rate ?? snap.service_charge_rate_pct),
        employee_count: Number(snapshotEdit.employees ?? snap.employee_count),
        reason: "Manual adjustment from recurring costs snapshot",
        status: snap.status,
      };
      const res = await fetch("/api/finance/monthly-snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to update");
      toast.success("Snapshot updated");
      setSnapshotEdit({});
      await loadSnapshots();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to update"); } finally { setSavingSnapshot(false); }
  }

  const payrollTotal = employees.reduce((sum, employee) => sum + (Number(salaryDraft[employee.id] ?? "") || 0), 0);
  const locationName = locations.find((location) => location.id === locationId)?.name ?? "this shop";
  const isAll = locationId === ALL_SHOPS;

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

  const selectedDisplay = locationId !== ALL_SHOPS ? getDisplayForLocation(locationId) : null;

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <PageHeader eyebrow="Finance" title="Recurring costs" subtitle="The few costs each shop expects every month." actions={canManage ? <Button size="sm" onClick={() => { setShowForm((value) => !value); setEditing(null); }}><PlusIcon size={14} />Add cost</Button> : null} />
    <Card style={{ gap: 8 }}><span style={{ fontSize: 12, color: "var(--fg-3)" }}>Shop</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <PillButton active={isAll} onClick={() => setLocationId(ALL_SHOPS)}>All shops</PillButton>
      {locations.map((location) => <PillButton key={location.id} active={locationId === location.id} onClick={() => setLocationId(location.id)}>{location.name}</PillButton>)}
    </div></Card>

    {/* Month selector + snapshot summary — styled like challenges */}
    <Card style={{ gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          {(() => {
            const isPast = selectedMonth < bangkokMonth();
            if (hasSnapshotForSelected) return <span style={{ padding: "3px 8px", borderRadius: 999, background: "var(--good-soft, #e6f4ea)", color: "var(--good)", fontSize: 11, fontWeight: 600, border: "1px solid var(--good)" }}>● Snapshot figé</span>;
            if (isPast) return <span style={{ padding: "3px 8px", borderRadius: 999, background: "var(--warn-soft, #fef3c7)", color: "var(--warn, #d97706)", fontSize: 11, fontWeight: 600, border: "1px solid var(--warn)" }}>Mois clos — à figer</span>;
            return <span style={{ padding: "3px 8px", borderRadius: 999, background: "var(--bg-2)", color: "var(--fg-4)", fontSize: 11, border: "1px solid var(--line)" }}>Mois en cours — estimation</span>;
          })()}
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {(() => {
              const isPast = selectedMonth < bangkokMonth();
              if (!hasSnapshotForSelected && isPast) {
                return <Button size="sm" disabled={savingSnapshot} onClick={() => void saveSnapshot()}><SaveIcon size={14} />{savingSnapshot ? "Saving…" : `Figer ${selectedMonth} pour le P&L`}</Button>;
              }
              if (!hasSnapshotForSelected && !isPast) {
                return <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Prévisualisation live — figé à la clôture</span>;
              }
              if (hasSnapshotForSelected && isAll) {
                return <span style={{ fontSize: 11, color: "var(--fg-4)", alignSelf: "center" }}>Snapshots par shop — ajustables individuellement</span>;
              }
              if (hasSnapshotForSelected && !isAll) {
                return <Button size="sm" variant="secondary" disabled={savingSnapshot} onClick={() => {
                  const snap = snapshotMap.get(locationId);
                  if (!snap) return;
                  setSnapshotEdit({
                    recurring: String(snap.recurring_costs_amount),
                    payroll: String(snap.payroll_amount),
                    service_charge: String(snap.service_charge_amount),
                    bonus: String(snap.challenge_bonus_amount),
                    rate: String(snap.service_charge_rate_pct),
                    employees: String(snap.employee_count),
                  });
                }}>Ajuster</Button>;
              }
              return null;
            })()}
          </div>
        )}
      </div>

      {/* Totals for selected month — Salaries vs Payroll distinction */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 10 }}>
        <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--surface)" }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Recurring costs ({selectedMonth})</span>
          <span className="mono" style={{ display: "block", fontSize: 16, fontWeight: 650 }}>฿{monthTotals.recurring.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{isAll ? `${locations.length} shops` : locationName}</span>
        </div>
        <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--surface)" }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Salaries ({selectedMonth})</span>
          <span className="mono" style={{ display: "block", fontSize: 16, fontWeight: 650 }}>฿{monthTotals.salaries.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Base salaries</span>
        </div>
        <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--surface)" }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Service Charge ({selectedMonth})</span>
          <span className="mono" style={{ display: "block", fontSize: 16, fontWeight: 650 }}>฿{monthTotals.service.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Revenue × rate × staff</span>
        </div>
        <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--surface)" }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Bonus ({selectedMonth})</span>
          <span className="mono" style={{ display: "block", fontSize: 16, fontWeight: 650 }}>฿{monthTotals.bonus.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Challenge gated</span>
        </div>
        <div style={{ padding: "10px 12px", border: "1px solid var(--bronze)", borderRadius: "var(--r-md)", background: "var(--bronze-soft, #fdf6e3)" }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Payroll ({selectedMonth})</span>
          <span className="mono" style={{ display: "block", fontSize: 16, fontWeight: 700 }}>฿{monthTotals.payroll.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Salaries + Service + Bonus</span>
        </div>
        <div style={{ padding: "10px 12px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-md)", background: "var(--bg)" }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Grand total ({selectedMonth})</span>
          <span className="mono" style={{ display: "block", fontSize: 16, fontWeight: 700 }}>฿{monthTotals.grand.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Recurring + Payroll → P&L</span>
        </div>
      </div>

      {/* Per-location snapshot edit when single shop and snapshot exists */}
      {!isAll && selectedDisplay && (selectedDisplay as unknown as { isSnapshot: boolean }).isSnapshot && Object.keys(snapshotEdit).length > 0 && (
        <Card style={{ gap: 10, background: "var(--bg-2)" }}>
          <strong style={{ fontSize: 12 }}>Ajuster le snapshot {selectedMonth} · {locationName}</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            <label style={{ fontSize: 11, color: "var(--fg-3)" }}>Recurring<input value={snapshotEdit.recurring ?? ""} onChange={(e) => setSnapshotEdit((s) => ({ ...s, recurring: e.target.value }))} style={{ ...FIELD, height: 32 }} type="number" /></label>
            <label style={{ fontSize: 11, color: "var(--fg-3)" }}>Salaries (base)<input value={snapshotEdit.payroll ?? ""} onChange={(e) => setSnapshotEdit((s) => ({ ...s, payroll: e.target.value }))} style={{ ...FIELD, height: 32 }} type="number" /></label>
            <label style={{ fontSize: 11, color: "var(--fg-3)" }}>Service Charge<input value={snapshotEdit.service_charge ?? ""} onChange={(e) => setSnapshotEdit((s) => ({ ...s, service_charge: e.target.value }))} style={{ ...FIELD, height: 32 }} type="number" /></label>
            <label style={{ fontSize: 11, color: "var(--fg-3)" }}>Bonus<input value={snapshotEdit.bonus ?? ""} onChange={(e) => setSnapshotEdit((s) => ({ ...s, bonus: e.target.value }))} style={{ ...FIELD, height: 32 }} type="number" /></label>
            <label style={{ fontSize: 11, color: "var(--fg-3)" }}>SC rate %<input value={snapshotEdit.rate ?? ""} onChange={(e) => setSnapshotEdit((s) => ({ ...s, rate: e.target.value }))} style={{ ...FIELD, height: 32 }} type="number" step="0.1" /></label>
            <label style={{ fontSize: 11, color: "var(--fg-3)" }}>Employees<input value={snapshotEdit.employees ?? ""} onChange={(e) => setSnapshotEdit((s) => ({ ...s, employees: e.target.value }))} style={{ ...FIELD, height: 32 }} type="number" /></label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" disabled={savingSnapshot} onClick={() => void saveSnapshotEdit()}>{savingSnapshot ? "Saving…" : "Save adjustments"}</Button>
            <Button size="sm" variant="secondary" onClick={() => setSnapshotEdit({})}>Cancel</Button>
          </div>
        </Card>
      )}

      {!isAll && selectedDisplay && !(selectedDisplay as unknown as { isSnapshot: boolean }).isSnapshot && (
        <p style={{ fontSize: 11, color: "var(--fg-4)", margin: 0 }}>Aperçu live pour {selectedMonth} — valeurs actuelles + service charge/bonus calculés. Enregistrez pour figer ce mois et l&apos;utiliser dans Reports.</p>
      )}
    </Card>

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
      <label style={{ fontSize: 12, color: "var(--fg-3)" }}>Category<select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} style={FIELD}>
        {categories.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        <option value={NEW_CATEGORY}>＋ New category…</option>
      </select></label>
      {editing.category === NEW_CATEGORY ? <label style={{ fontSize: 12, color: "var(--fg-3)" }}>New category name<input required value={editCustomCategory} onChange={(event) => setEditCustomCategory(event.target.value)} placeholder="e.g. Insurance" style={FIELD} /></label> : null}
      <label style={{ fontSize: 12, color: "var(--fg-3)" }}>Name<input required value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} style={FIELD} /></label>
      {editing.category === "support_workers" ? <label style={{ fontSize: 12, color: "var(--fg-3)" }}>Support type<select value={editing.support_type ?? "social_media"} onChange={(event) => setEditing({ ...editing, support_type: event.target.value })} style={FIELD}><option value="social_media">Social media</option><option value="bookings">Bookings</option><option value="social_media_and_bookings">Social media + bookings</option></select></label> : null}
      <label style={{ fontSize: 12, color: "var(--fg-3)" }}>Monthly amount (฿)<input required type="number" min="0" step="0.01" value={editing.amount} onChange={(event) => setEditing({ ...editing, amount: event.target.value })} style={FIELD} /></label>
      <fieldset style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}><legend style={{ marginBottom: 7, fontSize: 12, color: "var(--fg-3)" }}>Does the amount change?</legend><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(["fixed", "variable"] as const).map((mode) => <PillButton key={mode} active={editing.amount_mode === mode} onClick={() => setEditing({ ...editing, amount_mode: mode })}>{mode === "fixed" ? "Same each month" : "Variable each month"}</PillButton>)}
      </div></fieldset>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => { setEditing(null); setEditCustomCategory(""); setConfirmDeleteId(null); }}>Cancel</Button>
        {confirmDeleteId === editing.id ? (
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Êtes-vous sûr ?</span>
            <Button type="button" size="sm" variant="destructive" disabled={deleting} onClick={() => void deleteCost(editing.id)}>{deleting ? "Deleting…" : "Confirm delete"}</Button>
            <Button type="button" size="sm" variant="secondary" disabled={deleting} onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          </span>
        ) : (
          <Button type="button" size="sm" variant="destructive" style={{ marginLeft: "auto" }} onClick={() => setConfirmDeleteId(editing.id)}>Delete expense</Button>
        )}
      </div>
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
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-3)" }}>฿<input type="number" min="0" step="1" disabled={!canManage || savingSalary} value={raw} onChange={(event) => setSalaryDraft((prev) => ({ ...prev, [employee.id]: event.target.value }))} style={{ ...FIELD, width: 130, height: 32 }} /></label>
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
