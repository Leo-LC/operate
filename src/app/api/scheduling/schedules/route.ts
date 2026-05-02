import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { archiveSchedule, createOrUpdateSchedule, listSchedules, listShifts } from "@/lib/scheduling/data";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const weekStartDate = url.searchParams.get("weekStartDate") ?? undefined;
  if (!branchId) return Response.json({ error: "branchId is required" }, { status: 400 });
  const schedules = await listSchedules(branchId, weekStartDate);
  const withShifts = await Promise.all(schedules.map(async (s) => ({ ...s, shifts: await listShifts(s.id) })));
  return Response.json({ schedules: withShifts });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json();
  const scheduleId = await createOrUpdateSchedule({
    branchId: String(payload.branchId ?? ""),
    weekStartDate: String(payload.weekStartDate ?? ""),
    breakMinutesDefault: Number(payload.breakMinutesDefault ?? 30),
    shifts: Array.isArray(payload.shifts) ? payload.shifts : [],
  });
  return Response.json({ ok: true, scheduleId });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json();
  const scheduleId = String(payload.scheduleId ?? "");
  if (!scheduleId) return Response.json({ error: "scheduleId is required" }, { status: 400 });
  await archiveSchedule(scheduleId);
  return Response.json({ ok: true });
}
