"use client";

import { useState } from "react";
import { toast } from "sonner";
import { THEMES, type AppTheme } from "@/lib/theme-config";
import { CheckIcon } from "lucide-react";

interface AppearanceClientProps {
  currentTheme: AppTheme;
}

const THEME_PREVIEWS: Record<AppTheme, { bg: string; sidebar: string; accent: string; text: string }> = {
  capybara: { bg: "#F7F2E9", sidebar: "#2F2823", accent: "#B9854E", text: "#2F2823" },
  forest:   { bg: "#f5f0e8", sidebar: "#1e3520", accent: "#2d5a2d", text: "#1a2e1a" },
};

export function AppearanceClient({ currentTheme }: AppearanceClientProps) {
  const [active, setActive] = useState<AppTheme>(currentTheme);
  const [saving, setSaving] = useState(false);

  async function handleSelect(theme: AppTheme) {
    if (theme === active) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to save theme");
        return;
      }
      setActive(theme);
      toast.success("Theme updated");
      setTimeout(() => window.location.reload(), 800);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)" }}>Appearance</h2>
        <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4 }}>
          Choose a color theme for your organization. Changes apply for all users after they reload.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {THEMES.map((theme) => {
          const preview = THEME_PREVIEWS[theme.id];
          const isActive = active === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => void handleSelect(theme.id)}
              disabled={saving}
              style={{
                position: "relative",
                borderRadius: "var(--r-lg)",
                border: isActive ? "2px solid var(--bronze)" : "2px solid var(--line)",
                padding: 16,
                textAlign: "left",
                background: "var(--surface)",
                cursor: "pointer",
                transition: "border-color 150ms, box-shadow 150ms",
                boxShadow: isActive ? "var(--shadow-1)" : "none",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = "var(--bronze)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = "var(--line)"; }}
            >
              {/* Mini preview */}
              <div
                style={{ marginBottom: 12, height: 96, width: "100%", overflow: "hidden", borderRadius: "var(--r-md)", background: preview.bg }}
              >
                <div style={{ display: "flex", height: "100%" }}>
                  <div style={{ height: "100%", width: 40, flexShrink: 0, background: preview.sidebar }} />
                  <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ height: 8, width: "75%", borderRadius: 999, opacity: 0.3, background: preview.text }} />
                    <div style={{ height: 8, width: "50%", borderRadius: 999, opacity: 0.2, background: preview.text }} />
                    <div style={{ marginTop: 8, height: 20, width: 64, borderRadius: "var(--r-sm)", background: preview.accent }} />
                  </div>
                </div>
              </div>

              {/* Label */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{theme.label}</p>
                  <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>{theme.description}</p>
                </div>
                {isActive && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "var(--bronze)", color: "#fff" }}>
                    <CheckIcon style={{ width: 12, height: 12 }} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--fg-4)" }}>
        More themes coming soon. Custom branding will be available in a future update.
      </p>
    </div>
  );
}
