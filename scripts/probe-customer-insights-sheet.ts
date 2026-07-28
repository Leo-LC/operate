/**
 * Debug helper — logs sheet tabs and header rows.
 * Run: npx tsx scripts/probe-customer-insights-sheet.ts
 */
import { getOrganizationAccessToken } from "../src/lib/google-token";
import { DEFAULT_SHEET_ID, DEFAULT_SHEET_TAB } from "../src/modules/customer-insights/types";

async function main() {
  const token = await getOrganizationAccessToken();
  if (!token) {
    console.error("No Google OAuth token — sign in with Google first.");
    process.exit(1);
  }

  const sheetId = process.env.CUSTOMER_INSIGHTS_SHEET_ID ?? DEFAULT_SHEET_ID;
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = (await metaRes.json()) as { sheets?: { properties?: { title?: string } }[] };
  console.log("Tabs:", meta.sheets?.map((s) => s.properties?.title).join(", "));

  const tab = process.env.CUSTOMER_INSIGHTS_SHEET_TAB ?? DEFAULT_SHEET_TAB;
  const range = encodeURIComponent(`'${tab}'!1:5`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.json()) as { values?: string[][] };
  console.log(`First rows of "${tab}":`);
  (data.values ?? []).forEach((row, i) => console.log(`  Row ${i}:`, row));
}

main().catch(console.error);
