"use client";

import { useEffect, useState } from "react";
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

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-lg font-semibold">HR Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure overtime multipliers and salary calculation basis.</p>
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="rounded-lg border border-border bg-card p-6 flex flex-col gap-5">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Overtime multipliers</p>
          <div className="flex flex-col gap-3">
            {([
              { key: "overtime_weekday_multiplier" as const, label: "Weekday OT (×)", hint: "Thailand default: 1.5" },
              { key: "overtime_weekend_multiplier" as const, label: "Weekend OT (×)", hint: "Thailand default: 2.0" },
              { key: "overtime_holiday_multiplier" as const, label: "Holiday OT (×)", hint: "Thailand default: 2.0" },
            ] as const).map(({ key, label, hint }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-sm w-36 text-muted-foreground">{label}</label>
                <input
                  type="number" min="1" max="5" step="0.1"
                  value={settings[key]}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 1 }))}
                  className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
                />
                <span className="text-xs text-muted-foreground">{hint}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Hourly rate basis</p>
          <div className="flex items-center gap-3">
            <label className="text-sm w-36 text-muted-foreground">Hours / month</label>
            <input
              type="number" min="100" max="300" step="1"
              value={settings.monthly_hours_divisor}
              onChange={(e) => setSettings((prev) => ({ ...prev, monthly_hours_divisor: parseFloat(e.target.value) || 208 }))}
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
            />
            <span className="text-xs text-muted-foreground">Default: 208 (26 days × 8h)</span>
          </div>
        </div>

        <Button type="submit" size="sm" disabled={saving} className="self-start">
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
