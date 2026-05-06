/**
 * One-time script: seeds March 2026 accounting data for Samui shop.
 * Run with: npx tsx scripts/seed-march-2026.ts
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (or .env.local).
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

// Days 1–13: sales + payments + expenses
// Days 14–31: payments + expenses only
// All days: cash_safe = 20000

type DayData = {
  sales_drinks_net?: number;
  sales_goodies_net?: number;
  payment_cash: number;
  payment_scan: number;
  payment_credit_card: number;
  exp_other_cash: number;
  cash_safe: number;
};

const DAYS: Array<{ day: number } & DayData> = [
  { day:  1, sales_drinks_net: 12400, sales_goodies_net: 3200, payment_cash: 8500,  payment_scan: 5300, payment_credit_card: 1800, exp_other_cash: 450,  cash_safe: 20000 },
  { day:  2, sales_drinks_net: 11800, sales_goodies_net: 2900, payment_cash: 7900,  payment_scan: 5100, payment_credit_card: 1700, exp_other_cash: 380,  cash_safe: 20000 },
  { day:  3, sales_drinks_net: 13200, sales_goodies_net: 3500, payment_cash: 9100,  payment_scan: 5600, payment_credit_card: 2000, exp_other_cash: 510,  cash_safe: 20000 },
  { day:  4, sales_drinks_net: 10900, sales_goodies_net: 2700, payment_cash: 7200,  payment_scan: 4800, payment_credit_card: 1600, exp_other_cash: 320,  cash_safe: 20000 },
  { day:  5, sales_drinks_net: 15100, sales_goodies_net: 4100, payment_cash: 10200, payment_scan: 6400, payment_credit_card: 2500, exp_other_cash: 620,  cash_safe: 20000 },
  { day:  6, sales_drinks_net: 16800, sales_goodies_net: 4500, payment_cash: 11300, payment_scan: 7100, payment_credit_card: 2900, exp_other_cash: 710,  cash_safe: 20000 },
  { day:  7, sales_drinks_net: 14500, sales_goodies_net: 3900, payment_cash: 9800,  payment_scan: 6000, payment_credit_card: 2600, exp_other_cash: 590,  cash_safe: 20000 },
  { day:  8, sales_drinks_net: 12100, sales_goodies_net: 3100, payment_cash: 8200,  payment_scan: 5200, payment_credit_card: 1800, exp_other_cash: 410,  cash_safe: 20000 },
  { day:  9, sales_drinks_net: 11500, sales_goodies_net: 2800, payment_cash: 7700,  payment_scan: 4900, payment_credit_card: 1700, exp_other_cash: 360,  cash_safe: 20000 },
  { day: 10, sales_drinks_net: 13800, sales_goodies_net: 3700, payment_cash: 9500,  payment_scan: 5800, payment_credit_card: 2200, exp_other_cash: 530,  cash_safe: 20000 },
  { day: 11, sales_drinks_net: 12700, sales_goodies_net: 3300, payment_cash: 8600,  payment_scan: 5400, payment_credit_card: 2000, exp_other_cash: 460,  cash_safe: 20000 },
  { day: 12, sales_drinks_net: 14200, sales_goodies_net: 3800, payment_cash: 9700,  payment_scan: 6100, payment_credit_card: 2400, exp_other_cash: 570,  cash_safe: 20000 },
  { day: 13, sales_drinks_net: 15500, sales_goodies_net: 4200, payment_cash: 10500, payment_scan: 6600, payment_credit_card: 2600, exp_other_cash: 650,  cash_safe: 20000 },
  { day: 14, payment_cash: 8800,  payment_scan: 5500, payment_credit_card: 1900, exp_other_cash: 400,  cash_safe: 20000 },
  { day: 15, payment_cash: 9200,  payment_scan: 5800, payment_credit_card: 2100, exp_other_cash: 420,  cash_safe: 20000 },
  { day: 16, payment_cash: 7500,  payment_scan: 4700, payment_credit_card: 1500, exp_other_cash: 300,  cash_safe: 20000 },
  { day: 17, payment_cash: 10100, payment_scan: 6300, payment_credit_card: 2400, exp_other_cash: 500,  cash_safe: 20000 },
  { day: 18, payment_cash: 11400, payment_scan: 7000, payment_credit_card: 2800, exp_other_cash: 680,  cash_safe: 20000 },
  { day: 19, payment_cash: 9800,  payment_scan: 6100, payment_credit_card: 2200, exp_other_cash: 550,  cash_safe: 20000 },
  { day: 20, payment_cash: 12500, payment_scan: 7800, payment_credit_card: 3100, exp_other_cash: 740,  cash_safe: 20000 },
  { day: 21, payment_cash: 11800, payment_scan: 7200, payment_credit_card: 2900, exp_other_cash: 690,  cash_safe: 20000 },
  { day: 22, payment_cash: 8400,  payment_scan: 5200, payment_credit_card: 1700, exp_other_cash: 380,  cash_safe: 20000 },
  { day: 23, payment_cash: 8900,  payment_scan: 5500, payment_credit_card: 1900, exp_other_cash: 410,  cash_safe: 20000 },
  { day: 24, payment_cash: 9600,  payment_scan: 6000, payment_credit_card: 2100, exp_other_cash: 470,  cash_safe: 20000 },
  { day: 25, payment_cash: 10800, payment_scan: 6700, payment_credit_card: 2500, exp_other_cash: 560,  cash_safe: 20000 },
  { day: 26, payment_cash: 11200, payment_scan: 6900, payment_credit_card: 2700, exp_other_cash: 610,  cash_safe: 20000 },
  { day: 27, payment_cash: 13100, payment_scan: 8100, payment_credit_card: 3200, exp_other_cash: 780,  cash_safe: 20000 },
  { day: 28, payment_cash: 14500, payment_scan: 8900, payment_credit_card: 3600, exp_other_cash: 850,  cash_safe: 20000 },
  { day: 29, payment_cash: 12800, payment_scan: 7900, payment_credit_card: 3000, exp_other_cash: 720,  cash_safe: 20000 },
  { day: 30, payment_cash: 11600, payment_scan: 7200, payment_credit_card: 2800, exp_other_cash: 650,  cash_safe: 20000 },
  { day: 31, payment_cash: 13400, payment_scan: 8300, payment_credit_card: 3300, exp_other_cash: 800,  cash_safe: 20000 },
];

async function main() {
  // Find Samui location
  const { data: locations, error: locErr } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", ORG_ID)
    .ilike("name", "%samui%")
    .is("deleted_at", null)
    .limit(1);

  if (locErr || !locations || locations.length === 0) {
    console.error("Could not find Samui location:", locErr?.message ?? "no results");
    process.exit(1);
  }

  const locationId = (locations[0] as { id: string; name: string }).id;
  console.log(`Seeding March 2026 for location: ${(locations[0] as { id: string; name: string }).name} (${locationId})`);

  let ok = 0;
  let skip = 0;

  for (const d of DAYS) {
    const entryDate = `2026-03-${String(d.day).padStart(2, "0")}`;
    const payload = {
      organization_id: ORG_ID,
      location_id: locationId,
      entry_date: entryDate,
      sales_drinks_net:    d.sales_drinks_net ?? 0,
      sales_goodies_net:   d.sales_goodies_net ?? 0,
      payment_cash:        d.payment_cash,
      payment_scan:        d.payment_scan,
      payment_credit_card: d.payment_credit_card,
      exp_other_cash:      d.exp_other_cash,
      cash_safe:           d.cash_safe,
    };

    const { error } = await supabase
      .from("daily_entries")
      .upsert(payload, { onConflict: "location_id,entry_date" });

    if (error) {
      console.warn(`  Day ${d.day}: ${error.message}`);
      skip++;
    } else {
      console.log(`  ✓ ${entryDate}`);
      ok++;
    }
  }

  console.log(`\nDone: ${ok} inserted/updated, ${skip} errors`);
}

void main();
