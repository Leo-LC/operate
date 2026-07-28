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
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.raw}
            className="flex items-center justify-between gap-4 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm"
          >
            <span className="truncate text-[var(--fg-2)]">{item.raw || "(empty)"}</span>
            <span className="mono shrink-0 tabular-nums text-[var(--fg-4)]">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UnmatchedReviewPanel({ shops, channels, countries }: UnmatchedReviewPanelProps) {
  const hasAny = shops.length > 0 || channels.length > 0 || countries.length > 0;
  if (!hasAny) return null;

  return (
    <details className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <summary className="cursor-pointer text-sm font-medium text-[var(--fg-2)]">
        Other / Review — unclassified raw values
      </summary>
      <p className="mt-2 mb-4 text-xs text-[var(--fg-4)]">
        These form answers did not match a known shop, channel, or country alias. Use this list to
        extend normalization rules over time.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        <UnmatchedSection title="Shops" items={shops} />
        <UnmatchedSection title="Discovery channels" items={channels} />
        <UnmatchedSection title="Countries" items={countries} />
      </div>
    </details>
  );
}
