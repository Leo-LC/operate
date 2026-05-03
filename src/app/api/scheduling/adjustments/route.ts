import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addAdjustment, listAdjustments } from "@/lib/scheduling/data";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const month = url.searchParams.get("month") ?? undefined;
  if (!branchId) return Response.json({ error: "branchId is required" }, { status: 400 });
  const adjustments = await listAdjustments({ branchId, month });
  return Response.json({ adjustments });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json();
  await addAdjustment({
    branchId: String(payload.branchId ?? ""),
    employeeId: String(payload.employeeId ?? ""),
    date: String(payload.date ?? ""),
    type: payload.type === "overtime" ? "overtime" : "missed_undertime",
    hours: Number(payload.hours ?? 0),
    note: payload.note ? String(payload.note) : null,
  });
  return Response.json({ ok: true });
}
