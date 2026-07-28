/**
 * One-off integration test — run: node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/test-customer-insights.ts
 */
import { fetchFormResponses } from "../src/modules/customer-insights/lib/fetch-sheet";
import { aggregateFormResponses } from "../src/modules/customer-insights/lib/aggregate";

async function main() {
  const rows = await fetchFormResponses(true);
  const summary = aggregateFormResponses(
    rows,
    { from: null, to: null, shop: "all" },
    { configured: true, lastFetchedAt: new Date().toISOString() },
  );

  console.log("Customer Insights integration test OK");
  console.log(`  Rows fetched: ${rows.length}`);
  console.log(`  Total submissions: ${summary.totalSubmissions}`);
  console.log(`  Shops: ${summary.byShop.map((s) => `${s.label} (${s.count})`).join(", ") || "none"}`);
  console.log(`  Channels: ${summary.byChannel.length}`);
  console.log(`  Countries: ${summary.topCountries.length}`);
  console.log(`  Weeks: ${summary.byWeek.length}`);
}

main().catch((err) => {
  console.error("Customer Insights integration test FAILED");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
