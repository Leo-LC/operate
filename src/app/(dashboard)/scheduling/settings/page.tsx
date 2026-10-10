import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { isOperationalAdmin } from "@/core/permissions/guards";
import { SettingsClient } from "@/modules/scheduling/components/SettingsClient";

export default async function SchedulingSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (!isOperationalAdmin(session.user.role)) redirect("/scheduling");

  const supabase = getSupabaseServerClient();
  const { data: global } = await supabase.from("scheduling_global_settings").select("*").eq("id", 1).single();

  return (
    <div className="flex flex-col gap-4">
      <SettingsClient
        initialGlobal={
          global
            ? {
                default_break_minutes: (global as { default_break_minutes: number }).default_break_minutes,
                shift_thresholds: (global as { shift_thresholds: { open_after_open_min: number; close_before_close_min: number } }).shift_thresholds,
                palette: (global as { palette?: Record<string, string> | null }).palette ?? null,
              }
            : { default_break_minutes: 30, shift_thresholds: { open_after_open_min: 60, close_before_close_min: 60 }, palette: null }
        }
      />
    </div>
  );
}
