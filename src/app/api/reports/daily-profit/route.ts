import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getAllowedLocationIds, getUserPermissionsFromDb } from "@/core/permissions/server";
import { getDailyProfitData } from "@/modules/reports/daily-profit/server";
import type { FinanceScopeType } from "@/modules/reports/daily-profit/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role || undefined);
  if (!hasModuleAccess(permissions, "reports")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const defaultTo = bangkokToday();
  const defaultFrom = `${defaultTo.slice(0, 7)}-01`;
  const from = url.searchParams.get("from") ?? defaultFrom;
  const to = url.searchParams.get("to") ?? defaultTo;
  const scopeType = (url.searchParams.get("scope_type") ?? "group") as FinanceScopeType;
  const scopeIds = (url.searchParams.get("scope_id") ?? "").split(",").map((id) => id.trim()).filter(Boolean);

  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) return Response.json({ error: "Invalid date range" }, { status: 400 });
  if (!["group", "location"].includes(scopeType)) return Response.json({ error: "Invalid scope_type" }, { status: 400 });
  if (scopeType !== "group" && scopeIds.length === 0) return Response.json({ error: "scope_id required" }, { status: 400 });

  try {
    const allowedLocationIds = await getAllowedLocationIds(
      session.user.userId,
      permissions.global_role === "owner" || permissions.global_role === "admin",
    );
    const data = await getDailyProfitData(getSupabaseServerClient(), { from, to, scopeType, scopeIds, canManage: hasModuleAccess(permissions, "reports", true), allowedLocationIds });
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate Daily P&L";
    return Response.json({ error: message }, { status: 500 });
  }
}
