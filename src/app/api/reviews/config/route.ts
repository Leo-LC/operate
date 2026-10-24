import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readStoredReplyConfig, writeStoredReplyConfig } from "@/modules/reviews/lib/server-config";

/**
 * Owners' reply settings as real rows (reply_templates / reply_categories /
 * rating_rules). GET returns the whole config flattened into the same shape as
 * templates maps used by the client hooks. PUT (owner-only) is a replace-all
 * save — the UI edits lists, save overwrites the rows.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await readStoredReplyConfig();
    return Response.json(config);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load reply config";
    console.error("[reviews/config] read failed:", message);
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

  let body: {
    templates?: unknown;
    rules?: unknown;
    categories?: unknown;
  };
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || !body.templates || !body.rules || !Array.isArray(body.categories)) {
    return Response.json({ error: "Missing templates, rules, or categories in request body" }, { status: 400 });
  }

  try {
    await writeStoredReplyConfig({
      templates: body.templates as Parameters<typeof writeStoredReplyConfig>[0]["templates"],
      rules: body.rules as Parameters<typeof writeStoredReplyConfig>[0]["rules"],
      categories: body.categories as Parameters<typeof writeStoredReplyConfig>[0]["categories"],
    });
    return Response.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save reply config";
    console.error("[reviews/config] write failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
