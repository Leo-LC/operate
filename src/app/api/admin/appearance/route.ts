import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgTheme, setOrgTheme, type AppTheme } from "@/lib/theme";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const theme = await getOrgTheme();
  return Response.json({ theme });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { theme?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { theme } = body;
  if (theme !== "capybara" && theme !== "forest") {
    return Response.json({ error: "Invalid theme" }, { status: 400 });
  }

  await setOrgTheme(theme as AppTheme);
  return Response.json({ theme });
}
