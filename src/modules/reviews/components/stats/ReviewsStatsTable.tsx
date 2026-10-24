"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import type { ShopStats } from "../../lib/stats";
import { ReviewsStatsTrend } from "./ReviewsStatsTrend";

const STAR_COLORS = ["var(--bad)", "var(--bad-muted)", "var(--warn)", "var(--good-muted)", "var(--good)"];

type SortKey = "count" | "avg" | "replyRate";

const BAR_GRANULARITY: Record<string, "day" | "week" | "month"> = {
  "7d": "day",
  "30d": "week",
  "90d": "week",
  "12m": "month",
};

function fmt1(n: number | null): string {
  return n == null ? "—" : (Math.round(n * 10) / 10).toFixed(1);
}

function fmtPct(n: number | null): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

/** Signed pct change vs the prior window; ↑ is "more". */
function DeltaPill({ current, prior, betterWhenUp = true }: { current: number | null; prior: number | null; betterWhenUp?: boolean }) {
  if (current == null || prior == null) return null;
  const diff = current - prior;
  if (Math.abs(diff) < 0.001) {
    return <span style={{ fontSize: 11, color: "var(--fg-4)" }}>· no change</span>;
  }
  const up = diff > 0;
  const good = up === betterWhenUp;
  const sign = up ? "+" : "";
  return (
    <span
      className="tabular-nums"
      style={{ fontSize: 11, fontWeight: 500, color: good ? "var(--good)" : "var(--bad)" }}
    >
      {sign}
      {Math.abs(diff) < 1 ? Math.round(diff * 10) / 10 : Math.round(diff)}
    </span>
  );
}

function PctDelta({ current, prior }: { current: number; prior: number }) {
  if (prior === 0) {
    return current > 0 ? (
      <span style={{ fontSize: 11, color: "var(--good)" }}>+{current} new</span>
    ) : <span style={{ fontSize: 11, color: "var(--fg-4)" }}>·</span>;
  }
  const pct = Math.round(((current - prior) / prior) * 100);
  if (pct === 0) return <span style={{ fontSize: 11, color: "var(--fg-4)" }}>· no change</span>;
  return (
    <span
      style={{ fontSize: 11, fontWeight: 500, color: pct > 0 ? "var(--good)" : "var(--bad)" }}
    >
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function DistributionBar({ distribution, count }: { distribution: ShopStats["distribution"]; count: number }) {
  if (count === 0) return <span style={{ color: "var(--fg-4)", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", gap: 2, minWidth: 96, maxWidth: 140 }} title={[1, 2, 3, 4, 5].map((s, i) => `${s}★: ${distribution[i]}`).join(" · ")}>
      {distribution.map((n, i) => (
        <div
          key={i}
          style={{
            height: 8,
            flexGrow: n,
            flexBasis: 0,
            minWidth: n > 0 ? 3 : 0,
            background: STAR_COLORS[i],
            borderRadius: 2,
            opacity: n > 0 ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  shops: ShopStats[];
  preset: "7d" | "30d" | "90d" | "12m";
  loading: boolean;
}

const thStyle = {
  textAlign: "left" as const,
  fontSize: 10,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
  fontWeight: 500,
  color: "var(--fg-4)",
  padding: "6px 10px",
  userSelect: "none" as const,
};

const tdStyle = {
  fontSize: 13,
  padding: "9px 10px",
  borderTop: "1px solid var(--line)",
  whiteSpace: "nowrap" as const,
};

export function ReviewsStatsTable({ shops, preset, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const val = (s: ShopStats): number | null =>
      sortKey === "count" ? s.count : sortKey === "avg" ? s.avg : s.replyRate;
    return [...shops].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va == null && vb == null) return a.title.localeCompare(b.title);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * sortDir || a.title.localeCompare(b.title);
    });
  }, [shops, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--line)] p-4">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
          ))}
        </div>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] p-6 text-[var(--fg-4)]"
        style={{ fontSize: 13 }}
      >
        No shop data synced yet.
      </div>
    );
  }

  const sortIcon = (key: SortKey) => (sortKey === key ? (sortDir === 1 ? " ↑" : " ↓") : "");

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] overflow-x-auto">
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            <th style={{ ...thStyle, cursor: "default" }}>Shop</th>
            <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("count")}>Reviews{sortIcon("count")}</th>
            <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("avg")}>Avg rating{sortIcon("avg")}</th>
            <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("replyRate")}>Replied{sortIcon("replyRate")}</th>
            <th style={{ ...thStyle, cursor: "default" }}>Ratings 1★–5★</th>
            <th style={{ ...thStyle, cursor: "default", width: 34 }} aria-label="Expand" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const isOpen = expanded.has(s.key);
            return (
              <FragmentRow
                key={s.key}
                shop={s}
                isOpen={isOpen}
                onToggle={() => toggleExpand(s.key)}
                granularity={BAR_GRANULARITY[preset]}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ shop, isOpen, onToggle, granularity }: {
  shop: ShopStats;
  isOpen: boolean;
  onToggle: () => void;
  granularity: "day" | "week" | "month";
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: "pointer", background: isOpen ? "var(--row-hover)" : "transparent" }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = "var(--row-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isOpen ? "var(--row-hover)" : "transparent"; }}
      >
        <td style={tdStyle}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
            {isOpen ? <ChevronDownIcon size={13} color="var(--fg-3)" /> : <ChevronRightIcon size={13} color="var(--fg-4)" />}
            {shop.title}
          </span>
        </td>
        <td style={tdStyle} className="mono tabular-nums">
          <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 600 }}>{shop.count}</span>
            <PctDelta current={shop.count} prior={shop.priorCount} />
          </span>
        </td>
        <td style={tdStyle} className="mono tabular-nums">
          <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 600 }}>{fmt1(shop.avg)}</span>
            <DeltaPill current={shop.avg} prior={shop.priorAvg} />
          </span>
        </td>
        <td style={tdStyle} className="tabular-nums">
          <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
            <span>{fmtPct(shop.replyRate)}</span>
          </span>
        </td>
        <td style={tdStyle}>
          <DistributionBar distribution={shop.distribution} count={shop.count} />
        </td>
        <td style={{ ...tdStyle, color: "var(--fg-4)", fontSize: 11 }}>
          {isOpen ? "Hide" : "Chart"}
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={6} style={{ borderBottom: "1px solid var(--line)", padding: "8px 12px 12px", background: "var(--surface)" }}>
            <ReviewsStatsTrend
              points={shop.points}
              total={shop.count}
              loading={false}
              bucket={granularity}
              height={160}
            />
          </td>
        </tr>
      )}
    </>
  );
}
