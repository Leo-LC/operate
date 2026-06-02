import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLoyverseStores } from "@/lib/loyverse";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stores = await fetchLoyverseStores();
    return Response.json({ stores });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch stores";
    return Response.json({ error: message }, { status: 500 });
  }
}
