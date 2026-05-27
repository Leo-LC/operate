"use client";

import Link from "next/link";
import {
  StarIcon, FileTextIcon, PawPrintIcon, CalculatorIcon,
  CalendarDaysIcon, BarChart2Icon, ShieldIcon, ArrowRightIcon,
  UsersIcon, BookOpenIcon, AlertTriangleIcon,
} from "lucide-react";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import type { ModuleKey } from "@/core/permissions/types";

interface HomeClientProps {
  name: string;
  role?: "owner" | "staff";
  docsAlert: number;
  animalsAlert: number;
  snippets?: Partial<Record<ModuleKey, string>>;
}

interface ModuleCard {
  key: ModuleKey;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accentBg: string;
  accentColor: string;
}

const OPERATIONS_KEYS: ModuleKey[] = ["accounting", "documents", "animals", "schedules"];

const ALL_MODULES: ModuleCard[] = [
  {
    key: "reviews",
    label: "Reviews",
    description: "Reply to Google reviews with templates and smart rating rules.",
    href: "/reviews",
    icon: StarIcon,
    accentBg: "oklch(0.78 0.14 75 / 0.15)",
    accentColor: "oklch(0.58 0.14 75)",
  },
  {
    key: "schedules",
    label: "Scheduling",
    description: "Manage staff shifts, weekly schedules, and payroll across locations.",
    href: "/scheduling",
    icon: CalendarDaysIcon,
    accentBg: "oklch(0.60 0.14 220 / 0.15)",
    accentColor: "oklch(0.60 0.14 220)",
  },
  {
    key: "animals",
    label: "Animals",
    description: "Animal records, health tracking, and upcoming vaccination reminders.",
    href: "/animals",
    icon: PawPrintIcon,
    accentBg: "oklch(0.60 0.16 145 / 0.15)",
    accentColor: "oklch(0.60 0.16 145)",
  },
  {
    key: "documents",
    label: "Documents",
    description: "Permits, certificates, and compliance documents with expiry tracking.",
    href: "/documents",
    icon: FileTextIcon,
    accentBg: "oklch(0.62 0.14 300 / 0.15)",
    accentColor: "oklch(0.62 0.14 300)",
  },
  {
    key: "accounting",
    label: "Accounting",
    description: "Daily revenue and costs per shop, monthly summaries and KPIs.",
    href: "/accounting",
    icon: CalculatorIcon,
    accentBg: "oklch(0.58 0.15 170 / 0.15)",
    accentColor: "oklch(0.58 0.15 170)",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Cross-module overview — compliance, finances, and operations at a glance.",
    href: "/reports",
    icon: BarChart2Icon,
    accentBg: "oklch(0.56 0.16 250 / 0.15)",
    accentColor: "oklch(0.56 0.16 250)",
  },
  {
    key: "contacts",
    label: "Contacts",
    description: "Suppliers, partners, and shop contacts with billing and delivery info.",
    href: "/contacts",
    icon: UsersIcon,
    accentBg: "oklch(0.60 0.13 30 / 0.15)",
    accentColor: "oklch(0.60 0.13 30)",
  },
  {
    key: "admin",
    label: "Admin",
    description: "Users, locations, module permissions, and audit logs.",
    href: "/admin",
    icon: ShieldIcon,
    accentBg: "oklch(0.55 0.16 20 / 0.15)",
    accentColor: "oklch(0.55 0.16 20)",
  },
  {
    key: "wiki",
    label: "Wiki",
    description: "Internal knowledge base, SOPs, and shared documentation.",
    href: "/wiki",
    icon: BookOpenIcon,
    accentBg: "oklch(0.58 0.14 200 / 0.15)",
    accentColor: "oklch(0.58 0.14 200)",
  },
];

const PULSE_KEYS: ModuleKey[] = ["accounting", "animals", "documents", "schedules"];

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeClient({ name, role, docsAlert, animalsAlert, snippets = {} }: HomeClientProps) {
  const permissions = derivePermissionsFromRole(role);
  const firstName = name.split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const alerts: Partial<Record<ModuleKey, { count: number; label: string }>> = {
    ...(docsAlert > 0    ? { documents: { count: docsAlert,    label: `${docsAlert} doc${docsAlert !== 1 ? "s" : ""} expiring or expired` } }    : {}),
    ...(animalsAlert > 0 ? { animals:   { count: animalsAlert, label: `${animalsAlert} animal${animalsAlert !== 1 ? "s" : ""} need attention` } } : {}),
  };
  const totalAlerts = Object.values(alerts).reduce((s, a) => s + a.count, 0);

  const visibleModules = ALL_MODULES.filter((m) => hasModuleAccess(permissions, m.key));
  const operationsModules = visibleModules.filter((m) => OPERATIONS_KEYS.includes(m.key));
  const toolsModules = visibleModules.filter((m) => !OPERATIONS_KEYS.includes(m.key));

  const pulseStats = PULSE_KEYS
    .filter((key) => hasModuleAccess(permissions, key) && snippets[key])
    .map((key) => {
      const mod = ALL_MODULES.find((m) => m.key === key)!;
      return { key, label: mod.label, value: snippets[key]! };
    });
  const showPulse = permissions.global_role === "owner" && pulseStats.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-7)" }}>
      {/* Greeting hero */}
      <div
        style={{
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line)",
          background: "var(--surface)",
          padding: "var(--s-6) var(--s-6)",
        }}
      >
        <span className="eyebrow" style={{ color: "var(--fg-4)", display: "block", marginBottom: 8 }}>
          {today}
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: 40,
            fontWeight: 400,
            fontStyle: "italic",
            color: "var(--fg)",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.005em",
            lineHeight: 1.05,
          }}
        >
          {timeGreeting()}, {firstName}.
        </h1>
        <p
          className="script"
          style={{
            margin: 0,
            marginTop: 10,
            fontSize: 28,
            color: "var(--bronze)",
            lineHeight: 1,
          }}
        >
          {totalAlerts > 0
            ? `${totalAlerts} item${totalAlerts !== 1 ? "s" : ""} need your eye today.`
            : "Everything looks good — sharp eye today."}
        </p>
      </div>

      {/* Needs attention */}
      {totalAlerts > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
          <p className="eyebrow" style={{ color: "var(--fg-4)" }}>Needs attention</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-3)" }}>
            {Object.entries(alerts).map(([key, alert]) => {
              const mod = ALL_MODULES.find((m) => m.key === key);
              if (!mod) return null;
              const Icon = mod.icon;
              return (
                <Link
                  key={key}
                  href={mod.href}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--s-3)",
                    borderRadius: "var(--r-lg)",
                    border: "1px solid var(--warn)",
                    background: "var(--warn-soft)",
                    padding: "var(--s-3) var(--s-4)",
                    color: "var(--warn)",
                    textDecoration: "none",
                    transition: "opacity var(--dur) var(--ease)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <div
                    style={{
                      width: 32, height: 32, flexShrink: 0,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "var(--r-sm)",
                      background: "rgba(0,0,0,0.06)",
                    }}
                  >
                    <Icon style={{ width: 16, height: 16 }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>{mod.label}</span>
                    <span style={{ fontSize: 12, lineHeight: 1, opacity: 0.8 }}>{alert.label}</span>
                  </div>
                  <ArrowRightIcon style={{ width: 13, height: 13, marginLeft: 4, opacity: 0.6, flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's pulse (owner only) */}
      {showPulse && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--s-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-6)", flexWrap: "wrap" }}>
            {pulseStats.map(({ key, label, value }) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
        {/* Operations tier */}
        {operationsModules.length > 0 && (
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-4)", display: "block" }}>Operations</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--s-3)" }}>
              {operationsModules.map((mod) => {
                const Icon = mod.icon;
                const alert = alerts[mod.key];
                const snippet = snippets[mod.key];
                return (
                  <Link
                    key={mod.key}
                    href={mod.href}
                    style={{ textDecoration: "none" }}
                    className="group"
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--s-4)",
                        borderRadius: "var(--r-lg)",
                        border: `1px solid ${alert ? "var(--warn)" : "var(--line)"}`,
                        background: alert ? "var(--warn-soft)" : "var(--surface)",
                        padding: "var(--s-5)",
                        height: "100%",
                        transition: "all var(--dur-2) var(--ease)",
                        boxSizing: "border-box",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-2)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = "none";
                        (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      }}
                    >
                      {/* Icon + arrow */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div
                          style={{
                            width: 36, height: 36, flexShrink: 0,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            borderRadius: "var(--r-sm)",
                            background: alert ? "rgba(0,0,0,0.06)" : mod.accentBg,
                          }}
                        >
                          <Icon style={{ width: 16, height: 16, color: alert ? "var(--warn)" : mod.accentColor }} />
                        </div>
                        <ArrowRightIcon
                          style={{ width: 14, height: 14, color: "var(--fg-4)", flexShrink: 0, transition: "transform var(--dur) var(--ease)" }}
                          className="group-hover:translate-x-0.5"
                        />
                      </div>

                      {/* Content */}
                      <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: alert ? "var(--warn)" : "var(--fg)" }}>
                            {mod.label}
                          </span>
                          {alert && (
                            <span
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                borderRadius: "var(--r-pill)",
                                padding: "2px 6px",
                                fontSize: 10, fontWeight: 600,
                                background: "rgba(0,0,0,0.1)",
                                color: "var(--warn)",
                              }}
                            >
                              <AlertTriangleIcon style={{ width: 10, height: 10 }} />
                              {alert.count}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, lineHeight: 1.5, color: alert ? "var(--warn)" : "var(--fg-4)", margin: 0 }}>
                          {mod.description}
                        </p>
                      </div>

                      {/* Footer */}
                      <div style={{ borderTop: `1px solid ${alert ? "rgba(0,0,0,0.1)" : "var(--line)"}`, paddingTop: "var(--s-3)" }}>
                        {alert ? (
                          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--warn)" }}>
                            {alert.label} →
                          </span>
                        ) : snippet ? (
                          <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-3)" }}>
                            {snippet}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>
                            Open {mod.label.toLowerCase()} →
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Tools tier */}
        {toolsModules.length > 0 && (
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-3)", display: "block" }}>Tools</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
              {toolsModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.key}
                    href={mod.href}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      borderRadius: "var(--r-lg)",
                      border: "1px solid var(--line)",
                      background: "var(--surface)",
                      padding: "var(--s-2) var(--s-3)",
                      fontSize: 13, color: "var(--fg)",
                      textDecoration: "none",
                      transition: "all var(--dur) var(--ease)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
                  >
                    <Icon style={{ width: 14, height: 14 }} />
                    <span>{mod.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
