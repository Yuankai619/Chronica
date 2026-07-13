import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CAP_MINUTES } from "@/lib/timer";
import { SettingsForm } from "@/components/settings-form";
import { MicrosoftLinkCard } from "@/components/microsoft-link-card";
import { PrinciplesCard } from "@/components/principles-card";
import { GoogleCalendarCard } from "@/components/google-calendar-card";

export const metadata = { title: "Settings — Chronica" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ms?: string; gcal?: string }>;
}) {
  const { ms, gcal } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: settings }, { data: msAccount }, { data: gcalAccount }] =
    await Promise.all([
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
      supabase
        .from("google_accounts")
        .select("account_email")
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
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <SettingsForm
          timerCapMinutes={settings?.timer_cap_minutes ?? DEFAULT_CAP_MINUTES}
          timezone={settings?.timezone ?? "Asia/Taipei"}
        />
        <PrinciplesCard principles={principles ?? []} />
        <GoogleCalendarCard
          linkedEmail={
            gcalAccount ? (gcalAccount.account_email ?? null) : undefined
          }
          status={gcal}
        />
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
