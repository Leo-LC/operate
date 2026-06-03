import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AccountingClient } from "@/modules/accounting/components/AccountingClient";
import { getAllowedLocationIds } from "@/core/permissions/server";
import type { AdminLocation } from "@/modules/admin/types";

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const allowedIds = await getAllowedLocationIds(session.user.userId, session.user.role === "owner");

  if (allowedIds !== null && allowedIds.length === 0) {
    return (
      <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 24, fontSize: 13, color: "var(--fg-4)" }}>
        You don&apos;t have access to any location yet. Ask your admin.
      </div>
    );
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at")
    .eq("is_active", true)
    .order("name");

  if (allowedIds !== null) query = query.in("id", allowedIds);

  const { data } = await query;
  const locations: AdminLocation[] = data ?? [];
  const canManage = session.user.role === "owner";

  const { location: locationParam } = await searchParams;
  const initialLocationId = locationParam ?? undefined;

  return <AccountingClient locations={locations} canManage={canManage} initialLocationId={initialLocationId} />;
}
