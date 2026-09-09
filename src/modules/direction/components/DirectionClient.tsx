"use client";

import { useEffect, useState } from "react";
import { LayoutDashboardIcon, LayersIcon, CalculatorIcon, BarChart3Icon, PlugIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { LoyverseDashboard } from "@/modules/loyverse/components/LoyverseDashboard";
import { DirectionOverview } from "./DirectionOverview";
import { DirectionComparaison } from "./DirectionComparaison";
import { DirectionDetails } from "./DirectionDetails";
import { DirectionDaily } from "./DirectionDaily";

type TabKey = "loyverse" | "overview" | "comparaison" | "daily" | "details";
type TabDef = { value: TabKey; label: string; icon: React.ElementType };

const ALL_TABS: TabDef[] = [
  { value: "loyverse", label: "Loyverse", icon: PlugIcon },
  { value: "overview", label: "Vue d'ensemble", icon: LayoutDashboardIcon },
  { value: "comparaison", label: "Comparaison", icon: BarChart3Icon },
  { value: "daily", label: "Résultat quotidien", icon: CalculatorIcon },
  { value: "details", label: "Détails", icon: LayersIcon },
];

const STORAGE_KEY = "direction-tabs-visibility";
const DEFAULT_VISIBILITY: Record<TabKey, boolean> = {
  loyverse: true,
  overview: true,
  comparaison: true,
  daily: false,
  details: false,
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

  // Ensure active is visible; if not, switch to first visible
  useEffect(() => {
    if (!visibleTabs.some((t) => t.value === active)) {
      setActive(visibleTabs[0]?.value ?? "loyverse");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility, isBoss]);

  function toggleTabVisibility(key: TabKey) {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Direction" />

      {/* Tab bar with eye toggle per tab for privileged users */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", gap: 0, overflowX: "auto", scrollbarWidth: "none" }}>
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.value;
          const isVisibleForBoss = visibility[tab.value] !== false;
          return (
            <div key={tab.value} style={{ display: "inline-flex", alignItems: "center", gap: 0, borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1 }}>
              <button
                type="button"
                onClick={() => setActive(tab.value)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "0 var(--s-3)", height: 36, fontSize: 13, fontWeight: 500,
                  border: "none", background: "none", cursor: "pointer",
                  color: isActive ? "var(--fg)" : "var(--fg-4)",
                  transition: "color var(--dur) var(--ease)", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget.style.color = "var(--fg-2)"); }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget.style.color = "var(--fg-4)"); }}
                title={tab.label}
              >
                <Icon size={14} />
                {tab.label}
              </button>
              {isPrivileged && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleTabVisibility(tab.value); }}
                  title={isVisibleForBoss ? `Masquer "${tab.label}" pour la Direction (Boss)` : `Afficher "${tab.label}" pour la Direction (Boss)`}
                  aria-label={isVisibleForBoss ? `Masquer ${tab.label} pour Direction` : `Afficher ${tab.label} pour Direction`}
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
              )}
            </div>
          );
        })}
        {/* For privileged users, also show hidden tabs as muted with eye-off so they can re-enable */}
        {isPrivileged && ALL_TABS.filter((t) => !visibleTabs.some((v) => v.value === t.value)).map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.value;
          return (
            <div key={tab.value} style={{ display: "inline-flex", alignItems: "center", gap: 0, borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1, opacity: 0.55 }}>
              <button
                type="button"
                onClick={() => setActive(tab.value)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "0 var(--s-3)", height: 36, fontSize: 13, fontWeight: 500,
                  border: "none", background: "none", cursor: "pointer",
                  color: isActive ? "var(--fg)" : "var(--fg-4)", whiteSpace: "nowrap",
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleTabVisibility(tab.value); }}
                title={`Afficher "${tab.label}" pour la Direction (Boss)`}
                aria-label={`Afficher ${tab.label} pour Direction`}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: "var(--r-sm)", border: "1px solid transparent", background: "transparent",
                  color: "var(--fg-4)", cursor: "pointer", opacity: 0.6, marginRight: 4,
                }}
              >
                <EyeOffIcon size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        {active === "loyverse" && <LoyverseDashboard canSync={canSync} />}
        {active === "overview" && <DirectionOverview />}
        {active === "comparaison" && <DirectionComparaison />}
        {active === "daily" && <DirectionDaily />}
        {active === "details" && <DirectionDetails />}
      </div>
    </div>
  );
}
