import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { HomeClient } from "@/modules/home/components/HomeClient";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import type { ModuleKey } from "@/core/permissions/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const name = session?.user?.name ?? session?.user?.email ?? "there";

  const permissions = await getUserPermissionsFromDb(session?.user?.userId, role);
  if (permissions.global_role === "direction") redirect("/loyverse");
  const supabase = getSupabaseServerClient();

  let docsAlert = 0;
  let animalsAlert = 0;
  const snippets: Partial<Record<ModuleKey, string>> = {};

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  await Promise.allSettled([
    // Documents
    hasModuleAccess(permissions, "documents")
      ? (async () => {
          const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const [{ count: expiring }, { count: expired }] = await Promise.all([
            supabase.from("documents").select("id", { count: "exact", head: true })
              .eq("organization_id", DEFAULT_ORG_ID).is("deleted_at", null)
              .not("expires_at", "is", null).lte("expires_at", soon).gte("expires_at", todayIso),
            supabase.from("documents").select("id", { count: "exact", head: true })
              .eq("organization_id", DEFAULT_ORG_ID).is("deleted_at", null)
              .not("expires_at", "is", null).lt("expires_at", todayIso),
          ]);
          docsAlert = (expiring ?? 0) + (expired ?? 0);
          const parts: string[] = [];
          if ((expired ?? 0) > 0) parts.push(`${expired} expired`);
          if ((expiring ?? 0) > 0) parts.push(`${expiring} expiring soon`);
          if (parts.length > 0) snippets.documents = parts.join(" · ");
          else snippets.documents = "All documents up to date";
        })()
      : Promise.resolve(),

    // Animals
    hasModuleAccess(permissions, "animals")
      ? (async () => {
          const [{ count: sickCount }, { data: nextVaccRow }] = await Promise.all([
            supabase.from("animals").select("id", { count: "exact", head: true })
              .eq("organization_id", DEFAULT_ORG_ID).is("deleted_at", null)
              .in("status", ["sick", "observation", "quarantine"]),
            supabase.from("animals").select("name, next_vaccination_date")
              .eq("organization_id", DEFAULT_ORG_ID).is("deleted_at", null)
              .not("next_vaccination_date", "is", null)
              .gte("next_vaccination_date", todayIso)
              .order("next_vaccination_date", { ascending: true })
              .limit(1),
          ]);
          animalsAlert = sickCount ?? 0;
          if (nextVaccRow?.[0]) {
            const a = nextVaccRow[0] as { name: string; next_vaccination_date: string };
            snippets.animals = `Next vaccine: ${a.name} · ${fmtDate(a.next_vaccination_date)}`;
          } else {
            snippets.animals = animalsAlert > 0 ? `${animalsAlert} need attention` : "All healthy";
          }
        })()
      : Promise.resolve(),

    // Accounting — yesterday's total payments
    hasModuleAccess(permissions, "accounting")
      ? (async () => {
          const { data } = await supabase
            .from("daily_entries")
            .select("payment_cash, payment_scan, payment_credit_card, entry_date")
            .eq("organization_id", DEFAULT_ORG_ID)
            .eq("entry_date", yesterdayIso)
            .limit(5);
          if (data && data.length > 0) {
            type Row = { payment_cash: number; payment_scan: number; payment_credit_card: number };
            const total = (data as Row[]).reduce(
              (s, r) => s + (r.payment_cash ?? 0) + (r.payment_scan ?? 0) + (r.payment_credit_card ?? 0), 0
            );
            snippets.accounting = `Yesterday: ฿${fmtCurrency(total)} across ${data.length} shop${data.length !== 1 ? "s" : ""}`;
          } else {
            snippets.accounting = "No entry for yesterday yet";
          }
        })()
      : Promise.resolve(),

    // Schedules — active this week
    hasModuleAccess(permissions, "schedules")
      ? (async () => {
          const { count } = await supabase
            .from("schedules")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", DEFAULT_ORG_ID)
            .is("deleted_at", null)
            .eq("week_start_date", weekStartIso);
          if ((count ?? 0) > 0) {
            snippets.schedules = `${count} schedule${count !== 1 ? "s" : ""} active this week`;
          } else {
            snippets.schedules = "No schedule for this week yet";
          }
        })()
      : Promise.resolve(),

    // Admin — user count
    hasModuleAccess(permissions, "admin")
      ? (async () => {
          const { count } = await supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", DEFAULT_ORG_ID);
          snippets.admin = `${count ?? 0} user${count !== 1 ? "s" : ""} registered`;
        })()
      : Promise.resolve(),
  ]);

  return (
    <HomeClient
      name={name}
      permissions={permissions}
      docsAlert={docsAlert}
      animalsAlert={animalsAlert}
      snippets={snippets}
    />
  );
}
