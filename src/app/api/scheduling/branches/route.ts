import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBranches } from "@/lib/scheduling/data";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const branches = await listBranches();
  return Response.json({ branches });
}
