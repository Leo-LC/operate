import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Methodology — Challenges" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--fg)]">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-0.5 items-baseline">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">{label}</span>
      <span className="text-xs text-[var(--fg-2)]">{children}</span>
    </div>
  );
}

function MetricCard({
  title,
  gated,
  bonus,
  children,
}: {
  title: string;
  gated: boolean;
  bonus: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <span className="text-sm font-medium text-[var(--fg)]">{title}</span>
        <div className="flex items-center gap-2">
          {gated && (
            <span className="rounded-[var(--r-sm)] bg-[var(--bronze-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--bronze-2)]">
              Revenue gate
            </span>
          )}
          <span className="font-mono text-xs tabular-nums text-[var(--good)]">{bonus}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 px-4 py-3">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-[var(--bg-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--fg)]">
      {children}
    </code>
  );
}

export default async function MethodologyPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "owner") redirect("/challenges/overview");

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <p className="text-sm text-[var(--fg-3)]">
        This page describes how each metric is computed — which database fields are read, what formula
        is applied, and what threshold must be met to earn the bonus.
      </p>

      {/* Revenue gate */}
      <Section title="Revenue gate">
        <MetricCard title="Monthly revenue (net incl. VAT)" gated={false} bonus="Gate only — no direct bonus">
          <Field label="DB table"><Code>daily_entries</Code></Field>
          <Field label="Formula">
            <Code>
              sales_drinks_net + sales_ticket_net + sales_snack_net + sales_goodies_net + sales_card_surcharge + vat_7
            </Code>
            {" "}<span className="text-[var(--fg-3)]">summed over all days in the month for the shop</span>
          </Field>
          <Field label="Thresholds">
            <span className="font-mono text-xs text-[var(--fg-2)]">
              Samui / Ekkamai / Silom: 1,200,000 ฿ &nbsp;|&nbsp;
              Pattaya / Chiang Mai: 900,000 ฿ &nbsp;|&nbsp;
              Phangan: 700,000 ฿
            </span>
          </Field>
          <Field label="Effect">
            Snacks, Average basket, Opex, and both Reviews metrics are only awarded if the shop clears
            its revenue threshold. Merchandising is always active regardless.
          </Field>
        </MetricCard>
      </Section>

      {/* Merchandising */}
      <Section title="Metrics">
        <MetricCard title="Merchandising (goodies)" gated={false} bonus="up to 5,000 ฿">
          <Field label="DB table"><Code>daily_entries</Code></Field>
          <Field label="Formula">
            <Code>sales_goodies_net / salesNetIncVat</Code>
          </Field>
          <Field label="Tiers">
            <span className="font-mono text-xs text-[var(--fg-2)]">
              ≥ 7% → 1,500 ฿ &nbsp;|&nbsp; ≥ 8% → 3,000 ฿ &nbsp;|&nbsp; ≥ 9% → 5,000 ฿
            </span>
          </Field>
          <Field label="Gate">Not subject to the revenue gate.</Field>
        </MetricCard>

        <MetricCard title="Snacks" gated bonus="1,250 ฿">
          <Field label="DB table"><Code>location_entries</Code> (manual input)</Field>
          <Field label="Formula">
            <Code>snacks_sold / entry_count ≥ 0.45</Code>
          </Field>
          <Field label="Periods">
            Entries and snacks are recorded in three periods per month (1–10, 11–20, 21–end).
            The ratio uses the combined total across all three periods.
          </Field>
          <Field label="Input">
            Entered manually via the Overview page inputs; stored in{" "}
            <Code>location_entries(location_id, month, period, entry_count, snacks_sold)</Code>.
          </Field>
        </MetricCard>

        <MetricCard title="Average basket (Panier moyen)" gated bonus="1,250 ฿">
          <Field label="DB tables"><Code>daily_entries</Code> + <Code>location_entries</Code></Field>
          <Field label="Formula">
            <Code>(salesNetIncVat − salesTicketNet) / entry_count ≥ 190 ฿</Code>
          </Field>
          <Field label="salesTicketNet">
            <Code>SUM(sales_ticket_net)</Code> from <Code>daily_entries</Code> for the month.
            Ticket sales are excluded from the basket to focus on product revenue.
          </Field>
          <Field label="entry_count">
            Combined total from <Code>location_entries</Code> (manual input, same as Snacks).
          </Field>
        </MetricCard>

        <MetricCard title="Opex variable" gated bonus="1,250 ฿">
          <Field label="DB table"><Code>daily_entries</Code></Field>
          <Field label="Formula">
            <Code>(exp_drinks_cash + exp_animals_cash + exp_makro_bank) / salesNetIncVat {"<"} 9.5%</Code>
          </Field>
          <Field label="Note">
            Lower is better — the bonus is awarded when the opex ratio stays below the threshold.
          </Field>
        </MetricCard>

        <MetricCard title="Reviews — volume" gated bonus="625 ฿">
          <Field label="DB tables"><Code>reviews_cache</Code> + <Code>location_entries</Code></Field>
          <Field label="Formula">
            <Code>review_count_this_month / entry_count ≥ 4%</Code>
          </Field>
          <Field label="review_count">
            Rows in <Code>reviews_cache</Code> where <Code>create_time</Code> falls within the
            selected month. Each row is one Google review.
          </Field>
          <Field label="entry_count">
            Combined total from <Code>location_entries</Code> (manual input). Must be {">"} 0.
          </Field>
        </MetricCard>

        <MetricCard title="Reviews — rating" gated bonus="625 ฿">
          <Field label="DB tables"><Code>reviews_cache</Code> + <Code>location_gbp_ratings</Code></Field>
          <Field label="Target">
            <Code>target = MIN(4.5, ROUND(currentGBPRating + 0.1, 1))</Code>
            <span className="ml-1 text-[var(--fg-3)]">
              — the shop must improve on its live Google rating by at least 0.1 stars.
            </span>
          </Field>
          <Field label="Monthly avg">
            Average <Code>star_rating</Code> across all reviews in <Code>reviews_cache</Code> for
            the selected month.
          </Field>
          <Field label="Min reviews">
            At least 10 reviews must have been received during the month, otherwise the metric is
            treated as no data (shown as —).
          </Field>
          <Field label="currentGBPRating">
            Latest snapshot in <Code>location_gbp_ratings.average_rating</Code> — synced
            periodically from the Google Business Profile API.
          </Field>
        </MetricCard>
      </Section>

      {/* Location ID resolution */}
      <Section title="Location ID resolution">
        <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 flex flex-col gap-2.5">
          <p className="text-xs text-[var(--fg-2)]">
            Accounting rows in <Code>daily_entries</Code> store a UUID <Code>location_id</Code>.
            Reviews and ratings use the GBP path (e.g. <Code>accounts/123/locations/456</Code>) as their
            identifier. The <Code>locations</Code> table bridges the two via{" "}
            <Code>external_id</Code> (= GBP path).
          </p>
          <p className="text-xs text-[var(--fg-2)]">
            At query time, each UUID is translated to its GBP path so all data sources can be
            joined on a single canonical key. If no mapping exists, the UUID is used as a fallback.
            Location display names come from <Code>locations.name</Code> (admin-set), falling back
            to the GBP title.
          </p>
        </div>
      </Section>
    </div>
  );
}
