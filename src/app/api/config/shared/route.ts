import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSharedConfig, writeSharedConfig } from "@/lib/shared-config";
import type { SharedConfig } from "@/lib/shared-config";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await readSharedConfig();
  return Response.json(config);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: SharedConfig;
  try {
    body = (await request.json()) as SharedConfig;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || !body.templates || !body.rules || !Array.isArray(body.categories)) {
    return Response.json(
      { error: "Missing templates, rules, or categories in request body" },
      { status: 400 }
    );
  }

  await writeSharedConfig({
    ...body,
    updatedAt: Date.now(),
  });
  return Response.json({ success: true });
}

