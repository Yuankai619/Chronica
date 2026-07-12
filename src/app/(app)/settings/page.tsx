import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CAP_MINUTES } from "@/lib/timer";
import { DEFAULT_DAILY_TARGET_MINUTES } from "@/lib/unrecorded";
import { SettingsForm } from "@/components/settings-form";
import { MicrosoftLinkCard } from "@/components/microsoft-link-card";
import { PrinciplesCard } from "@/components/principles-card";

export const metadata = { title: "Settings — Chronica" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ms?: string }>;
}) {
  const { ms } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: settings }, { data: msAccount }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("microsoft_accounts")
      .select("account_username")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  const { data: principles } = await supabase
    .from("principles")
    .select("*")
    .order("created_at");

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Settings</h1>
      <div className="flex flex-col gap-6">
        <SettingsForm
          timerCapMinutes={settings?.timer_cap_minutes ?? DEFAULT_CAP_MINUTES}
          dailyTargetMinutes={
            settings?.daily_target_minutes ?? DEFAULT_DAILY_TARGET_MINUTES
          }
        />
        <PrinciplesCard principles={principles ?? []} />
        <MicrosoftLinkCard
          linkedUsername={
            msAccount
              ? (msAccount.account_username ?? "Microsoft account")
              : undefined
          }
          status={ms}
        />
      </div>
    </main>
  );
}
