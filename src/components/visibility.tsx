"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from "sonner";

/**
 * Shared client state for the "eye" visibility toggles.
 * One fetch for the whole app (mounted once in DashboardShell); the sidebar,
 * the command palette and every tab bar read the same context.
 */
export interface UiVisibilityValue {
  /** False only when the key is explicitly masked; absent key = visible. */
  isVisible: (key: string) => boolean;
  /** owner/admin: masked elements stay visible (dimmed) instead of disappearing. */
  canSeeHidden: boolean;
  /** owner only: renders the eye and allows toggling. */
  canToggle: boolean;
  toggle: (key: string) => void;
}

const UiVisibilityContext = createContext<UiVisibilityValue | null>(null);

/** Safe default when no provider is mounted: everything visible, no eye. */
const NOOP_VALUE: UiVisibilityValue = {
  isVisible: () => true,
  canSeeHidden: true,
  canToggle: false,
  toggle: () => {},
};

export function useUiVisibilityValue(role: string): UiVisibilityValue {
  const [map, setMap] = useState<Record<string, boolean>>({});
  const canSeeHidden = role === "owner" || role === "admin";
  const canToggle = role === "owner";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/module-visibility", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j && typeof j === "object") setMap(j as Record<string, boolean>);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback(
    (key: string) => {
      if (!canToggle) return;
      const next = !(map[key] ?? true);
      setMap((prev) => ({ ...prev, [key]: next }));
      fetch("/api/admin/module-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, visible: next }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          toast.success(next ? "Visible pour tout le monde" : "Masqué — visible de toi et des admins seulement");
        })
        .catch(() => {
          setMap((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
          toast.error("Impossible de changer la visibilité");
        });
    },
    [canToggle, map]
  );

  return useMemo<UiVisibilityValue>(
    () => ({
      isVisible: (key) => map[key] ?? true,
      canSeeHidden,
      canToggle,
      toggle,
    }),
    [map, canSeeHidden, canToggle, toggle]
  );
}

export function UiVisibilityProvider({ value, children }: { value: UiVisibilityValue; children: React.ReactNode }) {
  return <UiVisibilityContext.Provider value={value}>{children}</UiVisibilityContext.Provider>;
}

export function useUiVisibility(): UiVisibilityValue {
  return useContext(UiVisibilityContext) ?? NOOP_VALUE;
}

/** The small eye button rendered next to nav items and tabs (owner only). */
export function VisibilityEye({
  visible,
  label,
  onToggle,
  size = 22,
  margin = 2,
}: {
  visible: boolean;
  label: string;
  onToggle: () => void;
  size?: number;
  margin?: number;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      title={visible ? `Masquer "${label}" pour tout le monde (sauf toi + admins)` : `Réafficher "${label}" pour tout le monde`}
      aria-label={visible ? `Masquer ${label}` : `Réafficher ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "var(--r-sm)",
        border: "1px solid transparent",
        background: "transparent",
        color: visible ? "var(--fg-3)" : "var(--fg-4)",
        opacity: visible ? 0.9 : 0.45,
        cursor: "pointer",
        flexShrink: 0,
        margin,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
    >
      {visible ? <EyeIcon size={13} /> : <EyeOffIcon size={13} />}
    </button>
  );
}
