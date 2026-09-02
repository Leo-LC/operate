import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/loyverse/accounts";
import { loyverseFetchAll } from "@/lib/loyverse/client";
import { requireLoyverseAccess } from "@/modules/loyverse/lib/guard";

type PaymentTypeRaw = { id: string; name?: string; type?: string };

export async function GET() {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;
  const accounts = getAccounts();
  if (accounts.length === 0) return NextResponse.json({ payment_types: [] });
  // Use first account's payment types - ids are global enough, merge across accounts
  const map = new Map<string, PaymentTypeRaw>();
  for (const account of accounts) {
    try {
      const items = await loyverseFetchAll<PaymentTypeRaw>(account, "/payment_types", "payment_types", {});
      for (const pt of items) map.set(pt.id, pt);
    } catch {
      // ignore per account
    }
  }
  return NextResponse.json({ payment_types: Array.from(map.values()) });
}
