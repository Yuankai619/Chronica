import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2">
        <p className="microlabel">Time, accounted for</p>
        <h1 className="font-mono text-3xl font-semibold tracking-[0.25em] uppercase">
          Chronica
        </h1>
      </div>
      <p className="max-w-sm text-center text-sm text-muted">
        Record every hour the Lyubishchev way — budgets, settlements, and an
        honest ledger of where your time goes.
      </p>
      <GoogleSignInButton />
    </main>
  );
}
