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
      toast.success("Theme updated — reload to apply");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a color theme for your organization. Changes apply for all users after they reload.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((theme) => {
          const preview = THEME_PREVIEWS[theme.id];
          const isActive = active === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => void handleSelect(theme.id)}
              disabled={saving}
              className={[
                "group relative rounded-xl border-2 p-4 text-left transition-all",
                isActive
                  ? "border-primary shadow-md"
                  : "border-border hover:border-primary/50",
              ].join(" ")}
            >
              {/* Mini preview */}
              <div
                className="mb-3 h-24 w-full overflow-hidden rounded-lg"
                style={{ background: preview.bg }}
              >
                <div className="flex h-full">
                  <div
                    className="h-full w-10 flex-shrink-0"
                    style={{ background: preview.sidebar }}
                  />
                  <div className="flex-1 p-2 space-y-1.5">
                    <div
                      className="h-2 w-3/4 rounded-full opacity-30"
                      style={{ background: preview.text }}
                    />
                    <div
                      className="h-2 w-1/2 rounded-full opacity-20"
                      style={{ background: preview.text }}
                    />
                    <div
                      className="mt-2 h-5 w-16 rounded"
                      style={{ background: preview.accent }}
                    />
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{theme.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
                </div>
                {isActive && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="h-3 w-3" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        More themes coming soon. Custom branding will be available in a future update.
      </p>
    </div>
  );
}
