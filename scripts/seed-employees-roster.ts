/**
 * One-time script: seeds the staff roster from the August 2026 spreadsheet
 * (each populated cell = one employee at one shop with that shop's salary).
 *
 * Run with: npx tsx scripts/seed-employees-roster.ts [--force]
 * Add --force to re-run even if a previous seed was detected.
 * Use --dry-run to print the plan without writing anything.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (or .env.local).
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const SEED_MARKER = "Roster seed Aug 2026 — placeholder, rename to real name";

// Sheet column key -> expected location name. Phuket maps to the existing "Laguna"
// location (the sheet calls it Phuket; the app knows it as Laguna / Phuket Laguna).
const COLUMN_LOCATION: Record<string, string> = {
  Samui: "Samui",
  Phangan: "Phangan",
  Ekkamai: "Ekkamai",
  Silom: "Silom",
  Pattaya: "Pattaya",
  "Chiang Mai": "Chiang Mai",
  Resort: "Resort",
  Phuket: "Laguna",
};

type RosterEntry = {
  first_name: string;
  last_name: string;
  // one assignment per populated cell
  assignments: Array<{ shop: string; salary: number }>;
};

const ROSTER: RosterEntry[] = [
  // Staff 1 — separate employee per shop
  { first_name: "Staff 1", last_name: "Ekkamai", assignments: [{ shop: "Ekkamai", salary: 18000 }] },
  { first_name: "Staff 1", last_name: "Silom", assignments: [{ shop: "Silom", salary: 18000 }] },
  { first_name: "Staff 1", last_name: "Pattaya", assignments: [{ shop: "Pattaya", salary: 18000 }] },
  { first_name: "Staff 1", last_name: "Chiang Mai", assignments: [{ shop: "Chiang Mai", salary: 15000 }] },
  { first_name: "Staff 1", last_name: "Resort", assignments: [{ shop: "Resort", salary: 18000 }] },
  { first_name: "Staff 1", last_name: "Phuket", assignments: [{ shop: "Phuket", salary: 15000 }] },
  { first_name: "Staff 1", last_name: "Samui", assignments: [{ shop: "Samui", salary: 15000 }] },
  // Staff 2
  { first_name: "Staff 2", last_name: "Ekkamai", assignments: [{ shop: "Ekkamai", salary: 18000 }] },
  { first_name: "Staff 2", last_name: "Silom", assignments: [{ shop: "Silom", salary: 18000 }] },
  { first_name: "Staff 2", last_name: "Chiang Mai", assignments: [{ shop: "Chiang Mai", salary: 15000 }] },
  { first_name: "Staff 2", last_name: "Resort", assignments: [{ shop: "Resort", salary: 15000 }] },
  { first_name: "Staff 2", last_name: "Phuket", assignments: [{ shop: "Phuket", salary: 15000 }] },
  { first_name: "Staff 2", last_name: "Samui", assignments: [{ shop: "Samui", salary: 15000 }] },
  // Staff 3
  { first_name: "Staff 3", last_name: "Ekkamai", assignments: [{ shop: "Ekkamai", salary: 15000 }] },
  { first_name: "Staff 3", last_name: "Silom", assignments: [{ shop: "Silom", salary: 15000 }] },
  { first_name: "Staff 3", last_name: "Pattaya", assignments: [{ shop: "Pattaya", salary: 15000 }] },
  { first_name: "Staff 3", last_name: "Chiang Mai", assignments: [{ shop: "Chiang Mai", salary: 15000 }] },
  { first_name: "Staff 3", last_name: "Resort", assignments: [{ shop: "Resort", salary: 12000 }] },
  { first_name: "Staff 3", last_name: "Phuket", assignments: [{ shop: "Phuket", salary: 15000 }] },
  { first_name: "Staff 3", last_name: "Samui", assignments: [{ shop: "Samui", salary: 12000 }] },
  // Staff 4
  { first_name: "Staff 4", last_name: "Ekkamai", assignments: [{ shop: "Ekkamai", salary: 15000 }] },
  { first_name: "Staff 4", last_name: "Silom", assignments: [{ shop: "Silom", salary: 15000 }] },
  { first_name: "Staff 4", last_name: "Pattaya", assignments: [{ shop: "Pattaya", salary: 15000 }] },
  { first_name: "Staff 4", last_name: "Chiang Mai", assignments: [{ shop: "Chiang Mai", salary: 15000 }] },
  { first_name: "Staff 4", last_name: "Resort", assignments: [{ shop: "Resort", salary: 12000 }] },
  { first_name: "Staff 4", last_name: "Phuket", assignments: [{ shop: "Phuket", salary: 15000 }] },
  { first_name: "Staff 4", last_name: "Samui", assignments: [{ shop: "Samui", salary: 12000 }] },
  // Staff 5
  { first_name: "Staff 5", last_name: "Ekkamai", assignments: [{ shop: "Ekkamai", salary: 15000 }] },
  { first_name: "Staff 5", last_name: "Silom", assignments: [{ shop: "Silom", salary: 15000 }] },
  { first_name: "Staff 5", last_name: "Pattaya", assignments: [{ shop: "Pattaya", salary: 15000 }] },
  { first_name: "Staff 5", last_name: "Chiang Mai", assignments: [{ shop: "Chiang Mai", salary: 15000 }] },
  { first_name: "Staff 5", last_name: "Resort", assignments: [{ shop: "Resort", salary: 12000 }] },
  { first_name: "Staff 5", last_name: "Phuket", assignments: [{ shop: "Phuket", salary: 15000 }] },
  { first_name: "Staff 5", last_name: "Samui", assignments: [{ shop: "Samui", salary: 18000 }] },
  // Staff 6
  { first_name: "Staff 6", last_name: "Ekkamai", assignments: [{ shop: "Ekkamai", salary: 15000 }] },
  { first_name: "Staff 6", last_name: "Silom", assignments: [{ shop: "Silom", salary: 15000 }] },
  { first_name: "Staff 6", last_name: "Pattaya", assignments: [{ shop: "Pattaya", salary: 15000 }] },
  { first_name: "Staff 6", last_name: "Chiang Mai", assignments: [{ shop: "Chiang Mai", salary: 15000 }] },
  { first_name: "Staff 6", last_name: "Resort", assignments: [{ shop: "Resort", salary: 12000 }] },
  { first_name: "Staff 6", last_name: "Phuket", assignments: [{ shop: "Phuket", salary: 15000 }] },
  { first_name: "Staff 6", last_name: "Samui", assignments: [{ shop: "Samui", salary: 21500 }] },
  // Staff 7
  { first_name: "Staff 7", last_name: "Silom", assignments: [{ shop: "Silom", salary: 15000 }] },
  { first_name: "Staff 7", last_name: "Pattaya", assignments: [{ shop: "Pattaya", salary: 15000 }] },
  { first_name: "Staff 7", last_name: "Resort", assignments: [{ shop: "Resort", salary: 12000 }] },
  { first_name: "Staff 7", last_name: "Phuket", assignments: [{ shop: "Phuket", salary: 15000 }] },
  { first_name: "Staff 7", last_name: "Samui", assignments: [{ shop: "Samui", salary: 21500 }] },
  // Unnamed row in the sheet — only present in the Resort column (฿12,000)
  { first_name: "Staff", last_name: "Resort", assignments: [{ shop: "Resort", salary: 12000 }] },
  // Lada — one person at two shops
  { first_name: "Lada", last_name: "", assignments: [{ shop: "Phangan", salary: 5000 }, { shop: "Silom", salary: 5000 }] },
  // Staff 8 — one person covering six shops at the same salary
  { first_name: "Staff 8", last_name: "", assignments: [
    { shop: "Ekkamai", salary: 25000 },
    { shop: "Silom", salary: 25000 },
    { shop: "Pattaya", salary: 25000 },
    { shop: "Chiang Mai", salary: 25000 },
    { shop: "Resort", salary: 25000 },
    { shop: "Phuket", salary: 25000 },
  ] },
];

async function main() {
  // 1. Locations: find existing, create Resort if missing
  const { data: locations, error: locErr } = await supabase
    .from("locations")
    .select("id, name, slug, is_active")
    .eq("organization_id", ORG_ID);
  if (locErr) { console.error("Failed to load locations:", locErr.message); process.exit(1); }

  const byName = new Map<string, string>(); // name -> id
  for (const l of locations as Array<{ id: string; name: string; slug: string }>) byName.set(l.name, l.id);

  if (!byName.has("Resort")) {
    console.log(DRY_RUN ? "DRY RUN — would create location: Resort (slug=resort, active)" : "Creating location: Resort");
    if (!DRY_RUN) {
      const { data: loc, error: e2 } = await supabase
        .from("locations")
        .insert({ organization_id: ORG_ID, name: "Resort", slug: "resort", external_id: null, is_active: true })
        .select("id, name")
        .single();
      if (e2) { console.error("Failed to create Resort location:", e2.message); process.exit(1); }
      byName.set("Resort", (loc as { id: string }).id);
    }
  }

  const locId = (column: string): string | null => {
    const name = COLUMN_LOCATION[column];
    return byName.get(name) ?? null;
  };

  // 2. Already seeded?
  const { data: seeded } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .eq("organization_id", ORG_ID)
    .eq("notes", SEED_MARKER)
    .is("deleted_at", null)
    .limit(1);
  if (seeded && seeded.length > 0 && !FORCE) {
    console.log("Employees already seeded (found seed marker). Use --force to re-run.");
    process.exit(0);
  }

  // 3. Create employees
  let created = 0, skipped = 0;
  for (const entry of ROSTER) {
    // Map assignments to real location ids
    const assignments: Array<{ location_id: string; salary: number }> = [];
    let missing = false;
    for (const a of entry.assignments) {
      const id = locId(a.shop);
      if (!id) { console.error(`  ✗ No location for column "${a.shop}" (${COLUMN_LOCATION[a.shop]})`); missing = true; break; }
      assignments.push({ location_id: id, salary: a.salary });
    }
    if (missing) continue;

    const primaryId = assignments[0].location_id;
    const primarySalary = assignments[0].salary;
    const name = `${entry.first_name}${entry.last_name ? " " + entry.last_name : ""}`;

    // Idempotency: skip if the exact placeholder name already exists (unless --force)
    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("organization_id", ORG_ID)
      .eq("first_name", entry.first_name)
      .eq("last_name", entry.last_name)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) { console.log(`  = ${name} already exists, skipping`); skipped++; continue; }

    if (DRY_RUN) {
      console.log(`  + ${name} → ${assignments.map((a) => `฿${a.salary} @ ${a.location_id.slice(0, 8)}`).join(", ")}`);
      created++;
      continue;
    }

    const { data: emp, error: e3 } = await supabase
      .from("employees")
      .insert({
        organization_id: ORG_ID,
        location_id: primaryId,
        first_name: entry.first_name,
        last_name: entry.last_name,
        active: true,
        base_salary_monthly: primarySalary,
        notes: SEED_MARKER,
      })
      .select("id")
      .single();
    if (e3) { console.error(`  ✗ ${name}: ${e3.message}`); continue; }

    const { error: e4 } = await supabase.from("employee_locations").insert(
      assignments.map((a, i) => ({
        employee_id: (emp as { id: string }).id,
        location_id: a.location_id,
        is_primary: i === 0,
        base_salary_monthly: a.salary,
      }))
    );
    if (e4) { console.error(`  ✗ ${name} (assignments): ${e4.message}`); continue; }

    console.log(`  ✓ ${name} — ${assignments.map((a) => `฿${a.salary}`).join(" / ")}`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped (${DRY_RUN ? "dry run — nothing written" : "written"})`);
}

void main();