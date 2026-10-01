"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutDashboardIcon, LayersIcon, CalculatorIcon, BarChart3Icon, PlugIcon, EyeIcon, EyeOffIcon, CalendarClockIcon } from "lucide-react";
import { ControlledTabs, type ControlledTab } from "@/components/ui/module-tabs";
import { LoyverseDashboard } from "@/modules/loyverse/components/LoyverseDashboard";
import { DirectionOverview } from "./DirectionOverview";
import { DirectionSourceBanner } from "./DirectionSourceBanner";
import { DirectionComparaison } from "./DirectionComparaison";
import { DirectionDetails } from "./DirectionDetails";
import { DirectionDaily } from "./DirectionDaily";
import { DirectionEndOfMonth } from "./DirectionEndOfMonth";

type TabKey = "loyverse" | "overview" | "comparaison" | "daily" | "details" | "end_of_month";
type TabDef = { value: TabKey; label: string; icon: React.ElementType };

const ALL_TABS: TabDef[] = [
  { value: "loyverse", label: "Loyverse", icon: PlugIcon },
  { value: "overview", label: "Vue d'ensemble", icon: LayoutDashboardIcon },
  { value: "comparaison", label: "Comparaison", icon: BarChart3Icon },
  { value: "daily", label: "Résultat quotidien", icon: CalculatorIcon },
  { value: "details", label: "Détails", icon: LayersIcon },
  { value: "end_of_month", label: "Fin de mois", icon: CalendarClockIcon },
];

const STORAGE_KEY = "direction-tabs-visibility";
const DEFAULT_VISIBILITY: Record<TabKey, boolean> = {
  loyverse: true,
  overview: true,
  comparaison: true,
  daily: false,
  details: false,
  end_of_month: false,
};

function loadVisibility(): Record<TabKey, boolean> {
  if (typeof window === "undefined") return DEFAULT_VISIBILITY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<TabKey, boolean>>;
      return { ...DEFAULT_VISIBILITY, ...parsed };
    }
  } catch {}
  return DEFAULT_VISIBILITY;
}

export function DirectionClient({ canSync = true, userRole = "" }: { canSync?: boolean; userRole?: string }) {
  const isBoss = userRole === "direction";
  const isPrivileged = ["owner", "admin"].includes(userRole);

  const [active, setActive] = useState<TabKey>("loyverse");
  const [visibility, setVisibility] = useState<Record<TabKey, boolean>>(() => loadVisibility());

  // Load shared visibility from server (source of truth for Boss)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/direction/tabs", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json && typeof json === "object" && !json.error) {
          const merged = { ...DEFAULT_VISIBILITY, ...json } as Record<TabKey, boolean>;
          setVisibility(merged);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
      window.dispatchEvent(new CustomEvent("direction-tabs-visibility-change", { detail: visibility }));
    } catch {}
  }, [visibility]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Record<TabKey, boolean>;
      if (detail) setVisibility(detail);
    };
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setVisibility({ ...DEFAULT_VISIBILITY, ...JSON.parse(e.newValue) }); } catch {}
      }
    };
    window.addEventListener("direction-tabs-visibility-change", handler as EventListener);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("direction-tabs-visibility-change", handler as EventListener);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  // Tabs visible for current user
  const visibleTabs: TabDef[] = isBoss
    ? ALL_TABS.filter((t) => visibility[t.value] !== false)
    : ALL_TABS;

  const hiddenTabs: TabDef[] = isPrivileged
    ? ALL_TABS.filter((t) => !visibleTabs.some((v) => v.value === t.value))
    : [];

  // Ensure active is visible; if not, switch to first visible
  useEffect(() => {
    if (!visibleTabs.some((t) => t.value === active)) {
      setActive(visibleTabs[0]?.value ?? "loyverse");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility, isBoss]);

  function toggleTabVisibility(key: TabKey) {
    const nextVisible = !visibility[key];
    setVisibility((prev) => ({ ...prev, [key]: nextVisible }));
    // Persist server-side so all Boss browsers see the change (owner/admin only)
    if (isPrivileged) {
      fetch("/api/direction/tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab_key: key, visible: nextVisible }),
      }).catch(() => {});
    }
  }

  function EyeToggle({ tabKey, label }: { tabKey: TabKey; label: string }) {
    const isVisibleForBoss = visibility[tabKey] !== false;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleTabVisibility(tabKey); }}
        title={isVisibleForBoss ? `Masquer "${label}" pour la Direction (Boss)` : `Afficher "${label}" pour la Direction (Boss)`}
        aria-label={isVisibleForBoss ? `Masquer ${label} pour Direction` : `Afficher ${label} pour Direction`}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, borderRadius: "var(--r-sm)",
          border: "1px solid transparent", background: "transparent",
          color: isVisibleForBoss ? "var(--fg-3)" : "var(--fg-4)", cursor: "pointer",
          opacity: isVisibleForBoss ? 0.9 : 0.45, marginRight: 4,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
      >
        {isVisibleForBoss ? <EyeIcon size={13} /> : <EyeOffIcon size={13} />}
      </button>
    );
  }

  const controlledTabs: ControlledTab[] = useMemo(() => [
    ...visibleTabs.map((tab) => ({
      value: tab.value,
      label: tab.label,
      icon: tab.icon,
      extra: isPrivileged ? <EyeToggle tabKey={tab.value} label={tab.label} /> : undefined,
    })),
    // For privileged users, also show hidden tabs as muted with eye-off so they can re-enable
    ...hiddenTabs.map((tab) => ({
      value: tab.value,
      label: tab.label,
      icon: tab.icon,
      dimmed: true,
      extra: <EyeToggle tabKey={tab.value} label={tab.label} />,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [visibleTabs, hiddenTabs, isPrivileged, visibility]);

  return (
    <div className="flex flex-col gap-4">
      {userRole === "owner" && <DirectionSourceBanner userRole={userRole} />}
      {/* Tab bar with eye toggle per tab for privileged users */}
      <ControlledTabs tabs={controlledTabs} value={active} onChange={(v) => setActive(v as TabKey)} ariaLabel="Direction" />

      <div className="pt-2">
        {active === "loyverse" && <LoyverseDashboard canSync={canSync} />}
        {active === "overview" && <DirectionOverview />}
        {active === "comparaison" && <DirectionComparaison />}
        {active === "daily" && <DirectionDaily />}
        {active === "details" && <DirectionDetails />}
        {active === "end_of_month" && <DirectionEndOfMonth />}
      </div>
    </div>
  );
}
