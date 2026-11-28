"use client";

import type { UnmatchedBucket } from "../types";

interface UnmatchedReviewPanelProps {
  shops: UnmatchedBucket[];
  channels: UnmatchedBucket[];
  countries: UnmatchedBucket[];
}

function UnmatchedSection({ title, items }: { title: string; items: UnmatchedBucket[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="ci-unmatched-title">{title}</h3>
      <ul className="ci-unmatched-list">
        {items.map((item) => (
          <li key={item.raw}>
            <span className="ci-unmatched-raw" title={item.raw || "(empty)"}>
              {item.raw || "(empty)"}
            </span>
            <span className="ci-unmatched-count">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Maintenance list for raw form answers that did not match a known alias.
 * Collapsed by default because it is only needed when extending normalization.
 */
export function UnmatchedReviewPanel({ shops, channels, countries }: UnmatchedReviewPanelProps) {
  const total = shops.length + channels.length + countries.length;
  if (total === 0) return null;

  return (
    <details className="ci-unmatched">
      <summary className="ci-unmatched-summary">
        <span className="ci-unmatched-heading">Other / Review — unclassified raw values</span>
        <span className="ci-unmatched-badge">
          {total} {total === 1 ? "value" : "values"}
        </span>
      </summary>
      <div className="ci-unmatched-body">
        <p className="ci-unmatched-copy">
          These form answers did not match a known shop, channel, or country alias. Use this list
          to extend normalization rules over time.
        </p>
        <div className="ci-unmatched-grid">
          <UnmatchedSection title="Shops" items={shops} />
          <UnmatchedSection title="Discovery channels" items={channels} />
          <UnmatchedSection title="Countries" items={countries} />
        </div>
      </div>
    </details>
  );
}
