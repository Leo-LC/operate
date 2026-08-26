interface ReviewsData {
  count: number;
  avgRating: number;
  byRating: Record<1 | 2 | 3 | 4 | 5, number>;
}

interface ReviewsSummaryProps {
  data: ReviewsData | null;
  loading: boolean;
}

function StatCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">{label}</span>
      {loading ? (
        <div className="h-8 w-20 animate-pulse rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
      ) : (
        <>
          <span className="font-mono text-2xl tabular-nums text-[var(--fg)]">{value}</span>
          {sub && <span className="text-xs text-[var(--fg-4)]">{sub}</span>}
        </>
      )}
    </div>
  );
}

export function ReviewsSummary({ data, loading }: ReviewsSummaryProps) {
  const avgLabel = data && data.avgRating > 0 ? data.avgRating.toFixed(1) : "—";
  const fiveStars = data?.byRating[5] ?? 0;
  const lowStars = data ? (data.byRating[1] ?? 0) + (data.byRating[2] ?? 0) : 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Total reviews"
        value={loading || !data ? "—" : String(data.count)}
        loading={loading}
      />
      <StatCard
        label="Average rating"
        value={loading ? "—" : avgLabel}
        sub={data && data.count > 0 ? `from ${data.count} reviews` : undefined}
        loading={loading}
      />
      <StatCard
        label="5★ reviews"
        value={loading ? "—" : String(fiveStars)}
        sub={data && data.count > 0 ? `${Math.round((fiveStars / data.count) * 100)}% of total` : undefined}
        loading={loading}
      />
      <StatCard
        label="Needs attention"
        value={loading ? "—" : String(lowStars)}
        sub="1★ and 2★ reviews"
        loading={loading}
      />
    </div>
  );
}
