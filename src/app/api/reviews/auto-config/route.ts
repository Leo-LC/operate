import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readAutoSendEnabled, writeAutoSendEnabled } from "@/modules/reviews/lib/server-config";

/**
 * ON/OFF switch behind /api/cron/reviews-auto-reply, edited on the Reviews →
 * Templates page (owner-only). OFF (default) = the run only counts unreplied
 * reviews in the automation history; ON = it sends the templated replies too.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const enabled = await readAutoSendEnabled();
    return Response.json({ enabled: enabled === true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to read automation config";
    console.error("[reviews/auto-config] read failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { enabled?: unknown };
  try {
    body = (await request.json()) as { enabled?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return Response.json({ error: "Missing enabled boolean" }, { status: 400 });
  }

  try {
    await writeAutoSendEnabled(body.enabled);
    return Response.json({ success: true, enabled: body.enabled });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save automation config";
    console.error("[reviews/auto-config] write failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
