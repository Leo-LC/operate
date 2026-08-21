import { isLoyverseConfigured, loyverseFetch, LoyverseApiError } from "@/lib/loyverse/client";
import { requireLoyverseSandboxOwner } from "@/modules/loyverse-sandbox/lib/guard";
import type { LoyverseStore } from "@/modules/loyverse-sandbox/types";

export async function GET() {
  const guard = await requireLoyverseSandboxOwner();
  if (!guard.ok) return guard.response;

  if (!isLoyverseConfigured()) {
    return Response.json({
      configured: false,
      connected: false,
      message: "LOYVERSE_ACCESS_TOKEN is not set in environment variables.",
    });
  }

  try {
    const data = await loyverseFetch<{ stores: LoyverseStore[] }>("/stores", { limit: 50 });
    const stores = data.stores ?? [];
    return Response.json({
      configured: true,
      connected: true,
      store_count: stores.length,
      stores: stores.map((s) => ({ id: s.id, name: s.name })),
    });
  } catch (err) {
    const message = err instanceof LoyverseApiError ? err.message : "Failed to reach Loyverse API";
    const status = err instanceof LoyverseApiError ? err.status : 502;
    return Response.json(
      {
        configured: true,
        connected: false,
        message,
        status,
      },
      { status: status >= 500 ? 502 : status },
    );
  }
}
