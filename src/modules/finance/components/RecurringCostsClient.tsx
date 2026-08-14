"use client";

import { useCallback, useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

type Location = { id: string; name: string };
type Cost = { id: string; label: string; category: string; estimated_amount: number; location_id?: string | null; custom_allocations?: { amount_mode?: "fixed" | "variable" }; is_active: boolean };
type Category = "rent" | "utilities" | "marketing" | "support_workers" | "other";

const CATEGORY_LABELS: Record<Category, string> = { rent: "Rent", utilities: "Utilities", marketing: "Marketing", support_workers: "Support workers", other: "Other" };
const EMPTY_FORM = { category: "rent" as Category, support_type: "social_media", amount: "", amount_mode: "fixed" as "fixed" | "variable" };
const FIELD: React.CSSProperties = { height: 38, border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", background: "var(--bg)", color: "var(--fg)", padding: "0 11px", fontSize: 13, width: "100%" };
const pillStyle = (active: boolean): React.CSSProperties => ({ padding: "8px 12px", borderRadius: "var(--r-sm)", border: `1px solid ${active ? "var(--bronze)" : "var(--line)"}`, background: active ? "var(--bronze-soft)" : "var(--bg)", color: active ? "var(--bronze)" : "var(--fg-3)", cursor: "pointer" });

export function RecurringCostsClient() {
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const query = locationId ? `?location_id=${locationId}` : "";
    const response = await fetch(`/api/finance/recurring-costs${query}`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) { toast.error(json.error ?? "Unable to load recurring costs"); return; }
    setLocations(json.locations); setCosts(json.costs); setCanManage(json.canManage);
  }, [locationId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get("shop"); if (requested) setLocationId(requested); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!locationId) return; setSaving(true);
    try {
      const response = await fetch("/api/finance/recurring-costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_id: locationId, category: form.category, support_type: form.category === "support_workers" ? form.support_type : null, estimated_amount: Number(form.amount), amount_mode: form.amount_mode }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Unable to save cost");
      setForm(EMPTY_FORM); setShowForm(false); toast.success("Monthly cost saved"); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save cost"); } finally { setSaving(false); }
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <PageHeader eyebrow="Finance" title="Recurring costs" subtitle="The few costs each shop expects every month." actions={canManage && locationId ? <Button size="sm" onClick={() => setShowForm((value) => !value)}><PlusIcon size={14} />Add cost</Button> : null} />
    <Card style={{ gap: 8 }}><span style={{ fontSize: 12, color: "var(--fg-3)" }}>Shop</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button type="button" aria-pressed={!locationId} onClick={() => setLocationId("")} style={pillStyle(!locationId)}>All shops</button>
      {locations.map((location) => <button key={location.id} type="button" aria-pressed={locationId === location.id} onClick={() => setLocationId(location.id)} style={pillStyle(locationId === location.id)}>{location.name}</button>)}
    </div></Card>
    {showForm ? <Card><form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
      <label style={{ fontSize: 12, color: "var(--fg-3)" }}>What is it?<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Category })} style={FIELD}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {form.category === "support_workers" ? <label style={{ fontSize: 12, color: "var(--fg-3)" }}>Support type<select value={form.support_type} onChange={(event) => setForm({ ...form, support_type: event.target.value })} style={FIELD}><option value="social_media">Social media</option><option value="bookings">Bookings</option><option value="social_media_and_bookings">Social media + bookings</option></select></label> : null}
      <label style={{ fontSize: 12, color: "var(--fg-3)" }}>Monthly amount (฿)<input required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} style={FIELD} /></label>
      <fieldset style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}><legend style={{ marginBottom: 7, fontSize: 12, color: "var(--fg-3)" }}>Does the amount change?</legend><div style={{ display: "flex", gap: 8 }}>
        {(["fixed", "variable"] as const).map((mode) => <button key={mode} type="button" aria-pressed={form.amount_mode === mode} onClick={() => setForm({ ...form, amount_mode: mode })} style={pillStyle(form.amount_mode === mode)}>{mode === "fixed" ? "Same each month" : "Variable each month"}</button>)}
      </div><p style={{ marginTop: 7, fontSize: 11, color: "var(--fg-4)" }}>{form.amount_mode === "fixed" ? "This amount is the expected cost every month." : "This amount is a planning estimate. Monthly actual entry is not available yet."}</p></fieldset>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}><Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save cost"}</Button><Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button></div>
    </form></Card> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>{costs.map((cost) => <Card key={cost.id} style={{ gap: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 12, color: "var(--fg-4)" }}>{CATEGORY_LABELS[cost.category as Category] ?? cost.label}</span>{!locationId ? <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{locations.find((location) => location.id === cost.location_id)?.name}</span> : null}</div><strong style={{ fontSize: 16 }}>{cost.label}</strong><span className="mono" style={{ fontSize: 22 }}>฿{Number(cost.estimated_amount).toLocaleString()}</span><span style={{ fontSize: 12, color: "var(--fg-4)" }}>{cost.custom_allocations?.amount_mode === "variable" ? "Variable each month" : "Same each month"}</span></Card>)}</div>
    {costs.length === 0 ? <Card style={{ alignItems: "center", padding: 36, color: "var(--fg-4)" }}>{locationId ? "No monthly costs for this shop yet." : "No monthly costs registered yet."}</Card> : null}
  </div>;
}
