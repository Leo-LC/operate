"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightIcon, BanknoteIcon, ReceiptTextIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

type Location = { id: string; name: string };
type Setting = { id: string; location_id: string; service_charge_rate_pct: number };
type Summary = { employeeCount: number; recurringMonthly: number };
const FIELD: React.CSSProperties = { height: 38, border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", background: "var(--bg)", color: "var(--fg)", padding: "0 11px", fontSize: 13, width: "100%" };
const pillStyle = (active: boolean): React.CSSProperties => ({ padding: "8px 12px", borderRadius: "var(--r-sm)", border: `1px solid ${active ? "var(--bronze)" : "var(--line)"}`, background: active ? "var(--bronze-soft)" : "var(--bg)", color: active ? "var(--bronze)" : "var(--fg-3)", cursor: "pointer" });

export function ShopSettingsClient() {
  const [selectedId, setSelectedId] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [canManage, setCanManage] = useState(false);
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/finance/shop-settings", { cache: "no-store" }); const json = await response.json();
    if (!response.ok) { toast.error(json.error ?? "Unable to load shop settings"); return; }
    setLocations(json.locations); setSettings(json.settings); setSummaries(json.summaries ?? {}); setCanManage(json.canManage);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const current = useMemo(() => settings.find((setting) => setting.location_id === selectedId), [settings, selectedId]);
  useEffect(() => { setRate(String(current?.service_charge_rate_pct ?? 0)); }, [current]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!selectedId) return; setSaving(true);
    try {
      const response = await fetch("/api/finance/shop-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location_id: selectedId, service_charge_rate_pct: Number(rate) }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error ?? "Unable to save settings");
      toast.success("Service charge saved"); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save settings"); } finally { setSaving(false); }
  }

  const selectedLocation = locations.find((location) => location.id === selectedId);
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <PageHeader eyebrow="Finance" title="Shop settings" subtitle="One place to see how each shop is configured and jump to the right module." />
    <Card style={{ gap: 8 }}><span style={{ fontSize: 12, color: "var(--fg-3)" }}>View</span><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button type="button" aria-pressed={!selectedId} onClick={() => setSelectedId("")} style={pillStyle(!selectedId)}>All shops</button>
      {locations.map((location) => <button key={location.id} type="button" aria-pressed={selectedId === location.id} onClick={() => setSelectedId(location.id)} style={pillStyle(selectedId === location.id)}>{location.name}</button>)}
    </div></Card>
    {!selectedId ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>{locations.map((location) => {
      const setting = settings.find((item) => item.location_id === location.id); const summary = summaries[location.id] ?? { employeeCount: 0, recurringMonthly: 0 };
      return <button key={location.id} type="button" onClick={() => setSelectedId(location.id)} style={{ textAlign: "left", padding: 0, border: 0, background: "transparent", cursor: "pointer" }}><Card style={{ height: "100%", gap: 10, transition: "border-color 150ms" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{location.name}</strong><ArrowRightIcon size={16} color="var(--fg-4)" /></div><span style={{ fontSize: 12, color: "var(--fg-4)" }}>{summary.employeeCount} employees</span><span className="mono" style={{ fontSize: 18 }}>฿{summary.recurringMonthly.toLocaleString()}<small style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--fg-4)" }}> / month</small></span><span style={{ fontSize: 12, color: "var(--fg-4)" }}>Service charge · {Number(setting?.service_charge_rate_pct ?? 0)}%</span></Card></button>;
    })}</div> : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div><h2 style={{ margin: 0, fontSize: 20 }}>{selectedLocation?.name}</h2><p style={{ margin: "4px 0 0", color: "var(--fg-4)", fontSize: 12 }}>Choose a line to manage its source.</p></div>
      <Link href="/employees" style={{ textDecoration: "none" }}><Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><UsersIcon size={18} color="var(--bronze)" /><div style={{ flex: 1 }}><strong>Employees</strong><p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--fg-4)" }}>{summaries[selectedId]?.employeeCount ?? 0} assigned to this shop</p></div><ArrowRightIcon size={16} color="var(--fg-4)" /></Card></Link>
      <Link href={`/finance/recurring-costs?shop=${selectedId}`} style={{ textDecoration: "none" }}><Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><ReceiptTextIcon size={18} color="var(--bronze)" /><div style={{ flex: 1 }}><strong>Monthly costs</strong><p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--fg-4)" }}>฿{Number(summaries[selectedId]?.recurringMonthly ?? 0).toLocaleString()} currently registered</p></div><ArrowRightIcon size={16} color="var(--fg-4)" /></Card></Link>
      <Card style={{ gap: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><BanknoteIcon size={18} color="var(--bronze)" /><strong>Service charge</strong></div><form onSubmit={save} style={{ display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap" }}><label style={{ maxWidth: 220, fontSize: 12, color: "var(--fg-3)" }}>Rate (%)<input type="number" min="0" max="100" step=".01" value={rate} disabled={!canManage} onChange={(event) => setRate(event.target.value)} style={FIELD} /></label>{canManage ? <Button size="sm" disabled={saving}>{saving ? "Saving…" : "Save rate"}</Button> : <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Read only</span>}</form></Card>
    </div>}
  </div>;
}
