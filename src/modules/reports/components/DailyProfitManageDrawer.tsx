"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalculatorIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { toast } from "sonner";

interface LocationRow { id: string; name: string; }
interface MonthlyInputRow {
  id: string;
  location_id: string;
  period_year: number;
  period_month: number;
  salaries_amount: number;
  rent_amount: number;
  electricity_amount: number;
  water_amount: number;
  other_fixed_amount: number;
  service_charge_rate_pct: number;
  employee_count: number;
  bonus_amount?: number;
}
interface ConfigData { locations: LocationRow[]; monthlyInputs: MonthlyInputRow[]; }
interface Props { open: boolean; onClose: () => void; onChanged: () => void; defaultDate: string; }

const emptyValues = {
  salaries_amount: "",
  rent_amount: "",
  electricity_amount: "",
  water_amount: "",
  other_fixed_amount: "",
  service_charge_rate_pct: "1",
  employee_count: "",
  bonus_amount: "",
};

export function DailyProfitManageDrawer({ open, onClose, onChanged, defaultDate }: Props) {
  const [config, setConfig] = useState<ConfigData>({ locations: [], monthlyInputs: [] });
  const [locationId, setLocationId] = useState("");
  const [period, setPeriod] = useState(defaultDate.slice(0, 7));
  const [values, setValues] = useState(emptyValues);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const response = await fetch("/api/reports/daily-profit/config");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to load settings");
      const next = json as ConfigData;
      setConfig(next);
      setLocationId((current) => current || next.locations[0]?.id || "");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load settings"); }
    finally { setLoading(false); }
  }, [open]);

  useEffect(() => { void load(); }, [load]);

  const current = useMemo(() => {
    const [year, month] = period.split("-").map(Number);
    return config.monthlyInputs.find((row) => row.location_id === locationId && row.period_year === year && row.period_month === month);
  }, [config.monthlyInputs, locationId, period]);

  useEffect(() => {
    if (!current) { setValues(emptyValues); return; }
    setValues({
      salaries_amount: String(current.salaries_amount),
      rent_amount: String(current.rent_amount),
      electricity_amount: String(current.electricity_amount),
      water_amount: String(current.water_amount),
      other_fixed_amount: String(current.other_fixed_amount),
      service_charge_rate_pct: String(current.service_charge_rate_pct),
      employee_count: String(current.employee_count),
      bonus_amount: String((current as { bonus_amount?: number }).bonus_amount ?? ""),
    });
  }, [current]);

  function setField(field: keyof typeof emptyValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function save() {
    if (!locationId || !period || !reason.trim()) { toast.error("Select a shop, a month and add a reason"); return; }
    const [periodYear, periodMonth] = period.split("-").map(Number);
    setSaving(true);
    try {
      const response = await fetch("/api/reports/daily-profit/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          period_year: periodYear,
          period_month: periodMonth,
          reason: reason.trim(),
          ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value || 0)])),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to save");
      toast.success("Monthly settings saved");
      setReason("");
      await load();
      onChanged();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save"); }
    finally { setSaving(false); }
  }

  const monthlyFixed = Number(values.rent_amount || 0) + Number(values.electricity_amount || 0) + Number(values.water_amount || 0) + Number(values.other_fixed_amount || 0);
  const shopName = config.locations.find((location) => location.id === locationId)?.name ?? "this shop";

  return (
    <Drawer open={open} onClose={onClose} title="Monthly P&L settings" description="One identical form for every shop. These values do not affect Accounting or Payments.">
      {loading ? <p style={{ color: "var(--fg-4)" }}>Loading…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
            <Field label="Shop"><select style={inputStyle} value={locationId} onChange={(event) => setLocationId(event.target.value)}>{config.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
            <Field label="Month"><input style={inputStyle} type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></Field>
          </div>

          <section style={sectionStyle}>
            <Heading title="Team" hint="Monthly total and service charge settings." />
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
              <MoneyField label="Salaries for the month" value={values.salaries_amount} onChange={(value) => setField("salaries_amount", value)} />
              <Field label="Number of employees"><input style={inputStyle} inputMode="numeric" min="0" step="1" type="number" value={values.employee_count} onChange={(event) => setField("employee_count", event.target.value)} /></Field>
              <Field label="Service charge per employee (%)"><input style={inputStyle} inputMode="decimal" min="0" step="0.1" type="number" value={values.service_charge_rate_pct} onChange={(event) => setField("service_charge_rate_pct", event.target.value)} /></Field>
            </div>
          </section>

          <section style={sectionStyle}>
            <Heading title="Fixed costs" hint="Monthly amounts, spread automatically across each calendar day." />
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
              <MoneyField label="Rent" value={values.rent_amount} onChange={(value) => setField("rent_amount", value)} />
              <MoneyField label="Electricity" value={values.electricity_amount} onChange={(value) => setField("electricity_amount", value)} />
              <MoneyField label="Water" value={values.water_amount} onChange={(value) => setField("water_amount", value)} />
              <MoneyField label="Other fixed costs" value={values.other_fixed_amount} onChange={(value) => setField("other_fixed_amount", value)} />
              <MoneyField label="Challenge bonus" value={String(values.bonus_amount ?? "")} onChange={(value) => setField("bonus_amount", value)} />
            </div>
          </section>

          <div style={{ padding: 12, borderRadius: "var(--r-md)", background: "var(--bg-2)", border: "1px solid var(--line)", fontSize: 12, color: "var(--fg-3)" }}>
            <CalculatorIcon size={14} style={{ verticalAlign: "-2px", marginRight: 7 }} />
            For {shopName}: monthly fixed costs <strong className="mono">฿{monthlyFixed.toLocaleString()}</strong> · daily service charge = revenue × {Number(values.service_charge_rate_pct || 0)}% × {Number(values.employee_count || 0)}.
          </div>

          <Field label="Reason for change"><input style={inputStyle} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Budget confirmed for August" /></Field>
          <Button onClick={() => void save()} disabled={saving || !locationId || !reason.trim()}><SaveIcon size={14} />{saving ? "Saving…" : current ? "Update" : "Save"}</Button>
        </div>
      )}
    </Drawer>
  );
}

function Heading({ title, hint }: { title: string; hint: string }) { return <div><h3 style={{ fontSize: 14, margin: 0 }}>{title}</h3><p style={{ fontSize: 11, color: "var(--fg-4)", margin: "3px 0 0" }}>{hint}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</span>{children}</label>; }
function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={`${label} (THB)`}><input style={inputStyle} inputMode="decimal" min="0" step="100" type="number" value={value} onChange={(event) => onChange(event.target.value)} /></Field>; }
const sectionStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 };
const inputStyle: React.CSSProperties = { width: "100%", height: 36, padding: "0 10px", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--bg)", color: "var(--fg)", fontSize: 12 };
