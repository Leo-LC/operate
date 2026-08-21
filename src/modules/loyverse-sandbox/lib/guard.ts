import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireLoyverseSandboxOwner(): Promise<
  | { ok: true; email: string }
  | { ok: false; response: Response }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "owner") {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, email: session.user.email ?? "unknown" };
}
