import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CAP_MINUTES } from "@/lib/timer";
import { DEFAULT_DAILY_TARGET_MINUTES } from "@/lib/unrecorded";
import { SettingsForm } from "@/components/settings-form";

export const metadata = { title: "Settings — Chronica" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Settings</h1>
      <SettingsForm
        timerCapMinutes={settings?.timer_cap_minutes ?? DEFAULT_CAP_MINUTES}
        dailyTargetMinutes={
          settings?.daily_target_minutes ?? DEFAULT_DAILY_TARGET_MINUTES
        }
      />
    </main>
  );
}
