"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ShopThreshold = {
  name: string;
  value: number | null;
  default: number | null;
};

type SettingsResponse = {
  thresholds: Record<string, ShopThreshold>;
  canManage: boolean;
};

const FIELD: React.CSSProperties = {
  height: 32,
  width: 140,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line-strong)",
  background: "var(--bg)",
  color: "var(--fg)",
  padding: "0 8px",
  fontSize: 13,
  outline: "none",
  fontFamily: "var(--font-mono)",
};

export function SalesTargetSettings() {
  const [shops, setShops] = useState<Record<string, ShopThreshold>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/challenges/settings", { cache: "no-store" });
    if (!res.ok) {
      toast.error("Unable to load sales target settings");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as SettingsResponse;
    setShops(data.thresholds);
    setCanManage(data.canManage);
    const next: Record<string, string> = {};
    for (const [key, shop] of Object.entries(data.thresholds)) {
      next[key] = shop.value !== null ? String(shop.value) : "";
    }
    setDraft(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const thresholds: Record<string, number | null> = {};
      for (const key of Object.keys(shops)) {
        const raw = draft[key]?.trim() ?? "";
        thresholds[key] = raw === "" ? null : Number(raw);
      }
      const res = await fetch("/api/challenges/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Failed to save");
        return;
      }
      toast.success("Sales targets saved");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "12px 0", fontSize: 13, color: "var(--fg-4)" }}>Loading…</div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {Object.entries(shops).map(([key, shop]) => {
          const raw = draft[key] ?? "";
          const parsed = raw === "" ? null : Number(raw);
          const isOverride = parsed !== null && parsed !== shop.default;
          return (
            <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3" style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)" }}>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[var(--fg)]">{shop.name}</span>
                <span className="text-[11px] text-[var(--fg-4)]">
                  Default {shop.default !== null ? `${shop.default.toLocaleString()} ฿` : "—"}
                  {isOverride && <span style={{ color: "var(--bronze-2)" }}> · custom value</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  placeholder={shop.default !== null ? String(shop.default) : "—"}
                  value={raw}
                  disabled={!canManage}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={FIELD}
                />
                <span className="text-xs text-[var(--fg-4)]">฿</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        {canManage ? (
          <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save sales targets"}
          </Button>
        ) : (
          <span className="text-xs text-[var(--fg-4)]">Only the owner can change sales targets.</span>
        )}
        <span className="text-[11px] text-[var(--fg-4)]">Leave empty to use the default.</span>
      </div>
    </div>
  );
}