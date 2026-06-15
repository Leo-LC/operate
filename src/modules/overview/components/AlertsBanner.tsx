"use client";

import Link from "next/link";
import type { OverviewAlert } from "@/app/api/overview/cards/route";

const PRIORITY_CONFIG = {
  critical: {
    label: "Critical",
    bg: "var(--bad-soft)",
    border: "var(--bad)",
    text: "var(--bad)",
    dot: "var(--bad)",
    badgeBg: "var(--bad)",
  },
  warning: {
    label: "Warning",
    bg: "var(--warn-soft)",
    border: "var(--warn)",
    text: "var(--warn)",
    dot: "var(--warn)",
    badgeBg: "var(--warn)",
  },
  pending: {
    label: "Pending",
    bg: "var(--info-soft)",
    border: "var(--info)",
    text: "var(--info)",
    dot: "var(--info)",
    badgeBg: "var(--info)",
  },
} as const;

function countByPriority(alerts: OverviewAlert[]) {
  return {
    critical: alerts.filter((a) => a.priority === "critical").length,
    warning: alerts.filter((a) => a.priority === "warning").length,
    pending: alerts.filter((a) => a.priority === "pending").length,
  };
}

export function AlertsBanner({ alerts }: { alerts: OverviewAlert[] }) {
  const counts = countByPriority(alerts);

  return (
    <div
      style={{
        borderRadius: "var(--r-md)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {/* Summary row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface-2)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3)", marginRight: 4 }}>
          Needs attention
        </span>
        {counts.critical > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: "var(--r-pill)",
              background: PRIORITY_CONFIG.critical.badgeBg,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {counts.critical} critical
          </span>
        )}
        {counts.warning > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: "var(--r-pill)",
              background: PRIORITY_CONFIG.warning.badgeBg,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {counts.warning} warning{counts.warning !== 1 ? "s" : ""}
          </span>
        )}
        {counts.pending > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: "var(--r-pill)",
              background: PRIORITY_CONFIG.pending.badgeBg,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {counts.pending} pending
          </span>
        )}
      </div>

      {/* Alert rows */}
      <div>
        {alerts.map((alert, i) => {
          const cfg = PRIORITY_CONFIG[alert.priority];
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "88px 1fr auto auto",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                borderTop: i === 0 ? undefined : "1px solid var(--line)",
                borderLeft: `3px solid ${cfg.border}`,
                background: i % 2 === 0 ? "transparent" : "var(--surface-2)",
              }}
            >
              {/* Priority badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: cfg.text,
                }}
              >
                {cfg.label}
              </span>

              {/* Description */}
              <span style={{ fontSize: 13, color: "var(--fg-2)", minWidth: 0 }}>
                {alert.label}
              </span>

              {/* Shop */}
              <span
                style={{
                  fontSize: 12,
                  color: "var(--fg-4)",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                {alert.shop}
              </span>

              {/* Action */}
              <Link
                href={alert.href}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--bronze)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  padding: "3px 10px",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  transition: "border-color var(--dur) var(--ease)",
                }}
                className="hover:!border-[var(--line-strong)]"
              >
                Open →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
