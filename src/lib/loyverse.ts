const LOYVERSE_BASE = "https://api.loyverse.com/v1.0";

function getToken(): string {
  const token = process.env.LOYVERSE_API_TOKEN;
  if (!token) throw new Error("LOYVERSE_API_TOKEN is not configured");
  return token;
}

export interface LoyverseStore {
  id: string;
  name: string;
  address?: string;
}

export async function fetchLoyverseStores(): Promise<LoyverseStore[]> {
  const res = await fetch(`${LOYVERSE_BASE}/stores`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Loyverse stores API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { stores?: LoyverseStore[] };
  return data.stores ?? [];
}

export interface LoyverseReceipt {
  receipt_number: string;
  store_id: string;
  receipt_date: string;
}

export async function fetchReceiptsForMonth(month: string): Promise<LoyverseReceipt[]> {
  const [year, monthNum] = month.split("-").map(Number);
  const createdAtMin = new Date(year, monthNum - 1, 1).toISOString();
  const createdAtMax = new Date(year, monthNum, 1).toISOString();

  const out: LoyverseReceipt[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      created_at_min: createdAtMin,
      created_at_max: createdAtMax,
      limit: "250",
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${LOYVERSE_BASE}/receipts?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Loyverse receipts API error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as { receipts?: LoyverseReceipt[]; cursor?: string };
    if (data.receipts) out.push(...data.receipts);
    cursor = data.cursor;
  } while (cursor);

  return out;
}
