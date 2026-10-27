"use client";

import {
  Panel,
  PanelBody,
  PanelFoot,
  PanelHead,
  PanelSub,
  PanelTitle,
} from "@/components/ui/panel";

interface HorizontalBarChartProps {
  title: string;
  data: { label: string; count: number }[];
  loading: boolean;
  emptyMessage?: string;
  onItemClick?: (label: string) => void;
  /** Only rows that can actually change the filter become buttons. */
  isClickable?: (label: string) => boolean;
  clickHint?: string;
  itemNoun?: string;
}

/**
 * Labelled horizontal bars for ranked categories. Counts sit beside each bar
 * so the values stay readable without hovering or reading an axis.
 */
export function HorizontalBarChart({
  title,
  data,
  loading,
  emptyMessage = "No data for this period.",
  onItemClick,
  isClickable,
  clickHint,
  itemNoun = "entries",
}: HorizontalBarChartProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const maxCount = Math.max(...data.map((row) => row.count), 1);

  return (
    <Panel>
      <PanelHead>
        <div>
          <PanelTitle>{title}</PanelTitle>
          {onItemClick && clickHint && <PanelSub>{clickHint}</PanelSub>}
        </div>
      </PanelHead>

      <PanelBody flush>
        {loading ? (
          <div className="ci-skeleton-list" aria-hidden>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="ci-skeleton-row animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="ci-empty-chart">{emptyMessage}</div>
        ) : (
          <ul className="ci-bars">
            {data.map((row) => {
              const clickable = !!onItemClick && (isClickable ? isClickable(row.label) : true);
              const content = (
                <>
                  <span className="ci-bar-label" title={row.label}>
                    {row.label}
                  </span>
                  <span className="ci-bar-track" aria-hidden>
                    <span
                      className="ci-bar-fill"
                      style={{ width: `${(row.count / maxCount) * 100}%` }}
                    />
                  </span>
                  <span className="ci-bar-count">{row.count.toLocaleString()}</span>
                </>
              );

              return (
                <li key={row.label}>
                  {clickable ? (
                    <button
                      type="button"
                      className="ci-bar-row"
                      onClick={() => onItemClick?.(row.label)}
                      aria-label={`Filter by ${row.label}, ${row.count.toLocaleString()} responses`}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="ci-bar-row">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PanelBody>

      {!loading && data.length > 0 && (
        <PanelFoot>
          {total.toLocaleString()} responses · {data.length} {itemNoun}
        </PanelFoot>
      )}
    </Panel>
  );
}
