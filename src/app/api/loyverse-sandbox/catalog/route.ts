import { requireLoyverseSandboxOwner } from "@/modules/loyverse-sandbox/lib/guard";
import { LOYVERSE_CATALOG } from "@/modules/loyverse-sandbox/catalog";

export async function GET() {
  const guard = await requireLoyverseSandboxOwner();
  if (!guard.ok) return guard.response;

  return Response.json({ endpoints: LOYVERSE_CATALOG });
}
