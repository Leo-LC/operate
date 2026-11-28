"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from "sonner";

/**
 * Shared client state for the "eye" visibility toggles.
 * The map is seeded server-side by the dashboard layout (first paint already
 * honors masks); the one client fetch below is only a refresh for long-lived
 * sessions. The sidebar, the command palette and every tab bar read the same
 * context.
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

export function useUiVisibilityValue(
  role: string,
  initialVisibility?: Record<string, boolean>
): UiVisibilityValue {
  // Seed with the server-read map so masked elements are hidden from the very
  // first paint (no fail-open window before the fetch resolves).
  const [map, setMap] = useState<Record<string, boolean>>(initialVisibility ?? {});
  const canSeeHidden = role === "owner" || role === "admin";
  const canToggle = role === "owner";

  useEffect(() => {
    // Refresh only: with the server-seeded map a failed fetch keeps the last
    // known (correct) state instead of falling back to "everything visible".
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
          toast.success(next ? "Visible to everyone" : "Masked — visible to owner & admins only");
        })
        .catch(() => {
          setMap((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
          toast.error("Could not update visibility");
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
      title={visible ? `Mask "${label}" for everyone (except you + admins)` : `Show "${label}" for everyone again`}
      aria-label={visible ? `Mask ${label}` : `Unmask ${label}`}
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
