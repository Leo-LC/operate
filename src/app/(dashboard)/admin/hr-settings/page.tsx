"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { HrSettings } from "@/modules/attendance/types";
import { DEFAULT_HR_SETTINGS } from "@/modules/attendance/types";

export default function HrSettingsPage() {
  const [settings, setSettings] = useState<HrSettings>(DEFAULT_HR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/hr-settings");
      if (res.ok) {
        const data = await res.json() as HrSettings;
        setSettings(data);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/hr-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to save");
        return;
      }
      toast.success("HR settings saved");
    } finally {
      setSaving(false);
    }
  }

  const numInputStyle: React.CSSProperties = {
    height: 32,
    width: 80,
    borderRadius: "var(--r-sm)",
    border: "1px solid var(--line-strong)",
    background: "var(--bg)",
    color: "var(--fg)",
    padding: "0 8px",
    fontSize: 13,
    outline: "none",
    fontFamily: "var(--font-mono)",
  };

  if (loading) return <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 520 }}>
      <div>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)" }}>HR Settings</h1>
        <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4 }}>Configure overtime multipliers and salary calculation basis.</p>
      </div>

      <form onSubmit={(e) => void handleSave(e)} style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 12 }}>Overtime multipliers</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {([
              { key: "overtime_weekday_multiplier" as const, label: "Weekday OT (×)", hint: "Thailand default: 1.5" },
              { key: "overtime_weekend_multiplier" as const, label: "Weekend OT (×)", hint: "Thailand default: 2.0" },
              { key: "overtime_holiday_multiplier" as const, label: "Holiday OT (×)", hint: "Thailand default: 2.0" },
            ] as const).map(({ key, label, hint }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: 13, width: 144, color: "var(--fg-3)", flexShrink: 0 }}>{label}</label>
                <input
                  type="number" min="1" max="5" step="0.1"
                  value={settings[key]}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 1 }))}
                  style={numInputStyle}
                />
                <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{hint}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 12 }}>Hourly rate basis</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 13, width: 144, color: "var(--fg-3)", flexShrink: 0 }}>Hours / month</label>
            <input
              type="number" min="100" max="300" step="1"
              value={settings.monthly_hours_divisor}
              onChange={(e) => setSettings((prev) => ({ ...prev, monthly_hours_divisor: parseFloat(e.target.value) || 208 }))}
              style={numInputStyle}
            />
            <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Default: 208 (26 days × 8h)</span>
          </div>
        </div>

        <Button type="submit" size="sm" disabled={saving} style={{ alignSelf: "flex-start" }}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
