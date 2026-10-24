"use client";

import { useEffect, useState } from "react";
import { ModuleTabs, type ModuleTab } from "@/components/ui/module-tabs";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import type { SessionRole } from "@/core/permissions/types";

interface ReviewsTabNavProps {
  role?: SessionRole;
}

type TabKey = "stats";
type Visibility = Record<TabKey, boolean>;

const DEFAULT_VISIBILITY: Visibility = { stats: true };

/**
 * Same eye-icon pattern as the Direction module tabs: owners/admins toggle
 * whether the Stats tab is visible to everyone; the choice is persisted
 * server-side (/api/reviews/tabs) and mirrored in localStorage.
 */
export function ReviewsTabNav({ role }: ReviewsTabNavProps) {
  const isOwner = role === "owner";
  const isPrivileged = role === "owner" || role === "admin";

  const [visibility, setVisibility] = useState<Visibility>(DEFAULT_VISIBILITY);
  const [eyeHover, setEyeHover] = useState<TabKey | null>(null);

  // Server table is the source of truth; fall back to defaults silently.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews/tabs", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json && typeof json === "object" && !json.error) {
          setVisibility((prev) => ({ ...prev, ...json }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function toggleTabVisibility(key: TabKey) {
    const next = !visibility[key];
    setVisibility((prev) => ({ ...prev, [key]: next }));
    if (isPrivileged) {
      fetch("/api/reviews/tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab_key: key, visible: next }),
      }).catch(() => {});
    }
  }

  function EyeToggle({ tabKey, label }: { tabKey: TabKey; label: string }) {
    const visible = visibility[tabKey] !== false;
    const hovered = eyeHover === tabKey;
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTabVisibility(tabKey); }}
        title={visible ? `Hide "${label}" from other roles` : `Show "${label}" to everyone`}
        aria-label={visible ? `Hide ${label} from other roles` : `Show ${label} to everyone`}
        onMouseEnter={() => setEyeHover(tabKey)}
        onMouseLeave={() => setEyeHover(null)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, borderRadius: "var(--r-sm)",
          border: "1px solid transparent",
          background: hovered ? "var(--bg-2)" : "transparent",
          color: hovered ? "var(--fg-2)" : "var(--fg-4)",
          cursor: "pointer", marginLeft: 2,
        }}
      >
        {visible ? <EyeIcon size={13} /> : <EyeOffIcon size={13} />}
      </button>
    );
  }

  const statsVisibleToThisUser = visibility.stats !== false || isPrivileged;

  const tabs: ModuleTab[] = [
    { label: "Inbox", href: "/reviews/inbox" },
    ...(isOwner
      ? [
          { label: "Templates", href: "/reviews/templates" },
        ]
      : []),
    // Hidden-from-everyone tabs still show for privileged users (dimmed,
    // eye-off icon) so they can be re-enabled — matches the Direction module.
    ...(statsVisibleToThisUser
      ? [{
          label: "Stats",
          href: "/reviews/stats",
          dimmed: visibility.stats === false,
          extra: isPrivileged ? <EyeToggle tabKey="stats" label="Stats" /> : undefined,
        }]
      : []),
    { label: "Locations", href: "/reviews/locations" },
  ];

  return (
    <div className="reviews-tab-nav">
      <ModuleTabs tabs={tabs} ariaLabel="Reviews" />
    </div>
  );
}
