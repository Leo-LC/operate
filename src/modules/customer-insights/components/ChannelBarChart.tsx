"use client";

import { Panel, PanelBody, PanelFoot, PanelHead, PanelTitle } from "@/components/ui/panel";
import { FORM_CHANNEL_CHOICES } from "../normalize/channel";

interface ChannelBarChartProps {
  data: { label: string; count: number }[];
  loading: boolean;
}

/**
 * Discovery channels ranked by responses. One accent for every bar keeps the
 * comparison honest; the length already carries the magnitude.
 */
export function ChannelBarChart({ data, loading }: ChannelBarChartProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const maxCount = Math.max(...data.map((row) => row.count), 1);
  const splitAt = Math.ceil(data.length / 2);
  const columns = data.length > 4 ? [data.slice(0, splitAt), data.slice(splitAt)] : [data];

  return (
    <Panel>
      <PanelHead>
        <PanelTitle>Discovery channels</PanelTitle>
      </PanelHead>

      <PanelBody flush>
        {loading ? (
          <div className="ci-skeleton-list" aria-hidden>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="ci-skeleton-row animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="ci-empty-chart">No data for this period.</div>
        ) : (
          <div className="ci-channel-cols">
            {columns.map((rows, columnIndex) => (
              <div className="ci-channel-col" key={columnIndex}>
                <div className="ci-channel-head" aria-hidden>
                  <span>Channel</span>
                  <span />
                  <span>#</span>
                  <span>%</span>
                </div>
                <ul className="ci-channel-list">
                  {rows.map((row) => {
                    const share = total > 0 ? (row.count / total) * 100 : 0;
                    return (
                      <li className="ci-channel-row" key={row.label}>
                        <span className="ci-channel-name" title={row.label}>
                          {row.label}
                        </span>
                        <span className="ci-channel-track" aria-hidden>
                          <span
                            className="ci-channel-fill"
                            style={{ width: `${(row.count / maxCount) * 100}%` }}
                          />
                        </span>
                        <span className="ci-channel-count">
                          {row.count.toLocaleString()}
                          <span className="sr-only"> responses</span>
                        </span>
                        <span className="ci-channel-pct">{share.toFixed(1)}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </PanelBody>

      {!loading && data.length > 0 && (
        <PanelFoot>
          {total.toLocaleString()} classified {total === 1 ? "response" : "responses"} ·{" "}
          {data.length} of {FORM_CHANNEL_CHOICES.length} channels
        </PanelFoot>
      )}
    </Panel>
  );
}
