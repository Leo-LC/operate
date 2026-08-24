import { getDefaultAccount } from "@/lib/loyverse/accounts";
import { loyverseFetch, loyverseFetchAll, LoyverseApiError } from "@/lib/loyverse/client";
import { getCatalogEndpoint } from "@/modules/loyverse-sandbox/catalog";
import { requireLoyverseSandboxOwner } from "@/modules/loyverse-sandbox/lib/guard";

export async function GET(request: Request) {
  const guard = await requireLoyverseSandboxOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");
  if (!resource) {
    return Response.json({ error: "Missing resource parameter" }, { status: 400 });
  }

  const endpoint = getCatalogEndpoint(resource);
  if (!endpoint) {
    return Response.json({ error: `Unknown resource: ${resource}` }, { status: 400 });
  }

  const params: Record<string, string | number | undefined> = {};
  const limit = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor");
  const storeId = url.searchParams.get("store_id");
  const createdAtMin = url.searchParams.get("created_at_min");
  const createdAtMax = url.searchParams.get("created_at_max");
  const fetchAll = url.searchParams.get("fetch_all") === "true";

  if (limit) params.limit = Number(limit);
  if (cursor) params.cursor = cursor;
  if (storeId) params.store_id = storeId;
  if (createdAtMin) params.created_at_min = createdAtMin;
  if (createdAtMax) params.created_at_max = createdAtMax;

  const account = getDefaultAccount();
  if (!account) {
    return Response.json({ error: "Loyverse account not configured" }, { status: 503 });
  }

  try {
    if (fetchAll && endpoint.listKey) {
      const items = await loyverseFetchAll(
        account,
        endpoint.path,
        endpoint.listKey,
        params,
        { maxPages: 20 },
      );
      return Response.json({
        resource,
        path: endpoint.path,
        count: items.length,
        [endpoint.listKey]: items,
      });
    }

    const data = await loyverseFetch(account, endpoint.path, params);
    return Response.json({ resource, path: endpoint.path, data });
  } catch (err) {
    const message = err instanceof LoyverseApiError ? err.message : "Probe failed";
    const status = err instanceof LoyverseApiError ? err.status : 502;
    const body = err instanceof LoyverseApiError ? err.body : undefined;
    return Response.json({ error: message, details: body }, { status: status >= 500 ? 502 : status });
  }
}
