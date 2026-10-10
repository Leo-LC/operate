"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EDITABLE_KINDS, PALETTE_DEFAULTS } from "@/modules/scheduling/lib/colors";

interface Props {
  initialGlobal: {
    default_break_minutes: number;
    shift_thresholds: { open_after_open_min: number; close_before_close_min: number };
    palette: Record<string, string> | null;
  };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const PRESETS = [
  "#16a34a", "#0d9488", "#0891b2", "#2563eb",
  "#7c3aed", "#db2777", "#ea580c", "#a16207",
  "#dc2626", "#0f172a", "#64748b", "#94a3b8",
];

const inputStyle: React.CSSProperties = {
  height: 32,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  color: "var(--fg)",
  fontSize: 13,
  padding: "0 8px",
  width: 110,
};

export function SettingsClient({ initialGlobal }: Props) {
  const [globalBreak, setGlobalBreak] = useState(initialGlobal.default_break_minutes);
  const [colors, setColors] = useState<Record<string, string>>({
    ...PALETTE_DEFAULTS,
    ...(initialGlobal.palette ?? {}),
  });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hexOf = (key: string) =>
    HEX_RE.test(colors[key] ?? "") ? colors[key] : PALETTE_DEFAULTS[key as keyof typeof PALETTE_DEFAULTS];

  async function saveAll() {
    // Sanitize: fall back to defaults for anything that isn't a full hex color
    const palette: Record<string, string> = {};
    for (const { key } of EDITABLE_KINDS) {
      palette[key] = HEX_RE.test(colors[key] ?? "")
        ? colors[key]
        : PALETTE_DEFAULTS[key as keyof typeof PALETTE_DEFAULTS];
    }
    setSaving(true);
    try {
      const g = await fetch("/api/scheduling/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global: { default_break_minutes: globalBreak, palette } }),
      });
      if (!g.ok) throw new Error((await g.json()).error ?? "Failed to save settings");
      setColors(palette);
      setOpenKey(null);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Global defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-48 text-muted-foreground">Default break (minutes)</span>
            <input
              type="number"
              min={0}
              value={globalBreak}
              onChange={(e) => setGlobalBreak(Number(e.target.value))}
              style={inputStyle}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shift colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2.5">
            {EDITABLE_KINDS.map(({ key, label }) => {
              const hex = hexOf(key);
              const customized = HEX_RE.test(colors[key] ?? "") && colors[key] !== PALETTE_DEFAULTS[key as keyof typeof PALETTE_DEFAULTS];
              return (
                <div key={key} className="relative flex items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setOpenKey((v) => (v === key ? null : key))}
                    title={`Choose ${label} color`}
                    aria-label={`Choose ${label} color`}
                    aria-expanded={openKey === key}
                    className="h-8 w-12 shrink-0 rounded-[var(--r-sm)] border border-[var(--line)] transition-transform hover:scale-105"
                    style={{ background: hex, boxShadow: "var(--shadow-1)" }}
                  />
                  <span className="w-36">
                    {label}
                    {customized && (
                      <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                        custom
                      </span>
                    )}
                  </span>
                  <input
                    value={colors[key] ?? ""}
                    spellCheck={false}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === "") {
                        setColors((prev) => ({ ...prev, [key]: v }));
                      }
                    }}
                    onBlur={() => {
                      if (!HEX_RE.test(colors[key] ?? "")) {
                        setColors((prev) => ({ ...prev, [key]: PALETTE_DEFAULTS[key as keyof typeof PALETTE_DEFAULTS] }));
                      }
                    }}
                    placeholder="#rrggbb"
                    aria-label={`${label} hex color`}
                    className="h-8 w-24 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg)] px-2 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  />

                  {openKey === key && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenKey(null)}
                        aria-hidden
                      />
                      <div
                        className="absolute left-0 top-10 z-50 w-64 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-3"
                        style={{ boxShadow: "var(--shadow-2)" }}
                        role="dialog"
                        aria-label={`${label} color picker`}
                      >
                        <div className="grid grid-cols-6 gap-1.5">
                          {PRESETS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              title={p}
                              aria-label={`Use ${p}`}
                              onClick={() => setColors((prev) => ({ ...prev, [key]: p }))}
                              className="h-7 rounded-[var(--r-sm)] border transition-transform hover:scale-110"
                              style={{
                                background: p,
                                borderColor: hex.toLowerCase() === p ? "var(--accent)" : "var(--line)",
                                boxShadow: hex.toLowerCase() === p ? "inset 0 0 0 1.5px var(--accent)" : undefined,
                              }}
                            />
                          ))}
                        </div>
                        <label
                          className="mt-2.5 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[var(--r-sm)] border border-dashed border-[var(--line-strong)] text-[13px] text-[var(--fg-3)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--fg)]"
                        >
                          Custom color…
                          <input
                            type="color"
                            value={hex}
                            onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))}
                            style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
                            aria-label="Custom color picker"
                          />
                        </label>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-mono text-xs text-muted-foreground">{hex}</span>
                          <Button size="sm" variant="secondary" onClick={() => setOpenKey(null)}>
                            Done
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveAll} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setColors({ ...PALETTE_DEFAULTS })}
            >
              Reset colors
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
